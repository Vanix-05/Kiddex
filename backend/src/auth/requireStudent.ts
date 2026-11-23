// Lets a request through only with a valid Student login token
// (`Authorization: Bearer <token>`), and puts the Student on `req.student`.
// Any problem (no token, wrong or expired token, a Teacher or admin token, the
// Student deleted, or a New code from the Teacher since the token was made)
// answers 401 LOGIN_NEEDED.
import type { RequestHandler } from "express";
import { findStudentForCheck } from "../students/studentStore";
import { loginNeeded } from "./accountLogin";
import { readStudentToken } from "./tokens";

export interface SignedInStudent {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by requireStudent. */
      student?: SignedInStudent;
    }
  }
}

export const requireStudent: RequestHandler = async (req, _res, next) => {
  try {
    const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "");
    const content = match ? readStudentToken(match[1]!) : null;
    if (!content) throw loginNeeded();
    const student = await findStudentForCheck(content.accountId);
    if (!student || student.tokenVersion !== content.tokenVersion) throw loginNeeded();
    req.student = { id: student.id };
    next();
  } catch (err) {
    next(err); // 401 LOGIN_NEEDED or 503 DB_UNAVAILABLE
  }
};

/** The Student requireStudent found. */
export function currentStudentId(req: Parameters<RequestHandler>[0]): string {
  if (!req.student) throw new Error("currentStudentId() was called on a route without requireStudent.");
  return req.student.id;
}
