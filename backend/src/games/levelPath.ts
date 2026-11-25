// A Student's level path per topic, for the Teacher (step 8: show the adaptive engine).
// Rule-based, not AI: the checks made every 4 answers during a round are worked out
// again from the saved answers with decideAfterFour (src/games/difficulty.ts). The
// same answers always give the same result, so nothing extra is saved.
// Pure functions: no database.
import { decideAfterFour, type Change, type Level } from "./difficulty";

/** The engine looks at the answers 4 at a time during a round (rule 3). */
export const CHECK_SIZE = 4;
/** How many rounds per topic the Teacher's page shows (the newest ones). */
export const ROUNDS_SHOWN = 6;

/** Only these games change the level during a round. Match Up never does. */
const GAMES_WITH_CHECKS: ReadonlySet<string> = new Set(["quiz-show", "fill-blank"]);

/** One saved answer, as the Teacher sees it: never the question or the choices. */
export interface PathAnswer {
  right: boolean;
  helped: boolean;
}

/** One check made during a round, e.g. answers 1–4: 3 counted as right → up. */
export interface LevelCheck {
  /** 1-based, e.g. 1 and 4 for "Answers 1–4". */
  from: number;
  to: number;
  answers: PathAnswer[];
  /** Answers counted as right (a helped answer is not counted, rule 6). */
  counted: number;
  levelBefore: Level;
  levelAfter: Level;
  change: Change;
  /** false for the leftover answers at the end (fewer than 4): no decision was made. */
  decided: boolean;
  /** e.g. "3 of 4 right", or "4 of 4 right, already the hardest level"; "" when not decided. */
  reason: string;
}

/** Same key as TopicLevel.topicKey: trimmed and lowercase. */
export const topicKeyOf = (topic: string) => topic.trim().toLowerCase();

/**
 * The checks of one round, from its answers in `position` order. Starts at the
 * round's start level and applies decideAfterFour after every 4 answers. The
 * card's own level (RoundAnswer.level) is NOT used: it can be a nearby level when
 * the lesson has too few cards of the current level (rule 2).
 * Match Up: no checks (it never changes level during a round).
 */
export function roundChecks(
  game: string,
  startLevel: Level,
  answers: readonly (PathAnswer & { position: number })[],
): LevelCheck[] {
  if (!GAMES_WITH_CHECKS.has(game)) return [];
  const ordered = [...answers].sort((a, b) => a.position - b.position).map((a) => ({ right: a.right, helped: a.helped }));
  const checks: LevelCheck[] = [];
  let level = startLevel;
  for (let i = 0; i < ordered.length; i += CHECK_SIZE) {
    const group = ordered.slice(i, i + CHECK_SIZE);
    const counted = group.filter((a) => a.right && !a.helped).length;
    const base = { from: i + 1, to: i + group.length, answers: group, counted, levelBefore: level };
    if (group.length < CHECK_SIZE) {
      checks.push({ ...base, levelAfter: level, change: "keep", decided: false, reason: "" });
      continue;
    }
    const decision = decideAfterFour(group, level);
    checks.push({ ...base, levelAfter: decision.level, change: decision.change, decided: true, reason: decision.reason });
    level = decision.level;
  }
  return checks;
}

/** How many rounds went up and down. */
export function countChanges(rounds: readonly { change: string }[]) {
  return {
    ups: rounds.filter((r) => r.change === "up").length,
    downs: rounds.filter((r) => r.change === "down").length,
  };
}

export interface TopicGroup<R> {
  key: string;
  /** All rounds of this topic, oldest first. */
  rounds: R[];
}

/**
 * Rounds grouped by topic (trimmed + lowercase), each group oldest first, the
 * groups newest played first. Rounds that end at the same moment keep their order.
 */
export function groupByTopic<R extends { topic: string; endedAt: Date }>(rounds: readonly R[]): TopicGroup<R>[] {
  const byKey = new Map<string, R[]>();
  for (const r of rounds) {
    const key = topicKeyOf(r.topic);
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  const groups = [...byKey].map(([key, list]) => ({
    key,
    rounds: [...list].sort((a, b) => a.endedAt.getTime() - b.endedAt.getTime()),
  }));
  const newest = (g: TopicGroup<R>) => g.rounds[g.rounds.length - 1]!.endedAt.getTime();
  return groups.sort((a, b) => newest(b) - newest(a));
}

/** The newest `ROUNDS_SHOWN` rounds of a topic (which is oldest first), still oldest first. */
export const shownRounds = <R>(oldestFirst: readonly R[]) => oldestFirst.slice(-ROUNDS_SHOWN);
