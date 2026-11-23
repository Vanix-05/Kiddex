// Teacher login and the Teacher's own password.
//   POST  /api/auth/teacher/login          { email, password } -> { token, teacher: { id, name, email } }
//   GET   /api/auth/me                     (needs a token) -> { teacher: { id, name, email },
//                                                              password: { temporary, noteHidden } }
//   POST  /api/auth/teacher/password       (needs a token) { currentPassword, newPassword } -> { token }
//   PATCH /api/auth/teacher/password-note  (needs a token) { hidden: true } -> { ok: true }
// The login rules (wrong login, lock, per-computer limit) are shared with the admin
// login: src/auth/accountLogin.ts. A wrong current password counts toward the same
// 5-tries lock as the login.
//
// There is no logout address: the browser simply forgets the token (it lives in
// sessionStorage, so closing the tab also logs out). Old tokens stop working when
// the password is changed or reset (tokenVersion goes up) or an admin turns the
// account off. Never log a password, a hash or a token.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { isLockedNow, loginHandlers, loginNeeded, wrongTryChanges } from "../auth/accountLogin";
import { fromDb, tooManyTries } from "../auth/authErrors";
import { checkPassword, hashPassword, MAX_PASSWORD_LENGTH, passwordProblem } from "../auth/passwords";
import { requireTeacher } from "../auth/requireTeacher";
import { makeTeacherToken } from "../auth/tokens";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";

export const authRouter = Router();

const accountOff = () =>
  new AppError(403, "ACCOUNT_OFF", "This account is turned off. Please ask your school's KIDDEX admin.");

authRouter.post(
  "/api/auth/teacher/login",
  ...loginHandlers("teacher", {
    // Checked only after a right password, so a wrong one still gets WRONG_LOGIN.
    afterRightPassword: (teacher) => {
      if (!teacher.active) throw accountOff();
    },
  }),
);

authRouter.get("/api/auth/me", requireTeacher, async (req, res) => {
  const teacher = req.teacher!;
  const flags = await fromDb(() =>
    prisma.teacher.findUnique({
      where: { id: teacher.id },
      select: { passwordIsTemporary: true, passwordNoteHidden: true },
    }),
  );
  if (!flags) throw loginNeeded();
  res.json({
    teacher,
    password: { temporary: flags.passwordIsTemporary, noteHidden: flags.passwordNoteHidden },
  });
});

// ---------- The Teacher's own password ----------

/** Per computer (IP), on this address only: at most 20 tries per 15 minutes (like the login). */
const passwordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooManyTries()),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().max(MAX_PASSWORD_LENGTH),
  // Its length rule (8 to 200) is checked by passwordProblem, for a friendly message.
  newPassword: z.string(),
});

const badPassword = (message: string) => new AppError(400, "BAD_PASSWORD", message);
// 400, not 401: the login did not end, the Teacher only typed the wrong password.
const wrongCurrentPassword = () => new AppError(400, "WRONG_CURRENT_PASSWORD", "That's not your current password.");
const samePassword = () => new AppError(400, "SAME_PASSWORD", "Pick a new password, not the one you have now.");

authRouter.post("/api/auth/teacher/password", passwordLimit, requireTeacher, async (req, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new AppError(400, "BAD_REQUEST", "Please type your current and new password.");
  const { currentPassword, newPassword } = parsed.data;
  if (!currentPassword) throw new AppError(400, "BAD_REQUEST", "Type your current password.");
  const problem = passwordProblem(newPassword);
  if (problem) throw badPassword(problem);
  const id = req.teacher!.id;

  const account = await fromDb(() =>
    prisma.teacher.findUnique({ where: { id }, select: { passwordHash: true, failedLogins: true, lockedUntil: true } }),
  );
  if (!account) throw loginNeeded();

  // Locked (by wrong logins or wrong current passwords): even the right password waits.
  if (isLockedNow(account.lockedUntil)) throw tooManyTries();

  if (!(await checkPassword(currentPassword, account.passwordHash))) {
    await fromDb(() => prisma.teacher.update({ where: { id }, data: wrongTryChanges(account.failedLogins), select: { id: true } }));
    throw wrongCurrentPassword();
  }
  if (newPassword === currentPassword) throw samePassword();

  const passwordHash = await hashPassword(newPassword);
  const updated = await fromDb(
    () =>
      prisma.teacher.update({
        where: { id },
        data: {
          passwordHash,
          // Every other computer logged in as this Teacher is logged out.
          tokenVersion: { increment: 1 },
          failedLogins: 0,
          lockedUntil: null,
          passwordIsTemporary: false,
          passwordNoteHidden: true,
        },
        select: { id: true, tokenVersion: true },
      }),
    { retry: false },
  );
  console.log("[auth] Teacher changed their password");
  // A new token for this tab only, made from the updated account.
  res.json({ token: makeTeacherToken(updated) });
});

const NoteSchema = z.object({ hidden: z.literal(true, { error: "Send hidden: true." }) });

authRouter.patch("/api/auth/teacher/password-note", requireTeacher, async (req, res) => {
  const parsed = NoteSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new AppError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Send hidden: true.");
  await fromDb(() =>
    prisma.teacher.update({ where: { id: req.teacher!.id }, data: { passwordNoteHidden: true }, select: { id: true } }),
  );
  res.json({ ok: true });
});
