// `npm run cleanup`: removes test data from the database. SAFE BY DEFAULT: without
// --yes it deletes nothing and only prints what it would delete.
//
//   npm run cleanup -- --list
//   npm run cleanup -- --lesson "water cycle"            (a dry run: shows the plan)
//   npm run cleanup -- --lesson "water cycle" --yes      (deletes it)
//   npm run cleanup -- --assignment "Walkthrough Review" --student 2026-0191 --zz-test --yes
//   npm run cleanup -- --reset-progress all --yes
//
// Options (combine them; --teacher <email> limits every one to one Teacher):
//   --lesson "<text>"            lessons whose title or file name contains the text
//   --assignment "<pack name>"   assignments with exactly that pack name
//   --student <School ID>        a Student and their data (can be given more than once)
//   --reset-progress <ID | all>  keeps the Student, zeros XP / stars / streak, removes rounds and levels
//   --section "<grade> <name>"   a section, its Students (with their data) and its assignments
//   --zz-test                    every zz-test- leftover from the test scripts
// If any filter matches nothing, or a text matches more than one Teacher without
// --teacher, NOTHING is deleted. Everything is deleted in one transaction.
// It never deletes Teachers or Admins. It prints only the database's host name,
// never the address, and never a code, PIN code, hash or token.
import { applyPlan, hasWork, listOverview, makePlan, parseArgs } from "../cleanup/cleanup";
import { env } from "../config/env";
import { dbProblem } from "../db/dbProblem";
import { prisma } from "../db/prisma";

const USAGE = `How to use it (inside backend/):
  npm run cleanup -- --list
  npm run cleanup -- --lesson "water cycle"
  npm run cleanup -- --lesson "water cycle" --yes
  npm run cleanup -- --assignment "Walkthrough Review" --student 2026-0191 --zz-test --yes
  npm run cleanup -- --reset-progress all --yes
Other options: --section "4 Sampaguita", --teacher <email>. Without --yes nothing is deleted.`;

/** Only the host name (e.g. ep-xxx.neon.tech): never the full address or password. */
function databaseHost(): string {
  try {
    return new URL(env.databaseUrl).hostname || "(unknown)";
  } catch {
    return "(unknown)";
  }
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.log(`${parsed.error}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  const o = parsed.options;
  if (!o.list && !hasWork(o)) {
    console.log(USAGE);
    return;
  }

  console.log(`Database: ${databaseHost()}`);
  try {
    if (o.list) {
      for (const line of await listOverview(prisma)) console.log(line);
      if (!hasWork(o)) return;
      console.log("");
    }

    const plan = await makePlan(prisma, o);
    for (const line of plan.lines) console.log(line);
    if (plan.problems.length) {
      for (const problem of plan.problems) console.log(`STOP: ${problem}`);
      console.log("Nothing was deleted. Fix the options above and run again.");
      process.exitCode = 1;
      return;
    }
    if (!o.yes) {
      console.log("Nothing was deleted. Run again with --yes to delete.");
      return;
    }
    for (const line of await applyPlan(prisma, plan)) console.log(line);
  } catch (err) {
    console.log(`The cleanup stopped: ${dbProblem(err)}. Nothing was deleted (it is all or nothing).`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
