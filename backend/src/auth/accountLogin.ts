// The login rules shared by the Teacher login and the admin login:
// - one answer for an unknown email AND a wrong password (401 WRONG_LOGIN),
//   with a bcrypt check against a dummy hash for unknown emails (same timing);
// - 5 wrong passwords in a row lock the account for 5 minutes (429 TOO_MANY_TRIES);
// - at most 20 tries per 15 minutes per computer (IP), counted per login address;
// - the database gets one more try if it is waking up, else 503 DB_UNAVAILABLE.
// Also the shared login check behind requireTeacher / requireAdmin.
import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../middleware/AppError";
import { accountTables, type AccountInfo, type CheckedAccount, type LoginAccount } from "./accounts";
import { fromDb, tooManyTries, wrongLogin } from "./authErrors";
import { checkPassword, cleanEmail } from "./passwords";
import { makeToken, readToken, type AccountRole } from "./tokens";

/** Wrong passwords in a row before the account is locked. */
const MAX_FAILED_LOGINS = 5;
/** How long a locked account stays locked. */
const LOCK_MS = 5 * 60 * 1000;

// A bcrypt hash (cost 12) of random text nobody knows. For an unknown email we
// still check the password against it, so the answer takes about as long as for
// a real account and does not tell which emails exist.
const DUMMY_HASH = "$2b$12$qEu2vvUG.tquneoqZs4WIuVETXzfgZXsZDHZs6etpNRo22XQVyNmG";

const loginBody = z.object({
  email: z.string().max(320),
  // bcrypt only reads the first 72 bytes; the cap just stops huge bodies.
  password: z.string().min(1).max(200),
});

export const loginNeeded = () => new AppError(401, "LOGIN_NEEDED", "Please log in again.");

interface LoginOptions {
  /** Runs after the password was right; throw an AppError to refuse (e.g. a turned-off account). */
  afterRightPassword?: (account: LoginAccount) => void;
}

/**
 * The handlers for one login address: its own per-computer limit, then the login.
 * Answers `{ token, <role>: { id, name, email } }`.
 */
export function loginHandlers(role: AccountRole, options: LoginOptions = {}): RequestHandler[] {
  const table = accountTables[role];

  // Per computer (IP), on this login address only: at most 20 tries per 15 minutes.
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooManyTries()),
  });

  const login: RequestHandler = async (req, res) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "BAD_REQUEST", "Please enter your email and password.");
    const { password } = parsed.data;
    const email = cleanEmail(parsed.data.email);

    const account = email ? await fromDb(() => table.findForLogin(email)) : null;
    if (!account) {
      await checkPassword(password, DUMMY_HASH);
      throw wrongLogin();
    }

    // Locked: even the right password waits.
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) throw tooManyTries();

    if (!(await checkPassword(password, account.passwordHash))) {
      const failedLogins = account.failedLogins + 1;
      const lock = failedLogins >= MAX_FAILED_LOGINS;
      await fromDb(() =>
        table.update(
          account.id,
          lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins },
        ),
      );
      throw wrongLogin();
    }

    // The password was right: now the account itself may still refuse (turned off).
    options.afterRightPassword?.(account);

    await fromDb(() => table.update(account.id, { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null }));

    const info: AccountInfo = { id: account.id, name: account.name, email: account.email };
    res.json({ token: makeToken(role, account), [role]: info });
  };

  return [limit, login];
}

/**
 * The account behind the request's `Authorization: Bearer <token>`, for this role only.
 * Throws 401 LOGIN_NEEDED when there is no token, it is wrong, expired or for another
 * role, the account is gone, its password was reset since (tokenVersion) or it is turned off.
 */
export async function signedInAccount(role: AccountRole, req: Request): Promise<AccountInfo> {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "");
  const content = match ? readToken(role, match[1]!) : null;
  if (!content) throw loginNeeded();

  const account: CheckedAccount | null = await fromDb(() => accountTables[role].findForCheck(content.accountId));
  if (!account || account.tokenVersion !== content.tokenVersion || !account.active) throw loginNeeded();
  return { id: account.id, name: account.name, email: account.email };
}
