// The Admin page: admin login and Teacher accounts only (nothing about Students or lessons).
//   POST  /api/admin/login                         { email, password } -> { token, admin }
//   GET   /api/admin/me                            -> { admin }
//   GET   /api/admin/teachers                      all Teachers, newest first
//   POST  /api/admin/teachers                      { name, email } -> 201 { teacher, temporaryPassword }
//   POST  /api/admin/teachers/:id/reset-password   -> { teacher, temporaryPassword }
//   PATCH /api/admin/teachers/:id                  { active } -> { teacher }
// Everything except the login needs requireAdmin. There is no delete address on
// purpose (it can't be undone). A temporary password is only ever in the answer:
// never logged (the error log only has the code and the address).
import { Router } from "express";
import { z } from "zod";
import { loginHandlers } from "../auth/accountLogin";
import { createAccount, resetAccountPassword } from "../auth/accounts";
import { fromDb } from "../auth/authErrors";
import { cleanEmail } from "../auth/passwords";
import { requireAdmin } from "../auth/requireAdmin";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";

export const adminRouter = Router();

const teacherNotFound = () => new AppError(404, "TEACHER_NOT_FOUND", "We could not find this Teacher.");
const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);

/** The fields the Admin page shows for a Teacher. Never the hash. */
const TEACHER_FIELDS = {
  id: true,
  name: true,
  email: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  _count: { select: { lessons: true } },
} as const;

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: { lessons: number };
};

function teacherView({ _count, ...teacher }: TeacherRow) {
  return { ...teacher, lessonCount: _count.lessons };
}

async function findTeacher(id: string) {
  const teacher = await fromDb(() => prisma.teacher.findUnique({ where: { id }, select: TEACHER_FIELDS }));
  if (!teacher) throw teacherNotFound();
  return teacher;
}

// ---------- Admin login ----------

adminRouter.post("/api/admin/login", ...loginHandlers("admin"));

adminRouter.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// ---------- Teacher accounts ----------

adminRouter.use("/api/admin/teachers", requireAdmin);

adminRouter.get("/api/admin/teachers", async (_req, res) => {
  const teachers = await fromDb(() => prisma.teacher.findMany({ orderBy: { createdAt: "desc" }, select: TEACHER_FIELDS }));
  res.json(teachers.map(teacherView));
});

const NewTeacherSchema = z.object({
  name: z
    .string({ error: "Please type the Teacher's name." })
    .trim()
    .min(2, "The name needs at least 2 characters.")
    .max(60, "The name can be at most 60 characters."),
  email: z.string({ error: "Please type the Teacher's email." }).max(320, "This email is too long."),
});

adminRouter.post("/api/admin/teachers", async (req, res) => {
  const parsed = NewTeacherSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Please check the name and email.");
  const email = cleanEmail(parsed.data.email);
  if (!email) throw badRequest("This email does not look right. Please check it.");

  // One try only: it makes a password (409 EMAIL_TAKEN passes through).
  const { account, temporaryPassword } = await fromDb(() => createAccount("teacher", { name: parsed.data.name, email }), {
    retry: false,
  });
  console.log("[admin] Teacher account made");
  res.status(201).json({ teacher: teacherView(await findTeacher(account.id)), temporaryPassword });
});

adminRouter.post("/api/admin/teachers/:id/reset-password", async (req, res) => {
  const { id } = await findTeacher(req.params.id);
  const { temporaryPassword } = await fromDb(() => resetAccountPassword("teacher", id), { retry: false });
  console.log("[admin] Teacher password reset");
  res.json({ teacher: teacherView(await findTeacher(id)), temporaryPassword });
});

const ActiveSchema = z.object({ active: z.boolean({ error: "Send active: true or false." }) });

adminRouter.patch("/api/admin/teachers/:id", async (req, res) => {
  const parsed = ActiveSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Send active: true or false.");
  const { id } = await findTeacher(req.params.id);
  const { active } = parsed.data;

  const teacher = await fromDb(() =>
    prisma.teacher.update({
      where: { id },
      // Turning off also signs the Teacher out everywhere. Lessons are kept.
      data: active ? { active: true } : { active: false, tokenVersion: { increment: 1 } },
      select: TEACHER_FIELDS,
    }),
  );
  console.log(`[admin] Teacher account turned ${active ? "on" : "off"}`);
  res.json({ teacher: teacherView(teacher) });
});
