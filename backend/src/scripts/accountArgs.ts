// Reads --name, --email and --password options for the account scripts (Teachers and admins).
// Works with `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"` (also on Windows cmd).
import { parseArgs } from "node:util";

export function readAccountArgs(): {
  name?: string;
  email?: string;
  /** Optional, for testing. Kept exactly as typed: never trimmed, never printed. */
  password?: string;
} {
  try {
    const { values } = parseArgs({
      options: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } },
      allowPositionals: false,
    });
    return { name: values.name?.trim() || undefined, email: values.email, password: values.password };
  } catch {
    return stop('Unknown option. Use --name "Ms. Santos", --email "santos@school.ph" and, if you want, --password "...".');
  }
}

/** Prints a friendly message and ends the script with an error code. */
export function stop(message: string): never {
  console.error(message);
  process.exit(1);
}
