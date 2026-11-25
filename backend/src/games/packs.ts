// Which games of a review pack can be played, and when the pack is done. Used by the
// Student's games (gameStore.ts) and the Teacher's reports (reportStore.ts), so
// "playable" and "done" mean exactly the same for both.
// Pure functions: no database.
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type CardType, type TemplateId } from "../content/questionCard";

/** The games in their usual order. */
export const GAMES = ["quiz-show", "match-up", "fill-blank"] as const satisfies readonly TemplateId[];

/** Approved cards per game, from the lesson's approved questions. */
export function cardCounts(questions: readonly { type: CardType }[]): Record<TemplateId, number> {
  const counts: Record<TemplateId, number> = { "quiz-show": 0, "match-up": 0, "fill-blank": 0 };
  for (const q of questions) counts[TEMPLATE_FOR_TYPE[q.type]]++;
  return counts;
}

/** The pack's assigned games in the usual order, each playable when it has MIN_CARDS cards. */
export function packGames(assigned: readonly string[], counts: Record<TemplateId, number>) {
  return GAMES.filter((g) => assigned.includes(g)).map((id) => ({ id, playable: counts[id] >= MIN_CARDS[id] }));
}

/** Only the playable ones. */
export const playableGames = (assigned: readonly string[], counts: Record<TemplateId, number>): TemplateId[] =>
  packGames(assigned, counts)
    .filter((g) => g.playable)
    .map((g) => g.id);

/**
 * A pack is done when every playable game has a round with countsForMission.
 * A pack with no playable game is never done (it can't be played).
 */
export const packDone = (playable: readonly TemplateId[], isDone: (game: TemplateId) => boolean) =>
  playable.length > 0 && playable.every(isDone);
