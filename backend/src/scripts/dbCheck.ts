// `npm run db:check`: can we reach the database, and how many Teachers, lessons and questions are there?
// Waits up to 10 seconds (a sleeping Neon database wakes on the first request).
// Never prints the database address.
import { prisma } from "../db/prisma";
import { dbProblem } from "../db/dbProblem";

const LIMIT_MS = 10_000;

async function main(): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const [teachers, lessons, questions] = await Promise.race([
      Promise.all([prisma.teacher.count(), prisma.lesson.count(), prisma.question.count()]),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timed out"), { code: "P1001" })), LIMIT_MS);
      }),
    ]);
    console.log(`Database: OK. Teachers: ${teachers}. Lessons: ${lessons}. Questions: ${questions}.`);
  } catch (err) {
    console.log(`Database: NOT OK, ${dbProblem(err)}.`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
  }
}

main();
