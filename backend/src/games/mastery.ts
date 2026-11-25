// Mastery per topic, for the Teacher's reports (step 9). Rule-based: the same saved
// answers always give the same result. Worked out from the saved answers every time
// it is asked for; nothing extra is saved.
// Pure functions: no database.

// The mastery rule. The group must still confirm these numbers (Master Brief 4.5
// [CONFIRM]); change them here and every report follows.
export const MASTERY_WINDOW = 20; // the last 20 answers in a topic
export const MASTERY_MIN_ANSWERS = 8; // fewer than 8 → "not enough yet"
export const HELP_BELOW = 50; // a topic under 50% → Needs help
export const GREEN_FROM = 70; // 70% or more = green (the screens already use 50 / 70)

/** One saved answer: right / helped only, never the question. */
export interface MasteryAnswer {
  right: boolean;
  helped: boolean;
}

export interface TopicMastery {
  /** null while the Student has fewer than MASTERY_MIN_ANSWERS answers in the topic. */
  percent: number | null;
  /** All the Student's answers in this topic (not capped at the window). */
  answers: number;
}

/** Right = 1, right with Buddy Help = 0.5, wrong = 0. */
const scoreOf = (a: MasteryAnswer) => (a.right ? (a.helped ? 0.5 : 1) : 0);

/**
 * One Student's mastery in one topic. `answers` must be newest first (newest round
 * first, and inside a round the highest position first). Only the newest
 * MASTERY_WINDOW count, so old mistakes fade out.
 */
export function topicMastery(answers: readonly MasteryAnswer[]): TopicMastery {
  if (answers.length < MASTERY_MIN_ANSWERS) return { percent: null, answers: answers.length };
  const counted = answers.slice(0, MASTERY_WINDOW);
  const sum = counted.reduce((s, a) => s + scoreOf(a), 0);
  return { percent: Math.round((sum / counted.length) * 100), answers: answers.length };
}

const percents = (topics: readonly { percent: number | null }[]) =>
  topics.map((t) => t.percent).filter((p): p is number => p !== null);

/** The average of the topic percents that are not null, rounded. null when none. */
export function overallMastery(topics: readonly { percent: number | null }[]): number | null {
  const list = percents(topics);
  return list.length ? Math.round(list.reduce((s, p) => s + p, 0) / list.length) : null;
}

/** True when any topic has a percent under HELP_BELOW. */
export const needsHelp = (topics: readonly { percent: number | null }[]) => percents(topics).some((p) => p < HELP_BELOW);

/** For the Student's card (rp-3): null → 0, under 50 → 1, 50–69 → 2, 70+ → 3. */
export function stage(percent: number | null): 0 | 1 | 2 | 3 {
  if (percent === null) return 0;
  if (percent < HELP_BELOW) return 1;
  if (percent < GREEN_FROM) return 2;
  return 3;
}
