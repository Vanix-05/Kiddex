// Lets a request through only with a valid admin login token
// (`Authorization: Bearer <token>`), and puts the admin on `req.admin`.
// Any problem (no token, wrong or expired token, a Teacher token, admin deleted,
// password reset since the token was made) answers 401 LOGIN_NEEDED.
import type { RequestHandler } from "express";
import type { AccountInfo } from "./accounts";
import { signedInAccount } from "./accountLogin";

export type SignedInAdmin = AccountInfo;

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAdmin. */
      admin?: SignedInAdmin;
    }
  }
}

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    req.admin = await signedInAccount("admin", req);
    next();
  } catch (err) {
    next(err); // 401 LOGIN_NEEDED or 503 DB_UNAVAILABLE
  }
};
