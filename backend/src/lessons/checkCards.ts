// Checks every card the AI wrote (our code, not the AI): keeps only the picked types,
// fills in the server fields, checks the card format and extra rules, drops repeats,
// and marks cards the Teacher should look at closely (flag).
import { randomUUID } from "node:crypto";
import {
  QuestionCardSchema,
  TEMPLATE_FOR_TYPE,
  type CardType,
  type QuestionCard,
  type TemplateId,
} from "../content/questionCard";
import type { Lesson } from "../store/lessonStore";

export interface CheckContext {
  lesson: Pick<Lesson, "id" | "fileType" | "units">;
  subject: string;
  topic: string;
  grade: number;
  games: TemplateId[];
}

export type RejectReason =
  | "not a card"
  | "type not asked for"
  | "broke the card format"
  | "wrong number of choices"
  | "blank problem"
  | "repeated question"
  | "pair side used twice";

export const GAME_ORDER: TemplateId[] = ["quiz-show", "match-up", "fill-blank"];
const LEVEL_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/** Lowercase, no punctuation, single spaces: for finding a quote in the lesson. */
function forSearch(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/** Lowercase with no spaces or punctuation: for spotting repeated prompts and pair sides. */
function forRepeat(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

/** A checker that remembers what it has kept, so a top-up round cannot repeat earlier cards. */
export function createCardChecker(context: CheckContext) {
  const allowedTypes = new Set(
    (Object.keys(TEMPLATE_FOR_TYPE) as CardType[]).filter((type) => context.games.includes(TEMPLATE_FOR_TYPE[type])),
  );
  const pages = context.lesson.units.map((unit) => ({ number: unit.number, text: ` ${forSearch(unit.text)} ` }));

  const cards: QuestionCard[] = [];
  const rejected: Partial<Record<RejectReason, number>> = {};
  const rejectedByGame: Partial<Record<TemplateId, number>> = {};
  const seenPrompts = new Set<string>();
  const leftSides = new Set<string>();
  const rightSides = new Set<string>();

  function reject(reason: RejectReason, raw: unknown): void {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
    const type = text((raw as { type?: unknown } | null)?.type) as CardType;
    if (allowedTypes.has(type)) {
      const game = TEMPLATE_FOR_TYPE[type];
      rejectedByGame[game] = (rejectedByGame[game] ?? 0) + 1;
    }
  }

  function checkOne(raw: unknown): QuestionCard | RejectReason {
    if (!raw || typeof raw !== "object") return "not a card";
    const item = raw as Record<string, unknown>;

    const type = text(item.type) as CardType;
    if (!allowedTypes.has(type)) return "type not asked for";

    const parsed = QuestionCardSchema.safeParse({
      id: randomUUID(),
      lessonId: context.lesson.id,
      type,
      prompt: text(item.prompt).replace(/_{3,}/g, "___"),
      // A pair never has choices, whatever the AI sent.
      choices: type === "matching_pair" ? [] : Array.isArray(item.choices) ? item.choices.map(text) : [],
      answer: text(item.answer),
      subject: context.subject.trim(),
      topic: context.topic.trim(),
      grade: context.grade,
      level: text(item.level).toLowerCase(),
      explanation: text(item.explanation) || undefined,
      status: "draft",
    });
    if (!parsed.success) return "broke the card format";
    const card = parsed.data;

    if (card.type === "multiple_choice" && card.choices.length !== 4) return "wrong number of choices";
    if (card.type === "fill_blank") {
      if (card.choices.length !== 3) return "wrong number of choices";
      if (card.prompt.split("___").length !== 2) return "blank problem";
    }

    const promptKey = forRepeat(card.prompt);
    if (seenPrompts.has(promptKey)) return "repeated question";
    if (card.type === "matching_pair") {
      const rightKey = forRepeat(card.answer);
      if (leftSides.has(promptKey) || rightSides.has(rightKey)) return "pair side used twice";
      leftSides.add(promptKey);
      rightSides.add(rightKey);
    }
    seenPrompts.add(promptKey);

    // The mark. Trust our own search of the lesson, not the AI's page number.
    const quote = text(item.sourceQuote);
    const quoteKey = forSearch(quote);
    const foundOn = quoteKey.split(" ").length >= 3 ? pages.find((page) => page.text.includes(` ${quoteKey} `)) : undefined;

    if (!foundOn) {
      card.flag = "not_in_lesson";
    } else {
      card.sourceQuote = quote;
      // Word pages are only an estimate, so a Word card gets no page number.
      if (context.lesson.fileType !== "docx") card.sourcePage = foundOn.number;
      if (item.unsure === true || item.unsure === "true") card.flag = "ai_unsure";
    }
    return card;
  }

  return {
    /** Checks one AI answer's cards. Returns how many were kept. */
    add(rawCards: unknown[]): number {
      let kept = 0;
      for (const raw of rawCards) {
        const result = checkOne(raw);
        if (typeof result === "string") {
          reject(result, raw);
        } else {
          cards.push(result);
          kept++;
        }
      }
      return kept;
    },
    cards: () => cards,
    rejected: () => rejected,
    rejectedByGame: () => rejectedByGame,
    count(game: TemplateId): number {
      return cards.filter((card) => TEMPLATE_FOR_TYPE[card.type] === game).length;
    },
  };
}

/**
 * When a game has more good cards than its target, chooses which `target` cards to keep:
 * cards with no mark first, and a level mix close to 40% easy, 35% medium, 25% hard.
 * Order of choice: unmarked cards within each level's share, then any unmarked card,
 * then marked cards within each level's share, then any marked card.
 */
export function keepBest(cards: QuestionCard[], target: number): QuestionCard[] {
  if (cards.length <= target) return cards;
  const easy = Math.round(target * 0.4);
  const hard = Math.round(target * 0.25);
  const share: Record<QuestionCard["level"], number> = { easy, medium: Math.max(0, target - easy - hard), hard };

  const kept = new Set<QuestionCard>();
  const taken: Record<QuestionCard["level"], number> = { easy: 0, medium: 0, hard: 0 };
  const take = (pool: QuestionCard[], withinShare: boolean) => {
    for (const card of pool) {
      if (kept.size >= target) return;
      if (kept.has(card) || (withinShare && taken[card.level] >= share[card.level])) continue;
      kept.add(card);
      taken[card.level]++;
    }
  };

  const unmarked = cards.filter((card) => !card.flag);
  const marked = cards.filter((card) => card.flag);
  take(unmarked, true);
  take(unmarked, false);
  take(marked, true);
  take(marked, false);
  return cards.filter((card) => kept.has(card));
}

/**
 * TEST ONLY (DEV_MARK_EVERY): marks every Nth card that has no mark as "not_in_lesson",
 * the same way a real mark looks (no sourcePage or sourceQuote), so the Check page's
 * marked states can be tried. `every` undefined (empty setting or production) = no change.
 */
export function devMarkEvery(cards: QuestionCard[], every: number | undefined): QuestionCard[] {
  if (!every) return cards;
  let unmarked = 0;
  let marked = 0;
  const result = cards.map((card) => {
    if (card.flag) return card;
    unmarked++;
    if (unmarked % every !== 0) return card;
    marked++;
    const { sourcePage: _page, sourceQuote: _quote, ...rest } = card;
    return { ...rest, flag: "not_in_lesson" as const };
  });
  console.log(`[questions] DEV_MARK_EVERY=${every}: marked ${marked} card(s) for testing`);
  return result;
}

/** Quiz Show, Match Up, Fill the Blank; inside each game: easy, medium, hard. */
export function sortCards(cards: QuestionCard[]): QuestionCard[] {
  return [...cards].sort(
    (a, b) =>
      GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[a.type]) - GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[b.type]) ||
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level],
  );
}
