// The add-* and reset-*-password scripts, for Teachers and admins (same steps, other table).
// By default a random temporary password (12 characters) is printed ONCE and never saved (only its hash).
// All four scripts also take --password "..." (for testing): that password is used
// instead and is NEVER printed. A chosen password may be as short as 4 characters
// (with a warning below 8).
import { accountTables, createAccount, resetAccountPassword } from "../auth/accounts";
import { cleanEmail, MIN_CHOSEN_PASSWORD_LENGTH, passwordProblem, SHORT_PASSWORD_WARNING_BELOW } from "../auth/passwords";
import type { AccountRole } from "../auth/tokens";
import { dbProblem } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";
import { readAccountArgs, stop } from "./accountArgs";

const SCRIPT: Record<AccountRole, { add: string; reset: string; example: string; email: string }> = {
  teacher: {
    add: "add-teacher",
    reset: "reset-teacher-password",
    example: '--name "Ms. Santos" --email "santos@school.ph" [--password "..."]',
    email: "santos@school.ph",
  },
  admin: {
    add: "add-admin",
    reset: "reset-admin-password",
    example: '--name "Carlo" --email "carlo@kiddex.test" [--password "..."]',
    email: "carlo@kiddex.test",
  },
};

const giveIt = (label: string) => `Give it to the ${label} privately. It will not be shown again.`;
const SHORT_WARNING = "Warning: this password is short. Use it for testing only and change it before real use.";

/** Runs a script body, prints a short safe reason if the database fails, and always disconnects. */
function run(failText: string, body: () => Promise<void>): void {
  body()
    .catch((err) => {
      console.error(`${failText}: ${dbProblem(err)}.`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

/**
 * The --password that was typed, checked: at least 4 characters (at most 200).
 * Prints the short-password warning below 8. Undefined when no --password was given.
 */
function chosenPassword(password: string | undefined): string | undefined {
  if (password === undefined) return undefined;
  const problem = passwordProblem(password, MIN_CHOSEN_PASSWORD_LENGTH);
  if (problem) stop(`--password: ${problem} Nothing changed.`);
  if (password.length < SHORT_PASSWORD_WARNING_BELOW) console.warn(SHORT_WARNING);
  return password;
}

const alreadyExists = (role: AccountRole, aLabel: string, email: string) =>
  `${aLabel} with ${email} already exists. Nothing changed. To give them a new password, use npm run ${SCRIPT[role].reset}.`;

/** `npm run add-teacher` / `npm run add-admin`. */
export function runAddAccount(role: AccountRole): void {
  const { label, aLabel } = accountTables[role];
  const usage = `Use: npm run ${SCRIPT[role].add} -- ${SCRIPT[role].example}`;
  run(`Could not add the ${label}`, async () => {
    const args = readAccountArgs();
    if (!args.name) stop(`The name is missing. ${usage}`);
    if (!args.email) stop(`The email is missing. ${usage}`);
    const email = cleanEmail(args.email);
    if (!email) stop("That email does not look right. Check it and try again.");
    if (await accountTables[role].findByEmail(email)) stop(alreadyExists(role, aLabel, email));
    const chosen = chosenPassword(args.password);

    try {
      const { account, temporaryPassword } = await createAccount(role, { name: args.name, email }, chosen);
      if (chosen) console.log(`Made ${label} ${account.name} with the password you chose.`);
      else console.log(`Made ${label} ${account.name}. Temporary password: ${temporaryPassword}. ${giveIt(label)}`);
    } catch (err) {
      if (err instanceof AppError && err.code === "EMAIL_TAKEN") stop(alreadyExists(role, aLabel, email));
      throw err;
    }
  });
}

/** `npm run reset-teacher-password` / `npm run reset-admin-password`. Signs out old logins and clears the lock. */
export function runResetAccountPassword(role: AccountRole): void {
  const { label } = accountTables[role];
  run("Could not reset the password", async () => {
    const args = readAccountArgs();
    if (!args.email) {
      stop(`The email is missing. Use: npm run ${SCRIPT[role].reset} -- --email "${SCRIPT[role].email}" [--password "..."]`);
    }
    const email = cleanEmail(args.email);
    if (!email) stop("That email does not look right. Check it and try again.");

    const found = await accountTables[role].findByEmail(email);
    if (!found) stop(`No ${label} has the email ${email}. Nothing changed.`);
    const chosen = chosenPassword(args.password);

    const { account, temporaryPassword } = await resetAccountPassword(role, found.id, chosen);
    if (chosen) console.log(`Password changed for ${email}.`);
    else console.log(`New password for ${account.name}. Temporary password: ${temporaryPassword}. ${giveIt(label)}`);
  });
}
