// `npm run db:seed`: makes the first Teacher from SEED_TEACHER_* in .env.
// Safe to run again: if the Teacher already exists, nothing is changed
// (the password is never reset here). Never prints the password.
// SEED_* settings are read only here, so the server starts without them.
import "../config/env"; // loads backend/.env
import { prisma } from "../db/prisma";
import { dbProblem } from "../db/dbProblem";
import { cleanEmail, hashPassword, passwordProblem } from "../auth/passwords";
import { stop } from "./teacherArgs";

function setting(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

async function main(): Promise<void> {
  const name = setting("SEED_TEACHER_NAME") ?? "Mr. Gucci";
  const email = cleanEmail(setting("SEED_TEACHER_EMAIL") ?? "mr.gucci@kiddex.test");
  if (!email) stop("SEED_TEACHER_EMAIL in backend/.env does not look like an email address.");

  const password = process.env.SEED_TEACHER_PASSWORD;
  const problem = passwordProblem(password);
  if (problem || !password) {
    stop(`SEED_TEACHER_PASSWORD in backend/.env: ${problem} Add it, then run npm run db:seed again.`);
  }

  const existing = await prisma.teacher.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Teacher ${email} already exists. Nothing changed.`);
    return;
  }

  await prisma.teacher.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  console.log(`Made Teacher ${name} (${email}).`);
}

main()
  .catch((err) => {
    console.error(`Seed failed: ${dbProblem(err)}.`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
