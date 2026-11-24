// Building rounds and scoring them: shared by every mini game. Pure functions.
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type QuestionCard } from '../content/questionCard'
import type { Decision } from './difficulty'
import { starsFor } from './stars'
import type { AnswerRecord, GameId, GameResult } from './types'

/** Each game's name, its card type and its round size. */
export const GAMES: Record<GameId, { name: string; type: QuestionCard['type']; roundSize: number; built: boolean }> = {
  'quiz-show': { name: 'Quiz Show', type: 'multiple_choice', roundSize: 8, built: true },
  'match-up': { name: 'Match Up', type: 'matching_pair', roundSize: 5, built: true },
  'fill-blank': { name: 'Fill the Blank', type: 'fill_blank', roundSize: 8, built: true },
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

/**
 * A new round id (a random UUID), made when a round starts. crypto.randomUUID only
 * works on https or localhost, so a phone on the school network gets the same kind
 * of id from crypto.getRandomValues.
 */
export function newRoundId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** The finished round's record. `roundId`: the id the round got when it started. */
export function makeResult(
  roundId: string,
  gameId: GameId,
  lessonId: string,
  topic: string,
  startedAt: number,
  endedAt: number,
  answers: AnswerRecord[],
  helpsUsed: number,
): GameResult {
  return { clientRoundId: roundId, gameId, lessonId, topic, startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), answers, helpsUsed }
}

// ---------- Scoring ----------

export { starsFor }

/** One helpful line under the title: how to get the next star. */
export function nextStarLine(right: number, total: number): string {
  const stars = starsFor(right, total)
  if (stars === 3) return 'Perfect round!'
  if (stars === 2) return 'One more star if you get them all right.'
  const need = Math.ceil(total * 0.75)
  return `Get ${need} of ${total} right for the next star.`
}

/** FAKE XP rule for now: 5 per right answer (2 if the buddy helped) + 10 for finishing. */
export const xpFor = (right: number, helpedRight = 0) => (right - helpedRight) * 5 + helpedRight * 2 + 10

/** The buddy says the difficulty decision in plain words (on Results). */
export function decisionLine(decision: Decision, right: number, total: number): string {
  if (decision.change === 'up') return `You got ${right} of ${total}, so your next round will be a little harder.`
  if (decision.change === 'down') return 'Let’s practice with easier ones next time.'
  return 'Let’s keep going at this level.'
}

/** Dev only: log what the engine decided. */
export function logLevel(what: string, detail: unknown) {
  if (import.meta.env.DEV) console.info(`[difficulty] ${what}`, detail)
}
