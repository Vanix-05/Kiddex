// Starts making questions for a stored lesson and saves the result on it.
// Used by POST /api/lessons/:lessonId/generate (runs in the background) and by `npm run make-questions`.
// The checks (not found, already making, has questions, not enough text, too many running)
// happen right away, before anything starts. Only counts and timings are logged.
import type { AiProviderName } from "../config/env";
import type { TemplateId } from "../content/questionCard";
import { AppError } from "../middleware/AppError";
import type { MakingStep } from "../store/lessonStore";
import { countMaking, getLesson, listQuestions, saveQuestions, startMakingLesson, updateLesson } from "../store/lessonStore";
import { generateQuestions, type GenerateResult } from "./generateQuestions";
import { lessonErrors } from "./lessonErrors";

export const MAX_MAKING_AT_ONCE = 2;

export interface MakeInput {
  topic: string;
  subject: string;
  grade: number;
  games: TemplateId[];
  /** Overrides AI_ORDER (test command only). */
  order?: AiProviderName[];
}

export type MakeOutcome = { ok: true; result: GenerateResult } | { ok: false; code: string };

/**
 * Checks the lesson, marks it "making" and starts the work.
 * Throws an AppError right away if it cannot start. `finished` resolves when the work is done.
 */
export async function startMaking(
  ownerId: string,
  lessonId: string,
  input: MakeInput,
): Promise<{ finished: Promise<MakeOutcome> }> {
  const lesson = await getLesson(ownerId, lessonId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  if (lesson.status === "making") throw lessonErrors.alreadyMaking();
  if ((await listQuestions(ownerId, lessonId)).length) throw lessonErrors.alreadyHasQuestions();
  if (lesson.textLevel === "none") throw lessonErrors.notEnoughText();
  if ((await countMaking()) >= MAX_MAKING_AT_ONCE) throw lessonErrors.aiBusy();

  const startedAt = new Date();
  // Only if it is not "making" yet, so two clicks at the same time can't both start.
  const making = await startMakingLesson(ownerId, lessonId, {
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    games: input.games,
    makingStep: "writing",
    makingStartedAt: startedAt.toISOString(),
    errorCode: null,
  });
  if (!making) throw lessonErrors.alreadyMaking();

  // Step changes are saved one after another; the last one is awaited before the
  // final save, so a late step can't land on a finished lesson.
  let stepSaves: Promise<unknown> = Promise.resolve();
  const saveStep = (step: MakingStep) => {
    stepSaves = stepSaves
      .then(() => updateLesson(ownerId, lessonId, { makingStep: step }))
      .catch(() => {}); // only the progress label: the final save below matters
  };

  const finished = (async (): Promise<MakeOutcome> => {
    console.log(`[questions] making started: ${input.games.join(", ")}, grade ${input.grade}, ${making.wordCount} words`);
    try {
      const result = await generateQuestions({
        lesson: making,
        topic: input.topic,
        subject: input.subject,
        grade: input.grade,
        games: input.games,
        order: input.order,
        onStep: saveStep,
      });
      await stepSaves;
      await saveQuestions(ownerId, lessonId, result.cards, "ai");
      await updateLesson(ownerId, lessonId, { status: "ready", makingStep: null, textWasCut: result.summary.textWasCut });
      const counts = Object.entries(result.summary.games).map(([game, info]) => `${game} ${info?.count}`).join(", ");
      console.log(
        `[questions] making done in ${secondsSince(startedAt)} s: ${counts}; ${result.summary.flagged} flagged, ` +
          `${result.summary.rejected} rejected, ${result.summary.extra} extra` +
          `${result.run.topUps.length ? `, with top-up (${result.run.topUps.map((t) => t.game).join(", ")})` : ""}`,
      );
      return { ok: true, result };
    } catch (err) {
      const code = err instanceof AppError ? err.code : "SERVER_ERROR";
      if (!(err instanceof AppError)) console.error("[questions] making crashed", err);
      console.warn(`[questions] making failed after ${secondsSince(startedAt)} s: ${code}`);
      await stepSaves;
      try {
        await updateLesson(ownerId, lessonId, { status: "failed", makingStep: null, errorCode: code });
      } catch {
        // The database is down too. The lesson stays "making"; on the next start
        // (or within a few minutes) it becomes "failed" with SERVER_RESTARTED.
        console.warn("[questions] could not save the failed state");
      }
      return { ok: false, code };
    }
  })();

  return { finished };
}

function secondsSince(start: Date): number {
  return Math.round((Date.now() - start.getTime()) / 1000);
}
