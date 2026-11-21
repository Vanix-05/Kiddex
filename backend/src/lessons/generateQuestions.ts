// Makes question cards from a read lesson file: asks the AI for each picked game in its OWN
// request, one after the other (Match Up, then Fill the Blank, then Quiz Show; each with a few
// extra items and the other game's cards as "already have"), checks every card, tops up a game
// that is not playable (that game only), keeps the best `target` cards per game, and builds the summary.
// Used through makeLessonQuestions.ts (POST /api/lessons/:lessonId/generate and `npm run make-questions`).
import { env, type AiProviderName } from "../config/env";
import { gameRequestOrder, toRawCards, type ListCounts } from "../ai/answerShape";
import { generateWithFallback, type AiAnswer } from "../ai/generateWithFallback";
import { buildQuestionPrompt } from "../ai/questionPrompt";
import type { SentLesson } from "../ai/types";
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type QuestionCard, type TemplateId } from "../content/questionCard";
import { createCardChecker, devMarkEvery, GAME_ORDER, keepBest, sortCards, type RejectReason } from "./checkCards";
import type { Lesson } from "../store/lessonStore";
import { lessonErrors } from "./lessonErrors";
import {
  ASK_EXTRA_FACTOR,
  GROQ_MAX_LESSON_WORDS,
  LOW_TEXT_TARGET_FACTOR,
  MAX_JOB_SECONDS,
  MAX_OUTPUT_TOKENS_PER_GAME,
  MAX_WORDS_TO_AI,
  TARGET_CARDS,
} from "./limits";

/** "waiting" = the AI said it is busy and we are waiting to try again. */
export type GenerateStep = "writing" | "checking" | "waiting";

export interface GenerateInput {
  lesson: Pick<Lesson, "id" | "fileType" | "units" | "unitLabel" | "textLevel">;
  subject: string;
  topic: string;
  grade: number;
  games: TemplateId[];
  /** Overrides AI_ORDER for this run (test command only). */
  order?: AiProviderName[];
  onStep?: (step: GenerateStep) => void;
}

export interface GenerateSummary {
  games: Partial<Record<TemplateId, { count: number; needed: number; enough: boolean }>>;
  flagged: number;
  rejected: number;
  /** Good cards we did not keep because a game already had its target number. */
  extra: number;
  textWasCut: boolean;
  /** The last page or slide sent to the AI, when the text was cut. */
  lastUnitUsed: number | null;
}

/** Per game: asked from the AI, received, good after checking, kept, cut as extra, rejected. */
export interface GameNumbers {
  target: number;
  asked: number;
  received: number;
  good: number;
  kept: number;
  extra: number;
  rejected: number;
}

export type AnswerInfo = Omit<AiAnswer, "json" | "lesson"> & { game: TemplateId; estimatedTokens: number };

/** One game's first request: how many items were asked, how many were good, and who answered. */
export interface GameRequestInfo {
  game: TemplateId;
  asked: number;
  good: number;
  failed?: string;
}

export interface TopUpInfo {
  game: TemplateId;
  asked: number;
  good: number;
  answer?: AnswerInfo;
  failed?: string;
}

/** Details for the server console and the test command only, never the browser. */
export interface GenerateRunInfo {
  /** One per game request that got an answer, in request order (top-ups are in `topUps`). */
  answers: AnswerInfo[];
  /** One per game request, answered or not, in request order. */
  requests: GameRequestInfo[];
  totalSeconds: number;
  perGame: Partial<Record<TemplateId, GameNumbers>>;
  rejectedReasons: Partial<Record<RejectReason, number>>;
  topUps: TopUpInfo[];
}

export interface GenerateResult {
  cards: QuestionCard[];
  summary: GenerateSummary;
  run: GenerateRunInfo;
}

function answerInfo(answer: AiAnswer, game: TemplateId): AnswerInfo {
  const { json: _json, lesson, ...rest } = answer;
  return { game, ...rest, estimatedTokens: lesson.estimatedTokens };
}

/** The cards we have as short lines for "already have" (pairs as "left = right"). */
function promptsOf(cards: QuestionCard[]): string[] {
  return cards.map((card) => (card.type === "matching_pair" ? `${card.prompt} = ${card.answer}` : card.prompt));
}

export async function generateQuestions(input: GenerateInput): Promise<GenerateResult> {
  const { lesson, games } = input;
  if (lesson.textLevel === "none") throw lessonErrors.notEnoughText();
  const startedAt = Date.now();
  const deadline = startedAt + MAX_JOB_SECONDS * 1000;

  // Target = how many we keep. A low-text lesson gets half, but never fewer than a game needs.
  // Asked = target + 35%, so a few bad cards do not leave a game short.
  const targets: ListCounts = {};
  const asks: ListCounts = {};
  for (const game of games) {
    const full = TARGET_CARDS[game];
    const target =
      lesson.textLevel === "low" ? Math.max(Math.ceil(full * LOW_TEXT_TARGET_FACTOR), MIN_CARDS[game]) : full;
    targets[game] = target;
    asks[game] = Math.ceil(target * ASK_EXTRA_FACTOR);
  }

  const promptBase = { subject: input.subject, topic: input.topic, grade: input.grade };
  const checker = createCardChecker({ ...promptBase, lesson, games });
  const received: Partial<Record<TemplateId, number>> = {};
  const fallback = {
    order: input.order,
    deadline,
    onWait: (seconds: number) => input.onStep?.(seconds > 0 ? "waiting" : "writing"),
  };

  // Every lesson text sent (first requests and top-ups), for textWasCut / lastUnitUsed.
  const sentLessons: SentLesson[] = [];

  // One request per picked game: that game's list only, with the other game's cards as "already have".
  const answers: AnswerInfo[] = [];
  const requests: GameRequestInfo[] = [];
  let lastError: unknown;
  for (const game of gameRequestOrder(games)) {
    const lists: ListCounts = { [game]: asks[game] };
    const alreadyHave = promptsOf(checker.cards().filter((card) => TEMPLATE_FOR_TYPE[card.type] !== game));
    const info: GameRequestInfo = { game, asked: asks[game] ?? 0, good: 0 };
    requests.push(info);

    input.onStep?.("writing");
    try {
      const answer = await generateWithFallback(
        {
          instructions: buildQuestionPrompt({ ...promptBase, lists, alreadyHave }),
          lesson,
          lists,
          maxLessonWords: MAX_WORDS_TO_AI,
          maxOutputTokens: MAX_OUTPUT_TOKENS_PER_GAME[game],
        },
        fallback,
      );
      input.onStep?.("checking");
      const got = toRawCards(answer.json, [game]);
      received[game] = (received[game] ?? 0) + (got.received[game] ?? 0);
      info.good = checker.add(got.cards);
      answers.push(answerInfo(answer, game));
      sentLessons.push(answer.lesson);
    } catch (err) {
      // Keep going with the next game; the top-up below may still save this one.
      lastError = err;
      info.failed = "no AI answered";
      console.warn(`[questions] request for ${game} failed, going on with the next game`);
    }
  }
  // No AI answered at all: fail the same way as before (AI busy), without top-ups.
  if (!answers.length) throw lastError;

  // Top-up: only a game that is not playable yet, that game's list only, with the short lesson text.
  const topUps: TopUpInfo[] = [];
  for (const game of games) {
    const count = checker.count(game);
    if (count >= MIN_CARDS[game]) continue;

    const ask = (targets[game] ?? 0) - count + 2;
    const topUp: TopUpInfo = { game, asked: ask, good: 0 };
    topUps.push(topUp);
    const lists: ListCounts = { [game]: ask };
    const alreadyHave = promptsOf(checker.cards().filter((card) => TEMPLATE_FOR_TYPE[card.type] === game));

    input.onStep?.("writing");
    try {
      const more = await generateWithFallback(
        {
          instructions: buildQuestionPrompt({ ...promptBase, lists, alreadyHave }),
          lesson,
          lists,
          maxLessonWords: GROQ_MAX_LESSON_WORDS,
          maxOutputTokens: MAX_OUTPUT_TOKENS_PER_GAME[game],
        },
        fallback,
      );
      input.onStep?.("checking");
      const extraCards = toRawCards(more.json, [game]);
      received[game] = (received[game] ?? 0) + (extraCards.received[game] ?? 0);
      topUp.good = checker.add(extraCards.cards);
      topUp.answer = answerInfo(more, game);
      sentLessons.push(more.lesson);
    } catch {
      // Keep what we have; that game shows enough: false.
      topUp.failed = "no AI answered the top-up";
      console.warn(`[questions] top-up for ${game} failed, keeping the cards we have`);
    }
  }

  // Keep at most `target` cards per game.
  const kept: QuestionCard[] = [];
  const perGame: Partial<Record<TemplateId, GameNumbers>> = {};
  for (const game of games) {
    const good = checker.cards().filter((card) => TEMPLATE_FOR_TYPE[card.type] === game);
    const best = keepBest(good, targets[game] ?? good.length);
    kept.push(...best);
    perGame[game] = {
      target: targets[game] ?? 0,
      asked: (asks[game] ?? 0) + topUps.filter((t) => t.game === game).reduce((sum, t) => sum + t.asked, 0),
      received: received[game] ?? 0,
      good: good.length,
      kept: best.length,
      extra: good.length - best.length,
      rejected: checker.rejectedByGame()[game] ?? 0,
    };
  }

  const cards = devMarkEvery(sortCards(kept), env.devMarkEvery);
  // Cut if ANY request's text was cut; the last page used is the smallest one among those.
  const cutLessons = sentLessons.filter((sent) => sent.textWasCut);
  const summary: GenerateSummary = {
    games: {},
    flagged: cards.filter((card) => card.flag).length,
    rejected: Object.values(checker.rejected()).reduce((sum, n) => sum + (n ?? 0), 0),
    extra: Object.values(perGame).reduce((sum, numbers) => sum + (numbers?.extra ?? 0), 0),
    textWasCut: cutLessons.length > 0,
    lastUnitUsed: cutLessons.length ? Math.min(...cutLessons.map((sent) => sent.lastUnitUsed)) : null,
  };
  for (const game of GAME_ORDER.filter((g) => games.includes(g))) {
    const count = perGame[game]?.kept ?? 0;
    summary.games[game] = { count, needed: MIN_CARDS[game], enough: count >= MIN_CARDS[game] };
  }

  const run: GenerateRunInfo = {
    answers,
    requests,
    totalSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
    perGame,
    rejectedReasons: checker.rejected(),
    topUps,
  };

  if (!Object.values(summary.games).some((game) => game?.enough)) {
    console.warn(`[questions] no game got enough cards (${cards.length} kept, ${summary.rejected} rejected)`);
    throw lessonErrors.noGoodQuestions();
  }
  return { cards, summary, run };
}
