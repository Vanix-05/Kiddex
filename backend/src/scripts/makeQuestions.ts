// `npm run make-questions -- "C:\path\to\file.docx" --games quiz-show,match-up --topic "..." --subject Math --grade 4 [--order groq,gemini]`
// Reads a lesson file, creates a lesson in the database (owned by the seed Teacher) and makes its questions with the same functions as the addresses,
// prints what happened, and saves the full cards to backend/results/.
// This is the only place that may write question text to disk.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanEmail } from "../auth/passwords";
import { AI_PROVIDERS, type AiProviderName } from "../config/env";
import type { TemplateId } from "../content/questionCard";
import { dbProblem, isDbUnreachable } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/AppError";
import { messageForCode } from "../lessons/lessonErrors";
import { startMaking } from "../lessons/makeLessonQuestions";
import { readLessonFile } from "../lessons/readLessonFile";
import { createLesson, getLesson, listQuestions } from "../store/lessonStore";

const GAMES: TemplateId[] = ["quiz-show", "match-up", "fill-blank"];
const USAGE =
  'Usage: npm run make-questions -- "C:\\path\\to\\lesson.docx" --games quiz-show,match-up --topic "Equivalent Fractions" --subject Math --grade 4 [--order groq,gemini]';

function readArgs(argv: string[]) {
  const options: Record<string, string> = {};
  let filePath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) options[arg.slice(2)] = argv[++i] ?? "";
    else filePath ??= arg;
  }

  const games = (options.games ?? "").split(",").map((g) => g.trim()).filter(Boolean) as TemplateId[];
  const order = options.order?.split(",").map((o) => o.trim().toLowerCase()) as AiProviderName[] | undefined;
  const grade = Number(options.grade);
  const problems: string[] = [];
  if (!filePath) problems.push("the file path is missing");
  if (!games.length || games.length > 2 || games.some((g) => !GAMES.includes(g)) || new Set(games).size !== games.length) {
    problems.push("--games must be 1 or 2 of quiz-show, match-up, fill-blank");
  }
  if (!options.topic) problems.push("--topic is missing");
  if (!options.subject) problems.push("--subject is missing");
  if (!Number.isInteger(grade) || grade < 3 || grade > 6) problems.push("--grade must be 3 to 6");
  if (order && (!order.length || order.some((o) => !AI_PROVIDERS.includes(o)))) problems.push("--order may only list gemini and groq");

  return { filePath: filePath!, games, order, grade, topic: options.topic!, subject: options.subject!, problems };
}

/**
 * This script has no login, so its lessons belong to the seed Teacher
 * (SEED_TEACHER_EMAIL, default mr.gucci@kiddex.test), looked up in the database.
 * Returns null (after printing why) when that Teacher can't be found.
 */
async function seedTeacherId(): Promise<string | null> {
  const email = cleanEmail(process.env.SEED_TEACHER_EMAIL?.trim() || "mr.gucci@kiddex.test");
  if (!email) {
    console.log("SEED_TEACHER_EMAIL in backend/.env does not look like an email address.");
    return null;
  }
  try {
    const teacher = await prisma.teacher.findUnique({ where: { email }, select: { id: true } });
    if (!teacher) console.log(`No Teacher with the email ${email} yet. Run npm run db:seed first, then try again.`);
    return teacher?.id ?? null;
  } catch (err) {
    console.log(`Could not find the Teacher: ${dbProblem(err)}.`);
    return null;
  }
}

async function main(): Promise<void> {
  const args = readArgs(process.argv.slice(2));
  if (args.problems.length) {
    console.log(`${USAGE}\nProblem: ${args.problems.join("; ")}`);
    process.exitCode = 1;
    return;
  }

  const ownerId = await seedTeacherId();
  if (!ownerId) {
    process.exitCode = 1;
    return;
  }

  try {
    const buffer = await readFile(args.filePath);
    const fileName = path.basename(args.filePath);
    const lesson = await readLessonFile(buffer, fileName);
    console.log(`Read ${lesson.fileType}: ${lesson.unitCount} ${lesson.unitLabel}(s), ${lesson.wordCount} words, level ${lesson.textLevel}`);

    // Same path as the addresses: create the lesson in the database, then make its questions.
    const stored = await createLesson({
      ownerId,
      fileName,
      fileType: lesson.fileType,
      sizeBytes: buffer.length,
      unitLabel: lesson.unitLabel,
      unitCount: lesson.unitCount,
      unitCountIsEstimate: lesson.unitCountIsEstimate,
      wordCount: lesson.wordCount,
      tablesRead: lesson.tablesRead,
      picturesSkipped: lesson.picturesSkipped,
      textLevel: lesson.textLevel,
      units: lesson.units,
    });
    console.log(`Lesson id:    ${stored.id}`);
    console.log(`Asking the AI${args.order ? ` (order ${args.order.join(",")})` : ""}...`);

    const { finished } = await startMaking(ownerId, stored.id, {
      topic: args.topic,
      subject: args.subject,
      grade: args.grade,
      games: args.games,
      order: args.order,
    });
    const outcome = await finished;
    const after = await getLesson(ownerId, stored.id);
    console.log(`Lesson status: ${after?.status}${after?.errorCode ? ` (${after.errorCode})` : ""}`);
    if (!outcome.ok) {
      console.log(`${outcome.code}: ${messageForCode(outcome.code)}`);
      process.exitCode = 1;
      return;
    }
    const { summary, run } = outcome.result;
    // The cards as stored (with position, flagChecked, madeBy).
    const cards = await listQuestions(ownerId, stored.id);
    console.log(`Stored:       ${cards.length} questions, positions 1-${cards.length}`);

    console.log("");
    console.log(`Answered by:  ${run.answer.provider} (${run.answer.model}), ${run.answer.seconds} s for the answer`);
    console.log(`Total time:   ${run.totalSeconds} s`);
    console.log(`Request size: about ${run.answer.estimatedTokens} tokens (estimate)`);
    console.log(`Waits:        ${run.answer.waits.length ? run.answer.waits.map((s) => `${s} s`).join(", ") : "none"}`);
    console.log(`Backup used:  ${run.answer.usedBackup ? `yes, because the first AI: ${run.answer.backupReason ?? "failed"}` : "no"}`);
    for (const [game, info] of Object.entries(summary.games)) {
      const n = run.perGame[game as TemplateId]!;
      console.log(
        `${`${game}:`.padEnd(14)}asked ${n.asked}, received ${n.received}, good ${n.good}, kept ${n.kept} (target ${n.target}), extra ${n.extra}, rejected ${n.rejected}` +
          ` -> needs ${info!.needed}: ${info!.enough ? "enough" : "NOT enough"}`,
      );
    }
    const levels = { easy: 0, medium: 0, hard: 0 };
    for (const card of cards) levels[card.level]++;
    console.log(`Levels:       ${levels.easy} easy, ${levels.medium} medium, ${levels.hard} hard`);
    const notInLesson = cards.filter((c) => c.flag === "not_in_lesson").length;
    const aiUnsure = cards.filter((c) => c.flag === "ai_unsure").length;
    console.log(`Marked:       ${summary.flagged} (not_in_lesson ${notInLesson}, ai_unsure ${aiUnsure})`);
    const reasons = Object.entries(run.rejectedReasons).map(([reason, n]) => `${n} ${reason}`).join(", ");
    console.log(`Rejected:     ${summary.rejected}${reasons ? ` (${reasons})` : ""}`);
    console.log(`Extra cut:    ${summary.extra}`);
    if (!run.topUps.length) console.log("Top-up:       no");
    for (const up of run.topUps) {
      console.log(
        `Top-up:       ${up.game}: asked ${up.asked}, good ${up.good}` +
          (up.answer
            ? `, answered by ${up.answer.provider} in ${up.answer.seconds} s (total ${up.answer.totalSeconds} s), ` +
              `about ${up.answer.estimatedTokens} tokens, waits ${up.answer.waits.map((s) => `${s} s`).join(", ") || "none"}`
            : "") +
          (up.failed ? ` (${up.failed})` : ""),
      );
    }
    console.log(`Text cut:     ${summary.textWasCut ? `yes, up to ${lesson.unitLabel} ${summary.lastUnitUsed}` : "no"}`);

    const resultsDir = path.resolve(__dirname, "../../results");
    await mkdir(resultsDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
    const outFile = path.join(resultsDir, `${path.parse(fileName).name}-${stamp}.json`);
    await writeFile(
      outFile,
      JSON.stringify(
        { file: fileName, lessonId: stored.id, settings: { games: args.games, topic: args.topic, subject: args.subject, grade: args.grade, order: args.order ?? "AI_ORDER" }, run, summary, cards },
        null,
        2,
      ),
    );
    console.log(`\nSaved the cards to ${outFile}`);
  } catch (err) {
    if (err instanceof AppError) console.log(`${err.code}: ${err.message}`);
    else if ((err as NodeJS.ErrnoException)?.code === "ENOENT") console.log("File not found. Check the path.");
    else if (isDbUnreachable(err)) console.log(`Database problem: ${dbProblem(err)}.`);
    else console.log("Something went wrong:", err);
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
