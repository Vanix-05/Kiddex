// XP, stars and levels for a finished round. Pure functions: no database.
// The backend works these out when a round is saved; the browser never sends them.
import type { TemplateId } from "../content/questionCard";

/** Cards in one round of each game. Must match GAMES (roundSize) in frontend/src/games/session.ts. */
export const ROUND_SIZE: Record<TemplateId, number> = {
  "quiz-show": 8,
  "match-up": 5,
  "fill-blank": 8,
};

/** 5 XP per right answer (2 if the buddy helped) + 10 for finishing. Same as frontend xpFor. */
export const xpFor = (right: number, helpedRight = 0) => (right - helpedRight) * 5 + helpedRight * 2 + 10;

/**
 * The round's stars as shown on Results: 3 for a perfect round, 2 at 75% or more,
 * 1 for finishing. Helped right answers count as right here. Same as frontend starsFor.
 */
export function starsFor(right: number, total: number): 1 | 2 | 3 {
  if (total > 0 && right === total) return 3;
  if (total > 0 && right / total >= 0.75) return 2;
  return 1;
}

/**
 * Stars actually added to the Student's total (new rule, group to confirm): only
 * what beats their best earlier round of the same game and lesson. 2★ → +2, then
 * 2★ → +0, then 3★ → +1. Replaying can't farm stars.
 */
export const starsEarned = (roundStars: number, bestStarsBefore: number) => Math.max(0, roundStars - bestStarsBefore);

export const XP_PER_LEVEL = 300;

/** Level 1 at 0 XP, level 2 at 300 XP, and so on. */
export function levelFromXp(xp: number) {
  return { level: 1 + Math.floor(xp / XP_PER_LEVEL), xpIntoLevel: xp % XP_PER_LEVEL, xpGoal: XP_PER_LEVEL };
}

/**
 * The most XP a mission can give (the Lobby's "Up to +85 XP"): for each mission
 * game, a perfect unhelped round of min(ROUND_SIZE, approved cards) cards.
 */
export function missionMaxXp(games: readonly { game: TemplateId; cards: number }[]): number {
  return games.reduce((sum, { game, cards }) => sum + xpFor(Math.min(ROUND_SIZE[game], cards)), 0);
}
