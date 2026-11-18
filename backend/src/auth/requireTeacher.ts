// Lets a request through only with a valid Teacher login token
// (`Authorization: Bearer <token>`), and puts the Teacher on `req.teacher`.
// Any problem (no token, wrong or expired token, Teacher deleted, password reset
// since the token was made) answers 401 LOGIN_NEEDED.
import type { RequestHandler } from "express";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";
import { fromDb } from "./authErrors";
import { readTeacherToken } from "./tokens";

export interface SignedInTeacher {
  id: string;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by requireTeacher. */
      teacher?: SignedInTeacher;
    }
  }
}

export const loginNeeded = () => new AppError(401, "LOGIN_NEEDED", "Please log in again.");

export const requireTeacher: RequestHandler = async (req, _res, next) => {
  const header = req.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const content = match ? readTeacherToken(match[1]!) : null;
  if (!content) return next(loginNeeded());

  let teacher;
  try {
    teacher = await fromDb(() =>
      prisma.teacher.findUnique({
        where: { id: content.teacherId },
        select: { id: true, name: true, email: true, tokenVersion: true },
      }),
    );
  } catch (err) {
    return next(err); // 503 DB_UNAVAILABLE
  }
  // Teacher deleted, or the password was reset after this token was made.
  if (!teacher || teacher.tokenVersion !== content.tokenVersion) return next(loginNeeded());

  req.teacher = { id: teacher.id, name: teacher.name, email: teacher.email };
  next();
};
