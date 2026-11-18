// Login errors shared by the login addresses, requireTeacher / requireAdmin and the admin addresses.
import { dbProblem } from "../db/dbProblem";
import { AppError } from "../middleware/AppError";

const RETRY_WAIT_MS = 1000;

/**
 * Runs a database call. A free Neon database that is waking up can fail the
 * first try, so it gets one more try after a second. If that fails too: 503
 * DB_UNAVAILABLE. `retry: false` for a write that must not run twice (one that
 * makes a password). Our own AppErrors (like 409 EMAIL_TAKEN) pass through as they are.
 * The server log gets only the short safe reason (never the raw error, which can
 * contain the address).
 */
export async function fromDb<T>(task: () => Promise<T>, { retry = true }: { retry?: boolean } = {}): Promise<T> {
  try {
    return await task();
  } catch (firstError) {
    // Our own expected errors (like 409 EMAIL_TAKEN) are answers, not database trouble.
    if (firstError instanceof AppError) throw firstError;
    if (!retry) {
      console.warn(`[db] ${dbProblem(firstError)}`);
      throw databaseDown();
    }
    console.warn(`[db] ${dbProblem(firstError)}; trying once more`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
    try {
      return await task();
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn(`[db] ${dbProblem(err)}`);
      throw databaseDown();
    }
  }
}

/**
 * The database can't be reached. No cause is attached on purpose: the error
 * handler logs an AppError's cause, and a database error can contain the address.
 */
export const databaseDown = () =>
  new AppError(503, "DB_UNAVAILABLE", "We can't reach KIDDEX right now. Please try again in a minute.");

export const TOO_MANY_TRIES_MESSAGE = "Too many tries. Please wait a few minutes and try again.";

export const tooManyTries = () => new AppError(429, "TOO_MANY_TRIES", TOO_MANY_TRIES_MESSAGE);

/** One answer for an unknown email AND a wrong password: never say which part was wrong. */
export const wrongLogin = () => new AppError(401, "WRONG_LOGIN", "Wrong email or password.");
