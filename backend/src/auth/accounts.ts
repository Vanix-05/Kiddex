// Teacher and admin accounts: one place for the database work both kinds share
// (login, the login check, making an account, resetting a password).
// Used by the login addresses, requireTeacher / requireAdmin, the admin addresses
// and the add-* / reset-*-password scripts. Never log a password or a hash.
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";
import { hashPassword, makeTemporaryPassword } from "./passwords";
import type { AccountRole } from "./tokens";

/** What the login needs from an account. */
export interface LoginAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tokenVersion: number;
  failedLogins: number;
  lockedUntil: Date | null;
  /** Teachers can be turned off by an admin; admins are always active. */
  active: boolean;
}

/** What a login check (requireTeacher / requireAdmin) needs. */
export interface CheckedAccount {
  id: string;
  name: string;
  email: string;
  tokenVersion: number;
  active: boolean;
}

/** The public fields of an account: never the hash. */
export interface AccountInfo {
  id: string;
  name: string;
  email: string;
}

/** Changes the login and the scripts make. */
export interface AccountChanges {
  failedLogins?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date;
  passwordHash?: string;
  tokenVersion?: { increment: number };
}

interface AccountTable {
  /** "Teacher" or "admin", for messages. */
  label: string;
  /** "A Teacher" or "An admin", for messages. */
  aLabel: string;
  findForLogin(email: string): Promise<LoginAccount | null>;
  findForCheck(id: string): Promise<CheckedAccount | null>;
  findByEmail(email: string): Promise<AccountInfo | null>;
  update(id: string, changes: AccountChanges): Promise<AccountInfo>;
  create(data: { name: string; email: string; passwordHash: string }): Promise<AccountInfo>;
}

const LOGIN_FIELDS = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
  tokenVersion: true,
  failedLogins: true,
  lockedUntil: true,
} as const;
const CHECK_FIELDS = { id: true, name: true, email: true, tokenVersion: true } as const;
const INFO_FIELDS = { id: true, name: true, email: true } as const;

export const accountTables: Record<AccountRole, AccountTable> = {
  teacher: {
    label: "Teacher",
    aLabel: "A Teacher",
    findForLogin: (email) => prisma.teacher.findUnique({ where: { email }, select: { ...LOGIN_FIELDS, active: true } }),
    findForCheck: (id) => prisma.teacher.findUnique({ where: { id }, select: { ...CHECK_FIELDS, active: true } }),
    findByEmail: (email) => prisma.teacher.findUnique({ where: { email }, select: INFO_FIELDS }),
    update: (id, changes) => prisma.teacher.update({ where: { id }, data: changes, select: INFO_FIELDS }),
    create: (data) => prisma.teacher.create({ data, select: INFO_FIELDS }),
  },
  admin: {
    label: "admin",
    aLabel: "An admin",
    findForLogin: async (email) => {
      const admin = await prisma.admin.findUnique({ where: { email }, select: LOGIN_FIELDS });
      return admin && { ...admin, active: true };
    },
    findForCheck: async (id) => {
      const admin = await prisma.admin.findUnique({ where: { id }, select: CHECK_FIELDS });
      return admin && { ...admin, active: true };
    },
    findByEmail: (email) => prisma.admin.findUnique({ where: { email }, select: INFO_FIELDS }),
    update: (id, changes) => prisma.admin.update({ where: { id }, data: changes, select: INFO_FIELDS }),
    create: (data) => prisma.admin.create({ data, select: INFO_FIELDS }),
  },
};

/** The email is already used by an account of the same kind: 409 EMAIL_TAKEN. */
export const emailTaken = (role: AccountRole) =>
  new AppError(409, "EMAIL_TAKEN", `${accountTables[role].aLabel} with this email already exists.`);

const isUniqueClash = (err: unknown) => (err as { code?: unknown })?.code === "P2002";

/**
 * Makes an account with a random temporary password (only its hash is saved).
 * `email` must already be cleaned (cleanEmail). Throws 409 EMAIL_TAKEN for a duplicate.
 * The temporary password is returned ONCE: show it to the admin, never log it.
 */
export async function createAccount(
  role: AccountRole,
  data: { name: string; email: string },
): Promise<{ account: AccountInfo; temporaryPassword: string }> {
  const table = accountTables[role];
  if (await table.findByEmail(data.email)) throw emailTaken(role);
  const temporaryPassword = makeTemporaryPassword();
  try {
    const account = await table.create({ ...data, passwordHash: await hashPassword(temporaryPassword) });
    return { account, temporaryPassword };
  } catch (err) {
    // Two requests at once with the same email: the database refuses the second.
    if (isUniqueClash(err)) throw emailTaken(role);
    throw err;
  }
}

/**
 * Gives the account a new temporary password, signs it out everywhere (tokenVersion + 1)
 * and clears the "too many wrong tries" lock. Returned ONCE: never log it.
 */
export async function resetAccountPassword(
  role: AccountRole,
  id: string,
): Promise<{ account: AccountInfo; temporaryPassword: string }> {
  const temporaryPassword = makeTemporaryPassword();
  const account = await accountTables[role].update(id, {
    passwordHash: await hashPassword(temporaryPassword),
    tokenVersion: { increment: 1 },
    failedLogins: 0,
    lockedUntil: null,
  });
  return { account, temporaryPassword };
}
