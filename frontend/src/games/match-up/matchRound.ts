// A Match Up round as plain data, changed only by these pure functions.
import type { QuestionCard } from '../../content/questionCard'
import { pickCards } from '../difficulty'
import { GAMES, logLevel, shuffle } from '../session'
import type { AnswerRecord, Level } from '../types'

export type Side = 'left' | 'right'

export interface MatchRound {
  /** The pairs in this round (each card = one pair: prompt left, answer right). */
  cards: QuestionCard[]
  /** Card ids, top to bottom: the left column (prompts) and the right column (answers), in different orders. */
  left: string[]
  right: string[]
  /** Tied card ids, in the order they were tied (each gets the next pair color). */
  tied: string[]
  /** Tries per card. A pair is right only if tied on the first try. */
  tries: Record<string, number>
  /** How long each pair took (from the previous tie, or the start). */
  ms: Record<string, number>
  picked: { side: Side; id: string } | null
  /** A wrong pair on show: left card id, right card id. */
  miss: { left: string; right: string } | null
  startLevel: Level
  startedAt: number
  lastTieAt: number
}

/** A new round: 5 pairs (4 if the lesson only has 4), current level first, both columns shuffled. */
export function startMatch(cards: readonly QuestionCard[], level: Level, now: number, random = Math.random): MatchRound {
  const count = Math.min(GAMES['match-up'].roundSize, cards.length)
  const picked = pickCards(cards, level, count, random)
  logLevel(`match up: ${picked.length} pairs at level ${level}`, picked.map((c) => `${c.level}: ${c.prompt}`))
  const left = shuffle(picked.map((c) => c.id), random)
  let right = shuffle(left, random)
  // A different order on each side (when there's a choice).
  for (let i = 0; i < 5 && right.every((id, j) => id === left[j]); i++) right = shuffle(left, random)
  return { cards: picked, left, right, tied: [], tries: {}, ms: {}, picked: null, miss: null, startLevel: level, startedAt: now, lastTieAt: now }
}

export const isTied = (r: MatchRound, id: string) => r.tied.includes(id)
export const done = (r: MatchRound) => r.tied.length === r.cards.length
export const cardOf = (r: MatchRound, id: string) => r.cards.find((c) => c.id === id)

/**
 * Tries a pair: `from` is the card picked first (its pair gets the try).
 * The same card on both sides = tied; otherwise a miss shows until Okay.
 */
export function tryPair(r: MatchRound, leftId: string, rightId: string, from: string, now: number): MatchRound {
  if (r.miss || isTied(r, leftId) || isTied(r, rightId)) return r
  const tries = { ...r.tries, [from]: (r.tries[from] ?? 0) + 1 }
  if (leftId === rightId) {
    return { ...r, tries, tied: [...r.tied, leftId], ms: { ...r.ms, [leftId]: now - r.lastTieAt }, picked: null, lastTieAt: now }
  }
  return { ...r, tries, picked: null, miss: { left: leftId, right: rightId } }
}

/** A tap on a card: pick it, drop it (tap again), switch sides' pick, or try a pair. */
export function tap(r: MatchRound, side: Side, id: string, now: number): MatchRound {
  if (r.miss || isTied(r, id)) return r
  const p = r.picked
  if (!p) return { ...r, picked: { side, id } }
  if (p.side === side) return { ...r, picked: p.id === id ? null : { side, id } }
  return side === 'left' ? tryPair(r, id, p.id, p.id, now) : tryPair(r, p.id, id, p.id, now)
}

/** After Okay: both cards go back to normal. */
export const clearMiss = (r: MatchRound): MatchRound => ({ ...r, miss: null })

export const records = (r: MatchRound): AnswerRecord[] =>
  r.cards.map((c) => ({ cardId: c.id, level: c.level, right: (r.tries[c.id] ?? 0) === 1 && isTied(r, c.id), tries: r.tries[c.id] ?? 0, ms: r.ms[c.id] ?? 0 }))

/** Dev screens: 2 pairs tied, then one card picked, or a wrong pair on show. */
export function demoMatch(cards: readonly QuestionCard[], level: Level, at: 'picked' | 'miss' | 'play', now: number) {
  let r = startMatch(cards, level, now)
  for (const id of r.left.slice(0, 2)) r = tryPair(r, id, id, id, now)
  const [a, b] = r.left.filter((id) => !isTied(r, id))
  if (at === 'picked') r = tap(r, 'left', a, now)
  if (at === 'miss') r = tryPair(r, a, b, a, now)
  return r
}
