// Reads --name / --email options for the admin scripts.
// Works with `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"` (also on Windows cmd).
import { parseArgs } from "node:util";

export function readTeacherArgs(): { name?: string; email?: string } {
  try {
    const { values } = parseArgs({
      options: { name: { type: "string" }, email: { type: "string" } },
      allowPositionals: false,
    });
    return { name: values.name?.trim() || undefined, email: values.email };
  } catch {
    return stop('Unknown option. Use --name "Ms. Santos" and/or --email "santos@school.ph".');
  }
}

/** Prints a friendly message and ends the script with an error code. */
export function stop(message: string): never {
  console.error(message);
  process.exit(1);
}
