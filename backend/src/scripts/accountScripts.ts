// The add-* and reset-*-password scripts, for Teachers and admins (same steps, other table).
// A temporary password is printed ONCE and never saved (only its hash).
import { accountTables, createAccount, resetAccountPassword } from "../auth/accounts";
import { cleanEmail } from "../auth/passwords";
import type { AccountRole } from "../auth/tokens";
import { dbProblem } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";
import { readAccountArgs, stop } from "./accountArgs";

const SCRIPT: Record<AccountRole, { add: string; reset: string; example: string }> = {
  teacher: { add: "add-teacher", reset: "reset-teacher-password", example: '--name "Ms. Santos" --email "santos@school.ph"' },
  admin: { add: "add-admin", reset: "reset-admin-password", example: '--name "Carlo" --email "carlo@kiddex.test"' },
};

const giveIt = (label: string) => `Give it to the ${label} privately. It will not be shown again.`;

/** Runs a script body, prints a short safe reason if the database fails, and always disconnects. */
function run(failText: string, body: () => Promise<void>): void {
  body()
    .catch((err) => {
      console.error(`${failText}: ${dbProblem(err)}.`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

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

    try {
      const { account, temporaryPassword } = await createAccount(role, { name: args.name, email });
      console.log(`Made ${label} ${account.name}. Temporary password: ${temporaryPassword}. ${giveIt(label)}`);
    } catch (err) {
      if (err instanceof AppError && err.code === "EMAIL_TAKEN") {
        stop(
          `${aLabel} with ${email} already exists. Nothing changed. To give them a new password, use npm run ${SCRIPT[role].reset}.`,
        );
      }
      throw err;
    }
  });
}

/** `npm run reset-teacher-password` / `npm run reset-admin-password`. */
export function runResetAccountPassword(role: AccountRole): void {
  const { label } = accountTables[role];
  run("Could not reset the password", async () => {
    const args = readAccountArgs();
    if (!args.email) stop(`The email is missing. Use: npm run ${SCRIPT[role].reset} -- --email "santos@school.ph"`);
    const email = cleanEmail(args.email);
    if (!email) stop("That email does not look right. Check it and try again.");

    const found = await accountTables[role].findByEmail(email);
    if (!found) stop(`No ${label} has the email ${email}. Nothing changed.`);

    const { account, temporaryPassword } = await resetAccountPassword(role, found.id);
    console.log(`New password for ${account.name}. Temporary password: ${temporaryPassword}. ${giveIt(label)}`);
  });
}
