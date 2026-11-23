// Student login and the Student's own data.
//   POST  /api/auth/student/check-code   { schoolId, code }       → { ok: true } (does NOT log in)
//   POST  /api/auth/student/first-login  { schoolId, code, pin }  → { token, student }
//   POST  /api/auth/student/login        { schoolId, pin }        → { token, student }
//   GET   /api/student/me                (Student token)          → { student }
//   PUT   /api/student/setup             { avatar, buddy, buddyName }  → { student }
//   PATCH /api/student/me                any of { look, buddyName, seenIntroClip, seenBridgeCutscene } → { student }
// School ID + PIN code are two credentials, like a username and a password (rules in
// src/students/studentLogin.ts). A Student only ever reads and changes their own row.
// Never log a School ID, code, PIN code, hash or token.
import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { tooManyTries } from "../auth/authErrors";
import { currentStudentId, requireStudent } from "../auth/requireStudent";
import { makeStudentToken } from "../auth/tokens";
import { AVATARS, BUDDY_IDS, LOOK_ITEMS, MAX_NICKNAME } from "../content/studentSetup";
import { AppError } from "../middleware/AppError";
import { studentLogin, studentWrongLogin, type StudentLoginRow } from "../students/studentLogin";
import { studentLoginStore, studentProfile, updateStudentProfile } from "../students/studentStore";

export const studentRouter = Router();

const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);

function parse<T>(schema: z.ZodType<T>, body: unknown, message?: string): T {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) throw badRequest(message ?? parsed.error.issues[0]?.message ?? "Something in the request is missing.");
  return parsed.data;
}

// ---------- Login ----------

// A whole class logs in from ONE school internet address at the same time, so the
// Teacher login's 20-per-15-minutes limit would block them. These three addresses
// share their own, bigger limit; the per-Student lock (5 wrong tries) is what
// protects each PIN code.
const studentLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooManyTries()),
});

const login = studentLogin(studentLoginStore);

const text = (max: number) => z.string().max(max);
const LOGIN_MESSAGE = "Please type your School ID and code.";
const CheckCodeBody = z.object({ schoolId: text(40), code: text(20) });
const FirstLoginBody = z.object({ schoolId: text(40), code: text(20), pin: text(20) });
const LoginBody = z.object({ schoolId: text(40), pin: text(20) });

/** `{ token, student }` for a Student whose code or PIN code was right. */
const loggedIn = async (row: StudentLoginRow) => {
  const student = await studentProfile(row.id);
  if (!student) throw studentWrongLogin();
  return { token: makeStudentToken(row), student };
};

studentRouter.post("/api/auth/student/check-code", studentLoginLimit, async (req, res) => {
  await login.checkCode(parse(CheckCodeBody, req.body, LOGIN_MESSAGE));
  res.json({ ok: true });
});

studentRouter.post("/api/auth/student/first-login", studentLoginLimit, async (req, res) => {
  const row = await login.firstLogin(parse(FirstLoginBody, req.body, LOGIN_MESSAGE));
  console.log("[students] first login: PIN code made");
  res.json(await loggedIn(row));
});

studentRouter.post("/api/auth/student/login", studentLoginLimit, async (req, res) => {
  const row = await login.login(parse(LoginBody, req.body, LOGIN_MESSAGE));
  res.json(await loggedIn(row));
});

// ---------- The Student's own data ----------

const nickname = z
  .string({ error: "The buddy’s name must be text." })
  .trim()
  .max(MAX_NICKNAME, `The buddy’s name can be at most ${MAX_NICKNAME} letters.`)
  .regex(/^[\p{L} ]*$/u, "The buddy’s name can only have letters and spaces.")
  .nullable()
  // Empty = the buddy's own name.
  .transform((name) => (name ? name.replace(/ {2,}/g, " ") : null));

const lookSchema = z
  .object({
    skin: z.enum(LOOK_ITEMS.skin),
    hair: z.enum(LOOK_ITEMS.hair),
    shirt: z.enum(LOOK_ITEMS.shirt),
    youExtra: z.enum(LOOK_ITEMS.youExtra),
    buddyColor: z.enum(LOOK_ITEMS.buddyColor),
    buddyExtra: z.enum(LOOK_ITEMS.buddyExtra),
  })
  .partial()
  .strict();

const SetupBody = z.object({
  avatar: z.enum(AVATARS, { error: "Please pick Boy or Girl." }),
  buddy: z.enum(BUDDY_IDS, { error: "Please pick a buddy." }),
  buddyName: nickname.optional(),
});

const PatchBody = z
  .object({
    look: lookSchema,
    buddyName: nickname,
    seenIntroClip: z.boolean(),
    seenBridgeCutscene: z.boolean(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "Nothing to save.");

const ownData: RequestHandler[] = [requireStudent];

studentRouter.get("/api/student/me", ...ownData, async (req, res) => {
  const student = await studentProfile(currentStudentId(req));
  if (!student) throw new AppError(401, "LOGIN_NEEDED", "Please log in again.");
  res.json({ student });
});

studentRouter.put("/api/student/setup", ...ownData, async (req, res) => {
  const { avatar, buddy, buddyName } = parse(SetupBody, req.body);
  const student = await updateStudentProfile(currentStudentId(req), { avatar, buddy, buddyName: buddyName ?? null });
  console.log("[students] setup saved");
  res.json({ student });
});

studentRouter.patch("/api/student/me", ...ownData, async (req, res) => {
  const patch = parse(PatchBody, req.body);
  const student = await updateStudentProfile(currentStudentId(req), patch);
  res.json({ student });
});
