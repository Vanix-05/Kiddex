/**
 * KIDDEX difficulty engine: rule-based, not AI. Pure functions, no React.
 *
 * The rules
 * 1. Each Student has a level per topic: easy, medium or hard. Everyone starts on easy.
 * 2. Picking cards: cards at the current level first. When there aren't
 *    enough, the nearest level fills in:
 *      easy   -> easy, then medium, then hard
 *      medium -> medium, then easy, then hard (the easier neighbor first)
 *      hard   -> hard, then medium, then easy
 * 3. During a round: after every 4 answers, look at those 4.
 *      4 or 3 right -> one level up for the next cards
 *      1 or 0 right -> one level down
 *      2 right      -> keep
 * 4. End of the round: compared with the level the round started at,
 *      80% or more right -> one level up for the next round
 *      under 50% right   -> one level down
 *      otherwise         -> keep
 * 5. Easy never goes lower and hard never goes higher: the change is then "keep".
 *
 * Every decision says why, e.g. { level: 'medium', change: 'up', reason: '7 of 8 right (88%)' }.
 */
import type { Level } from './types'

export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard']
export const START_LEVEL: Level = 'easy'

export type Change = 'up' | 'down' | 'keep'

export interface Decision {
  level: Level
  change: Change
  reason: string
}

/** One level up or down, staying inside easy..hard. */
export function stepLevel(level: Level, change: Change): Level {
  const i = LEVELS.indexOf(level)
  if (change === 'up') return LEVELS[Math.min(i + 1, LEVELS.length - 1)]
  if (change === 'down') return LEVELS[Math.max(i - 1, 0)]
  return level
}

/** Rule 2: the order levels are tried in, starting from `level`. */
export function levelOrder(level: Level): Level[] {
  if (level === 'easy') return ['easy', 'medium', 'hard']
  if (level === 'medium') return ['medium', 'easy', 'hard']
  return ['hard', 'medium', 'easy']
}

/** A decision; a move past easy or hard becomes "keep" (rule 5). */
function decide(level: Level, wanted: Change, reason: string): Decision {
  const next = stepLevel(level, wanted)
  if (next === level && wanted !== 'keep') {
    return { level, change: 'keep', reason: `${reason}, already ${level === 'hard' ? 'the hardest' : 'the easiest'} level` }
  }
  return { level: next, change: wanted, reason }
}

/** "3 of 4 right" */
const rightOf = (answers: readonly boolean[]) => `${answers.filter(Boolean).length} of ${answers.length} right`

/** Rule 3: a decision on 4 answers. */
export function decideAfterFour(lastFour: readonly boolean[], level: Level): Decision {
  const right = lastFour.filter(Boolean).length
  const wanted: Change = right >= 3 ? 'up' : right <= 1 ? 'down' : 'keep'
  return decide(level, wanted, rightOf(lastFour))
}

/**
 * Rule 3 during a round: after each answer. Returns a decision when the
 * answers count reaches 4, 8, 12, …, else null (no change yet).
 */
export function decideDuringRound(answers: readonly boolean[], level: Level): Decision | null {
  if (answers.length === 0 || answers.length % 4 !== 0) return null
  return decideAfterFour(answers.slice(-4), level)
}

/** Rule 4: the next round's level, from the level this round started at. */
export function decideAfterRound(answers: readonly boolean[], startLevel: Level): Decision {
  if (answers.length === 0) return { level: startLevel, change: 'keep', reason: 'no answers' }
  const share = answers.filter(Boolean).length / answers.length
  const reason = `${rightOf(answers)} (${Math.round(share * 100)}%)`
  const wanted: Change = share >= 0.8 ? 'up' : share < 0.5 ? 'down' : 'keep'
  return decide(startLevel, wanted, reason)
}

/**
 * Rule 2: the next card from `pool`, at `level` or the nearest level.
 * `random` picks among the cards of that level (Math.random by default).
 */
export function nextCard<T extends { level: Level }>(pool: readonly T[], level: Level, random = Math.random): T | undefined {
  for (const l of levelOrder(level)) {
    const here = pool.filter((c) => c.level === l)
    if (here.length) return here[Math.floor(random() * here.length)]
  }
  return undefined
}

/** Rule 2 for a whole round at once (Match Up): `count` cards, current level first. */
export function pickCards<T extends { level: Level }>(cards: readonly T[], level: Level, count: number, random = Math.random): T[] {
  const pool = [...cards]
  const picked: T[] = []
  while (picked.length < count) {
    const card = nextCard(pool, level, random)
    if (!card) break
    picked.push(card)
    pool.splice(pool.indexOf(card), 1)
  }
  return picked
}
