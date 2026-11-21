// A Quiz Show round as plain data, changed only by these pure functions.
// Fill the Blank plays the same round (one card at a time, pick one of the
// choices); only its round size and its Buddy Help differ (see fill-blank/blankRound.ts).
import type { QuestionCard } from '../../content/questionCard'
import { afterAnswer, canSpend, spendHelp, startHelp, type HelpEvent, type HelpState } from '../buddyHelp'
import { decideDuringRound, nextCard } from '../difficulty'
import { GAMES, logLevel, shuffle } from '../session'
import type { AnswerRecord, Level } from '../types'

export interface QuizQuestion {
  card: QuestionCard
  /** The card's choices, shuffled for this question. */
  choices: string[]
  /** The level the card was asked at. */
  level: Level
  picked: string | null
  right: boolean | null
  /** Buddy Help (Quiz Show): the wrong choice the buddy knocked away (it can't be picked). */
  removed: string | null
  /** Buddy Help (Fill the Blank): the buddy whispered the first letter. */
  hinted: boolean
  /** When it appeared, and how long the answer took. */
  shownAt: number
  ms: number
}

/** The games that play this kind of round. */
export type QuizGame = 'quiz-show' | 'fill-blank'

export interface QuizRound {
  /** Which game: sets the round size and what Buddy Help does. */
  game: QuizGame
  /** Cards not asked yet. */
  pool: QuestionCard[]
  total: number
  startLevel: Level
  /** The level for the next card (changes every 4 answers). */
  level: Level
  asked: QuizQuestion[]
  startedAt: number
  /** Buddy Help: helps held, the streak, helps used (see buddyHelp.ts). */
  help: HelpState
  /** What the last answer did to the helps (a new help earned…), until the next question. */
  helpEvent: HelpEvent
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
export const isRight = (card: QuestionCard, choice: string) => norm(card.answer) === norm(choice)

function ask(round: QuizRound, now: number, random: () => number): QuizRound {
  const card = nextCard(round.pool, round.level, random)
  if (!card) return round
  logLevel(`question ${round.asked.length + 1}: a ${card.level} card (level ${round.level})`, card.prompt)
  const question: QuizQuestion = { card, choices: shuffle(card.choices, random), level: card.level, picked: null, right: null, removed: null, hinted: false, shownAt: now, ms: 0 }
  return { ...round, pool: round.pool.filter((c) => c !== card), asked: [...round.asked, question], helpEvent: null }
}

/** A new round: up to the game's round size (fewer if the lesson has fewer cards), the first one asked. */
export function startQuiz(cards: readonly QuestionCard[], level: Level, now: number, random = Math.random, game: QuizGame = 'quiz-show'): QuizRound {
  const total = Math.min(GAMES[game].roundSize, cards.length)
  return ask({ game, pool: [...cards], total, startLevel: level, level, asked: [], startedAt: now, help: startHelp(), helpEvent: null }, now, random)
}

export const current = (round: QuizRound) => round.asked[round.asked.length - 1]

/** Was this question answered with the buddy's help? */
export const wasHelped = (q: QuizQuestion) => q.removed !== null || q.hinted

/**
 * Can the buddy help on the current question? Once per question, only before
 * it's answered. Quiz Show: only while knocking one away leaves at least 2
 * choices. Fill the Blank: the first-letter hint always works.
 */
export function helpBlocked(round: QuizRound): 'none-left' | 'used' | 'two-choices' | 'answered' | null {
  const q = current(round)
  if (!q || q.picked !== null) return 'answered'
  if (wasHelped(q)) return 'used'
  if (round.game === 'quiz-show' && q.choices.length <= 2) return 'two-choices'
  if (!canSpend(round.help)) return 'none-left'
  return null
}

/**
 * Buddy Help, and the help is spent. Quiz Show: one random wrong choice is
 * knocked away. Fill the Blank: the buddy whispers the answer's first letter.
 */
export function takeBuddyHelp(round: QuizRound, random = Math.random): QuizRound {
  if (helpBlocked(round)) return round
  const q = current(round)
  if (round.game === 'fill-blank') {
    return { ...round, help: spendHelp(round.help), asked: [...round.asked.slice(0, -1), { ...q, hinted: true }] }
  }
  const wrong = q.choices.filter((c) => !isRight(q.card, c))
  if (!wrong.length) return round
  const removed = wrong[Math.floor(random() * wrong.length)]
  return { ...round, help: spendHelp(round.help), asked: [...round.asked.slice(0, -1), { ...q, removed }] }
}

/** The Student picks a choice: right or wrong, and every 4 answers the level may change. */
export function answer(round: QuizRound, choice: string, now: number): QuizRound {
  const q = current(round)
  if (!q || q.picked !== null || choice === q.removed) return round
  const right = isRight(q.card, choice)
  const asked = [...round.asked.slice(0, -1), { ...q, picked: choice, right, ms: Math.max(0, now - q.shownAt) }]
  // A helped answer counts as not right for the level (difficulty.ts rule 6).
  const decision = decideDuringRound(
    asked.map((a) => ({ right: !!a.right, helped: wasHelped(a) })),
    round.level,
  )
  if (decision) logLevel(`after ${asked.length} answers: ${decision.change} -> ${decision.level}`, decision.reason)
  const { state: help, event: helpEvent } = afterAnswer(round.help, right, wasHelped(q))
  return { ...round, asked, level: decision?.level ?? round.level, help, helpEvent }
}

/** True when every question of the round has been answered. */
export const finished = (round: QuizRound) => round.asked.length >= round.total && current(round)?.picked != null

/** The next question (call after Next / Got it). */
export function next(round: QuizRound, now: number, random = Math.random): QuizRound {
  if (round.asked.length >= round.total) return round
  return ask(round, now, random)
}

export const records = (round: QuizRound): AnswerRecord[] =>
  round.asked.map((q) => ({ cardId: q.card.id, level: q.level, right: !!q.right, tries: 1, ms: q.ms, helped: wasHelped(q) }))

export type QuizDemo = 'question' | 'right' | 'wrong' | 'results' | 'help-ready' | 'help-used' | 'help-earned' | 'help-none'

/**
 * Dev screens. Most are question 4 after right, right, wrong (then `last`).
 * help-used: Buddy Help used on question 4. help-earned: 3 right in a row,
 * a new help just earned. help-none: help used on question 1, so 0 left.
 * results: 7 of 8 right, one of them with help.
 */
export function demoQuiz(cards: readonly QuestionCard[], level: Level, last: QuizDemo, now: number, game: QuizGame = 'quiz-show') {
  let r = startQuiz(cards, level, now, Math.random, game)
  const play = (rightAnswer: boolean) => {
    const q = current(r)
    const wrong = q.choices.find((c) => !isRight(q.card, c) && c !== q.removed) ?? q.choices[0]
    r = answer(r, rightAnswer ? q.card.answer : wrong, now + 4000)
  }
  // Always the first wrong choice, so the dev screen looks the same each time.
  const help = () => (r = takeBuddyHelp(r, () => 0))
  if (last === 'results') {
    // 7 of 8 right: only the first one wrong, the second one helped.
    for (let i = 0; i < r.total; i++) {
      if (i === 1) help()
      play(i !== 0)
      if (i < r.total - 1) r = next(r, now)
    }
    return r
  }
  if (last === 'help-earned') {
    for (let i = 0; i < 3; i++) {
      play(true)
      if (i < 2) r = next(r, now)
    }
    return r
  }
  if (last === 'help-none') help()
  for (const ok of [true, true, false]) {
    play(ok)
    r = next(r, now)
  }
  if (last === 'right') play(true)
  if (last === 'wrong') play(false)
  if (last === 'help-used') help()
  return r
}
