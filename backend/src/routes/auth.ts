// Teacher login.
//   POST /api/auth/teacher/login  { email, password } -> { token, teacher: { id, name, email } }
//   GET  /api/auth/me             (needs a token)    -> { teacher: { id, name, email } }
// The login rules (wrong login, lock, per-computer limit) are shared with the admin
// login: src/auth/accountLogin.ts.
//
// There is no logout address: the browser simply forgets the token (it lives in
// sessionStorage, so closing the tab also logs out). Old tokens stop working when
// the password is reset (tokenVersion goes up) or an admin turns the account off.
import { Router } from "express";
import { loginHandlers } from "../auth/accountLogin";
import { requireTeacher } from "../auth/requireTeacher";
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

authRouter.get("/api/auth/me", requireTeacher, (req, res) => {
  res.json({ teacher: req.teacher });
});
