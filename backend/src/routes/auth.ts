// Teacher login.
//   POST /api/auth/teacher/login  { email, password } -> { token, teacher: { id, name, email } }
//   GET  /api/auth/me             (needs a token)    -> { teacher: { id, name, email } }
//
// There is no logout address: the browser simply forgets the token (it lives in
// sessionStorage, so closing the tab also logs out). Old tokens stop working when
// the password is reset (npm run reset-teacher-password raises tokenVersion).
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { checkPassword, cleanEmail } from "../auth/passwords";
import { fromDb, tooManyTries, wrongLogin } from "../auth/authErrors";
import { requireTeacher } from "../auth/requireTeacher";
import { makeTeacherToken } from "../auth/tokens";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";

export const authRouter = Router();

/** Wrong passwords in a row before the account is locked. */
const MAX_FAILED_LOGINS = 5;
/** How long a locked account stays locked. */
const LOCK_MS = 5 * 60 * 1000;

// A bcrypt hash (cost 12) of random text nobody knows. For an unknown email we
// still check the password against it, so the answer takes about as long as for
// a real Teacher and does not tell which emails exist.
const DUMMY_HASH = "$2b$12$qEu2vvUG.tquneoqZs4WIuVETXzfgZXsZDHZs6etpNRo22XQVyNmG";

// Per computer (IP), on the login address only: at most 20 tries per 15 minutes.
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooManyTries()),
});

const loginBody = z.object({
  email: z.string().max(320),
  // bcrypt only reads the first 72 bytes; the cap just stops huge bodies.
  password: z.string().min(1).max(200),
});

authRouter.post("/api/auth/teacher/login", loginLimit, async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Please enter your email and password.");
  }
  const { password } = parsed.data;
  const email = cleanEmail(parsed.data.email);

  const teacher = email
    ? await fromDb(() =>
        prisma.teacher.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, passwordHash: true, tokenVersion: true, failedLogins: true, lockedUntil: true },
        }),
      )
    : null;

  if (!teacher) {
    await checkPassword(password, DUMMY_HASH);
    throw wrongLogin();
  }

  // Locked: even the right password waits.
  if (teacher.lockedUntil && teacher.lockedUntil.getTime() > Date.now()) throw tooManyTries();

  if (!(await checkPassword(password, teacher.passwordHash))) {
    const failedLogins = teacher.failedLogins + 1;
    const lock = failedLogins >= MAX_FAILED_LOGINS;
    await fromDb(() =>
      prisma.teacher.update({
        where: { id: teacher.id },
        data: lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins },
      }),
    );
    throw wrongLogin();
  }

  await fromDb(() =>
    prisma.teacher.update({
      where: { id: teacher.id },
      data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
    }),
  );

  res.json({
    token: makeTeacherToken(teacher),
    teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
  });
});

authRouter.get("/api/auth/me", requireTeacher, (req, res) => {
  res.json({ teacher: req.teacher });
});
