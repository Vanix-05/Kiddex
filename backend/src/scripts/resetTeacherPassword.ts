// `npm run reset-teacher-password -- --email "santos@school.ph"`
// Gives the Teacher a new temporary password (printed ONCE), signs out old logins
// (tokenVersion + 1) and clears the "too many wrong tries" lock.
import { prisma } from "../db/prisma";
import { dbProblem } from "../db/dbProblem";
import { cleanEmail, hashPassword, makeTemporaryPassword } from "../auth/passwords";
import { readTeacherArgs, stop } from "./teacherArgs";

async function main(): Promise<void> {
  const args = readTeacherArgs();
  if (!args.email) stop('The email is missing. Use: npm run reset-teacher-password -- --email "santos@school.ph"');
  const email = cleanEmail(args.email);
  if (!email) stop("That email does not look right. Check it and try again.");

  const teacher = await prisma.teacher.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!teacher) stop(`No Teacher has the email ${email}. Nothing changed.`);

  const temporaryPassword = makeTemporaryPassword();
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      passwordHash: await hashPassword(temporaryPassword),
      tokenVersion: { increment: 1 },
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  console.log(
    `New password for ${teacher.name}. Temporary password: ${temporaryPassword}. Give it to the Teacher privately. It will not be shown again.`,
  );
}

main()
  .catch((err) => {
    console.error(`Could not reset the password: ${dbProblem(err)}.`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
