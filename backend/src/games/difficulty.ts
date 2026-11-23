// Keep in sync with frontend/src/games/difficulty.ts. Rule-based, not AI.
//
// Only the end-of-round part of the KIDDEX difficulty engine is copied here: the
// backend decides the next round's level when a round is saved. The rules:
//   - 80% or more counting as right -> one level up for the next round
//   - under 50%                      -> one level down
//   - otherwise                      -> keep
//   - Easy never goes lower and hard never higher: the change is then "keep".
//   - An answer the buddy helped with (Buddy Help) counts as NOT right.
// Every decision says why, e.g. { level: "medium", change: "up", reason: "7 of 8 right (88%)" }.
// Pure functions: no database.

export type Level = "easy" | "medium" | "hard";
export type Change = "up" | "down" | "keep";

export const LEVELS: readonly Level[] = ["easy", "medium", "hard"];
export const START_LEVEL: Level = "easy";

export interface Decision {
  level: Level;
  change: Change;
  reason: string;
}

/** One level up or down, staying inside easy..hard. */
export function stepLevel(level: Level, change: Change): Level {
  const i = LEVELS.indexOf(level);
  if (change === "up") return LEVELS[Math.min(i + 1, LEVELS.length - 1)]!;
  if (change === "down") return LEVELS[Math.max(i - 1, 0)]!;
  return level;
}

/** A decision; a move past easy or hard becomes "keep". */
function decide(level: Level, wanted: Change, reason: string): Decision {
  const next = stepLevel(level, wanted);
  if (next === level && wanted !== "keep") {
    return {
      level,
      change: "keep",
      reason: `${reason}, already ${level === "hard" ? "the hardest" : "the easiest"} level`,
    };
  }
  return { level: next, change: wanted, reason };
}

/** One answer: right or not, or the record of it (a helped answer counts as not right). */
export type Answer = boolean | { right: boolean; helped?: boolean };

/** Does this answer count as right for the level? */
export const countsAsRight = (a: Answer) => (typeof a === "boolean" ? a : a.right && !a.helped);

/** "3 of 4 right" */
const rightOf = (answers: readonly Answer[]) => `${answers.filter(countsAsRight).length} of ${answers.length} right`;

/** The next round's level, from the level this round started at. */
export function decideAfterRound(answers: readonly Answer[], startLevel: Level): Decision {
  if (answers.length === 0) return { level: startLevel, change: "keep", reason: "no answers" };
  const share = answers.filter(countsAsRight).length / answers.length;
  const reason = `${rightOf(answers)} (${Math.round(share * 100)}%)`;
  const wanted: Change = share >= 0.8 ? "up" : share < 0.5 ? "down" : "keep";
  return decide(startLevel, wanted, reason);
}
