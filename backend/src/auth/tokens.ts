// Login tokens (JWT, HS256, signed with JWT_SECRET) for Teachers and admins.
// A token holds only: sub = account id, role = "teacher" | "admin", tv = the account's tokenVersion.
// No email or name. A token is only accepted for its own role, so a Teacher token never
// passes the admin check and an admin token never passes the Teacher check.
// Never print or log a token or the secret.
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/** One school day. */
export const TOKEN_LIFETIME = "8h";

const ALGORITHM = "HS256";

export type AccountRole = "teacher" | "admin";

export interface TokenContent {
  accountId: string;
  tokenVersion: number;
}

export function makeToken(role: AccountRole, account: { id: string; tokenVersion: number }): string {
  return jwt.sign({ role, tv: account.tokenVersion }, env.jwtSecret, {
    algorithm: ALGORITHM,
    subject: account.id,
    expiresIn: TOKEN_LIFETIME,
  });
}

/** Returns the token's content, or null when it is wrong, expired, not HS256 or for another role. */
export function readToken(role: AccountRole, token: string): TokenContent | null {
  try {
    const content = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
    if (typeof content !== "object" || content === null) return null;
    const { sub, role: tokenRole, tv } = content as { sub?: unknown; role?: unknown; tv?: unknown };
    if (tokenRole !== role || typeof sub !== "string" || !sub || !Number.isInteger(tv)) return null;
    return { accountId: sub, tokenVersion: tv as number };
  } catch {
    return null;
  }
}

export const makeTeacherToken = (teacher: { id: string; tokenVersion: number }) => makeToken("teacher", teacher);
export const readTeacherToken = (token: string) => readToken("teacher", token);
export const makeAdminToken = (admin: { id: string; tokenVersion: number }) => makeToken("admin", admin);
export const readAdminToken = (token: string) => readToken("admin", token);
