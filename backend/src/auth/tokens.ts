// Teacher login tokens (JWT, HS256, signed with JWT_SECRET).
// A token holds only: sub = Teacher id, role = "teacher", tv = the Teacher's tokenVersion.
// No email or name. Never print or log a token or the secret.
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/** One school day. */
export const TEACHER_TOKEN_LIFETIME = "8h";

const ALGORITHM = "HS256";

export interface TeacherTokenContent {
  teacherId: string;
  tokenVersion: number;
}

export function makeTeacherToken(teacher: { id: string; tokenVersion: number }): string {
  return jwt.sign({ role: "teacher", tv: teacher.tokenVersion }, env.jwtSecret, {
    algorithm: ALGORITHM,
    subject: teacher.id,
    expiresIn: TEACHER_TOKEN_LIFETIME,
  });
}

/** Returns the token's content, or null when it is wrong, expired, not HS256 or not a Teacher token. */
export function readTeacherToken(token: string): TeacherTokenContent | null {
  try {
    const content = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
    if (typeof content !== "object" || content === null) return null;
    const { sub, role, tv } = content as { sub?: unknown; role?: unknown; tv?: unknown };
    if (role !== "teacher" || typeof sub !== "string" || !sub || !Number.isInteger(tv)) return null;
    return { teacherId: sub, tokenVersion: tv as number };
  } catch {
    return null;
  }
}
