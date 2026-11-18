// Lets a request through only with a valid Teacher login token
// (`Authorization: Bearer <token>`), and puts the Teacher on `req.teacher`.
// Any problem (no token, wrong or expired token, an admin token, Teacher deleted,
// password reset since the token was made, account turned off) answers 401 LOGIN_NEEDED.
import type { RequestHandler } from "express";
import type { AccountInfo } from "./accounts";
import { signedInAccount } from "./accountLogin";

export { loginNeeded } from "./accountLogin";

export type SignedInTeacher = AccountInfo;

declare global {
  namespace Express {
    interface Request {
      /** Set by requireTeacher. */
      teacher?: SignedInTeacher;
    }
  }
}

export const requireTeacher: RequestHandler = async (req, _res, next) => {
  try {
    req.teacher = await signedInAccount("teacher", req);
    next();
  } catch (err) {
    next(err); // 401 LOGIN_NEEDED or 503 DB_UNAVAILABLE
  }
};
