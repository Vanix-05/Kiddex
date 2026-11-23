// The Student login rules. School ID + PIN code are two credentials, like a
// username and a password. The database is passed in (StudentLoginStore), so
// `npm run test-students` can run these rules without one.
//
// - ONE answer for an unknown School ID, a wrong code, a used-up code and a wrong
//   PIN code: 401 WRONG_LOGIN. It never says which part was wrong.
// - /login runs a bcrypt check against a dummy hash for an unknown School ID or a
//   Student with no PIN code yet, so the answer takes about as long.
// - One-time codes are compared with crypto.timingSafeEqual. A code works once.
// - Each wrong code or PIN code for a real Student counts; 5 in a row lock them
//   for 5 minutes (429 TOO_MANY_TRIES). A right login clears the count.
// Never log a School ID, code, PIN code or hash.
import { timingSafeEqual } from "node:crypto";
import { AppError } from "../middleware/AppError";
import { DUMMY_HASH, isLockedNow, wrongTryChanges } from "../auth/accountLogin";
import { tooManyTries } from "../auth/authErrors";
import { checkPassword, hashPassword } from "../auth/passwords";
import { cleanSchoolId } from "../sections/schoolId";

/** What the login needs from a Student row. */
export interface StudentLoginRow {
  id: string;
  tokenVersion: number;
  /** 6 digits, no dash; null once the PIN code is made. */
  oneTimeCode: string | null;
  pinHash: string | null;
  failedLogins: number;
  lockedUntil: Date | null;
  registeredAt: Date | null;
}

export interface StudentLoginChanges {
  failedLogins?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date;
  pinHash?: string;
  oneTimeCode?: null;
  codeMadeAt?: null;
  registeredAt?: Date;
}

export interface StudentLoginStore {
  /** By clean School ID ("20260144"). */
  find(schoolId: string): Promise<StudentLoginRow | null>;
  update(id: string, changes: StudentLoginChanges): Promise<void>;
  /**
   * Saves `changes` only while the Student still has this one-time code, so a
   * code can't be used twice (two taps at once). False = it was already used.
   */
  useCode(id: string, code: string, changes: StudentLoginChanges): Promise<boolean>;
}

/** The one answer for every wrong School ID, code or PIN code. */
export const studentWrongLogin = () =>
  new AppError(401, "WRONG_LOGIN", "That didn’t match. Check your School ID and code, or ask your teacher.");

const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);

const digitsOnly = (text: string) => text.replace(/[\s\-‐-―−]/g, "");

/** A PIN code is exactly 4 digits. */
export const isPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

/** Same length buffers, then timingSafeEqual: how long it takes doesn't tell how much matched. */
function sameCode(typed: string, saved: string): boolean {
  const a = Buffer.from(typed.padEnd(16, " ").slice(0, 16));
  const b = Buffer.from(saved.padEnd(16, " ").slice(0, 16));
  return timingSafeEqual(a, b) && typed.length === saved.length;
}

export function studentLogin(store: StudentLoginStore) {
  /** One more wrong try for a real Student (maybe the 5th: then the lock). */
  const countWrongTry = (row: StudentLoginRow) => store.update(row.id, wrongTryChanges(row.failedLogins));

  /** The Student with this School ID, or null. Throws 429 while they are locked. */
  async function findStudent(rawSchoolId: string): Promise<StudentLoginRow | null> {
    const schoolId = cleanSchoolId(rawSchoolId);
    const row = schoolId ? await store.find(schoolId) : null;
    if (row && isLockedNow(row.lockedUntil)) throw tooManyTries();
    return row;
  }

  /** Right School ID + its current one-time code, else WRONG_LOGIN (and a wrong try counted). */
  async function checkCodeOf(rawSchoolId: string, rawCode: string): Promise<{ row: StudentLoginRow; code: string }> {
    const row = await findStudent(rawSchoolId);
    const code = digitsOnly(rawCode);
    if (!row) throw studentWrongLogin();
    // No code any more (the PIN code was made): a used-up code.
    if (!row.oneTimeCode || !sameCode(code, row.oneTimeCode)) {
      await countWrongTry(row);
      throw studentWrongLogin();
    }
    return { row, code: row.oneTimeCode };
  }

  return {
    /** New Student book, before the PIN code page. Does not log in. */
    async checkCode(input: { schoolId: string; code: string }): Promise<void> {
      await checkCodeOf(input.schoolId, input.code);
    },

    /** New Student: checks the code again, saves the PIN code (hashed); the code stops working. */
    async firstLogin(input: { schoolId: string; code: string; pin: string }): Promise<StudentLoginRow> {
      if (!isPin(input.pin)) throw badRequest("Your PIN code must be exactly 4 numbers.");
      const { row, code } = await checkCodeOf(input.schoolId, input.code);
      const now = new Date();
      const used = await store.useCode(row.id, code, {
        pinHash: await hashPassword(input.pin),
        oneTimeCode: null,
        codeMadeAt: null,
        // Kept when they had registered before (a New code from the Teacher).
        ...(row.registeredAt ? {} : { registeredAt: now }),
        lastLoginAt: now,
        failedLogins: 0,
        lockedUntil: null,
      });
      // Another tap used the code a moment ago.
      if (!used) throw studentWrongLogin();
      return row;
    },

    /** Returning Student: School ID + PIN code. */
    async login(input: { schoolId: string; pin: string }): Promise<StudentLoginRow> {
      const row = await findStudent(input.schoolId);
      const pin = typeof input.pin === "string" ? input.pin.slice(0, 20) : "";
      if (!row || !row.pinHash) {
        // Same timing as a real check, so the answer doesn't tell which School IDs exist.
        await checkPassword(pin, DUMMY_HASH);
        if (row) await countWrongTry(row);
        throw studentWrongLogin();
      }
      const right = await checkPassword(pin, row.pinHash);
      if (!isPin(pin) || !right) {
        await countWrongTry(row);
        throw studentWrongLogin();
      }
      await store.update(row.id, { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null });
      return row;
    },
  };
}
