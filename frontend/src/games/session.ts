// Building rounds and scoring them: shared by every mini game. Pure functions.
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type QuestionCard } from '../content/questionCard'
import type { Decision } from './difficulty'
import type { AnswerRecord, GameId, GameResult } from './types'

/** Each game's name, its card type and its round size. */
export const GAMES: Record<GameId, { name: string; type: QuestionCard['type']; roundSize: number; built: boolean }> = {
  'quiz-show': { name: 'Quiz Show', type: 'multiple_choice', roundSize: 8, built: true },
  'match-up': { name: 'Match Up', type: 'matching_pair', roundSize: 5, built: true },
  'fill-blank': { name: 'Fill the Blank', type: 'fill_blank', roundSize: 6, built: false },
}

export { MISSION_GAMES } from './mission'

export const isGameId = (value: unknown): value is GameId => typeof value === 'string' && value in GAMES

/** A game can be played with a lesson's approved cards when there are at least MIN_CARDS. */
export const playableCards = (cards: readonly QuestionCard[], game: GameId) =>
  cards.filter((c) => c.status === 'approved' && TEMPLATE_FOR_TYPE[c.type] === game)

export const hasEnough = (cards: readonly QuestionCard[], game: GameId) => playableCards(cards, game).length >= MIN_CARDS[game]

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The finished round's record. */
export function makeResult(gameId: GameId, lessonId: string, topic: string, startedAt: number, endedAt: number, answers: AnswerRecord[]): GameResult {
  return { gameId, lessonId, topic, startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), answers }
}

// ---------- Scoring ----------

/** 1 star for finishing, 2 at 75% or more, 3 for a perfect round. */
export function starsFor(right: number, total: number): 1 | 2 | 3 {
  if (total > 0 && right === total) return 3
  if (total > 0 && right / total >= 0.75) return 2
  return 1
}

/** One helpful line under the title: how to get the next star. */
export function nextStarLine(right: number, total: number): string {
  const stars = starsFor(right, total)
  if (stars === 3) return 'Perfect round!'
  if (stars === 2) return 'One more star if you get them all right.'
  const need = Math.ceil(total * 0.75)
  return `Get ${need} of ${total} right for the next star.`
}

/** FAKE XP rule for now: 5 per right answer + 10 for finishing. */
export const xpFor = (right: number) => right * 5 + 10

/** Ollie says the difficulty decision in plain words. */
export function decisionLine(decision: Decision, right: number, total: number): string {
  if (decision.change === 'up') return `You got ${right} of ${total}, so your next round will be a little harder.`
  if (decision.change === 'down') return 'Let’s practice with easier ones next time.'
  return 'Let’s keep going at this level.'
}

/** Dev only: log what the engine decided. */
export function logLevel(what: string, detail: unknown) {
  if (import.meta.env.DEV) console.info(`[difficulty] ${what}`, detail)
}
