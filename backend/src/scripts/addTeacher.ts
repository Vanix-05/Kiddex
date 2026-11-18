// `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"`
// Admins make Teacher accounts (no Register page). Prints a temporary password ONCE.
import { prisma } from "../db/prisma";
import { dbProblem } from "../db/dbProblem";
import { cleanEmail, hashPassword, makeTemporaryPassword } from "../auth/passwords";
import { readTeacherArgs, stop } from "./teacherArgs";

const USAGE = 'Use: npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"';

async function main(): Promise<void> {
  const args = readTeacherArgs();
  if (!args.name) stop(`The name is missing. ${USAGE}`);
  if (!args.email) stop(`The email is missing. ${USAGE}`);
  const email = cleanEmail(args.email);
  if (!email) stop("That email does not look right. Check it and try again.");

  const existing = await prisma.teacher.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    stop(`A Teacher with ${email} already exists. Nothing changed. To give them a new password, use npm run reset-teacher-password.`);
  }

  const temporaryPassword = makeTemporaryPassword();
  await prisma.teacher.create({
    data: { name: args.name, email, passwordHash: await hashPassword(temporaryPassword) },
  });
  console.log(
    `Made Teacher ${args.name}. Temporary password: ${temporaryPassword}. Give it to the Teacher privately. It will not be shown again.`,
  );
}

main()
  .catch((err) => {
    console.error(`Could not add the Teacher: ${dbProblem(err)}.`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
