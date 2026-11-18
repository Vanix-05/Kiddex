// Passwords and Teacher emails: one place for hashing, checking and the rules.
// Never print or log a password or a password hash.
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const BCRYPT_COST = 12;

/** Teacher password rule: at least this many characters. */
export const MIN_PASSWORD_LENGTH = 8;
/**
 * For testing: a password chosen with --password (add-teacher, reset-teacher-password,
 * add-admin, reset-admin-password) may be this short. Random temporary passwords stay
 * 12 characters, and SEED_TEACHER_PASSWORD keeps the 8-character rule.
 */
export const MIN_CHOSEN_PASSWORD_LENGTH = 4;
/** Below this, a chosen password gets a "short password" warning. */
export const SHORT_PASSWORD_WARNING_BELOW = 8;
/** The login refuses longer passwords, so no account may have one. */
export const MAX_PASSWORD_LENGTH = 200;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** True when `password` matches the saved bcrypt `hash`. */
export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Returns a friendly problem with the password, or null when it follows the rule. */
export function passwordProblem(password: string | undefined, minLength = MIN_PASSWORD_LENGTH): string | null {
  if (!password) return "The password is missing.";
  if (password.length < minLength) {
    return `The password must be at least ${minLength} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return `The password can be at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** Trims and lowercases an email. Returns null when it does not look like an email. */
export function cleanEmail(email: string | undefined): string | null {
  const result = emailSchema.safeParse(email ?? "");
  return result.success ? result.data : null;
}

// Letters and numbers without look-alikes (no 0/O/o, 1/l/I/i).
const TEMP_PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const TEMP_PASSWORD_LENGTH = 12;

/** A random temporary password for a new or reset Teacher account (crypto-safe). */
export function makeTemporaryPassword(): string {
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARACTERS[randomInt(TEMP_PASSWORD_CHARACTERS.length)];
  }
  return password;
}
