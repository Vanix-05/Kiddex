// A Match Up round as plain data, changed only by these pure functions.
import type { QuestionCard } from '../../content/questionCard'
import { afterAnswer, canSpend, spendHelp, startHelp, type HelpEvent, type HelpState } from '../buddyHelp'
import { pickCards } from '../difficulty'
import { GAMES, logLevel, newRoundId, shuffle } from '../session'
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
  /** The round's id (clientRoundId), made when it starts. */
  id: string
  startLevel: Level
  startedAt: number
  lastTieAt: number
  /** Buddy Help: helps held, the streak (pairs tied on the first try), helps used. */
  help: HelpState
  /** Card ids the buddy helped with: their partner glows while the card is picked. */
  helped: string[]
  /** What the last try did to the helps (a new help earned…), until the next pick. */
  helpEvent: HelpEvent
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
  return { id: newRoundId(), cards: picked, left, right, tied: [], tries: {}, ms: {}, picked: null, miss: null, startLevel: level, startedAt: now, lastTieAt: now, help: startHelp(), helped: [], helpEvent: null }
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
  // The Buddy Help streak counts pairs tied on the first try; a helped pair doesn't count, a miss resets it.
  const tied = leftId === rightId
  const { state: help, event: helpEvent } = afterAnswer(r.help, tied && tries[from] === 1, r.helped.includes(from))
  if (tied) {
    return { ...r, tries, tied: [...r.tied, leftId], ms: { ...r.ms, [leftId]: now - r.lastTieAt }, picked: null, lastTieAt: now, help, helpEvent }
  }
  return { ...r, tries, picked: null, miss: { left: leftId, right: rightId }, help, helpEvent }
}

/** A tap on a card: pick it, drop it (tap again), switch sides' pick, or try a pair. */
export function tap(r: MatchRound, side: Side, id: string, now: number): MatchRound {
  if (r.miss || isTied(r, id)) return r
  const p = r.picked
  if (!p) return { ...r, picked: { side, id }, helpEvent: null }
  if (p.side === side) return { ...r, picked: p.id === id ? null : { side, id }, helpEvent: null }
  return side === 'left' ? tryPair(r, id, p.id, p.id, now) : tryPair(r, p.id, id, p.id, now)
}

/**
 * Can the buddy help now? Only with a card picked, once per picked card, and
 * with a help left.
 */
export function matchHelpBlocked(r: MatchRound): 'no-pick' | 'used' | 'none-left' | null {
  if (!r.picked || r.miss) return 'no-pick'
  if (r.helped.includes(r.picked.id)) return 'used'
  if (!canSpend(r.help)) return 'none-left'
  return null
}

/** Buddy Help: the picked card's partner glows (the Student still ties it). */
export function takeMatchHelp(r: MatchRound): MatchRound {
  if (matchHelpBlocked(r) || !r.picked) return r
  return { ...r, help: spendHelp(r.help), helped: [...r.helped, r.picked.id] }
}

/** After Okay: both cards go back to normal. */
export const clearMiss = (r: MatchRound): MatchRound => ({ ...r, miss: null })

export const records = (r: MatchRound): AnswerRecord[] =>
  r.cards.map((c) => ({ cardId: c.id, level: c.level, right: (r.tries[c.id] ?? 0) === 1 && isTied(r, c.id), tries: r.tries[c.id] ?? 0, ms: r.ms[c.id] ?? 0, helped: r.helped.includes(c.id) }))

/** Dev screens: 2 pairs tied, then one card picked, a wrong pair on show, or a card picked with Buddy Help used. */
export function demoMatch(cards: readonly QuestionCard[], level: Level, at: 'picked' | 'miss' | 'help' | 'play', now: number) {
  let r = startMatch(cards, level, now)
  for (const id of r.left.slice(0, 2)) r = tryPair(r, id, id, id, now)
  const [a, b] = r.left.filter((id) => !isTied(r, id))
  if (at === 'picked' || at === 'help') r = tap(r, 'left', a, now)
  if (at === 'help') r = takeMatchHelp(r)
  if (at === 'miss') r = tryPair(r, a, b, a, now)
  return r
}
