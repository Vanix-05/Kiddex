// A Quiz Show round as plain data, changed only by these pure functions.
import type { QuestionCard } from '../../content/questionCard'
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
  /** When it appeared, and how long the answer took. */
  shownAt: number
  ms: number
}

export interface QuizRound {
  /** Cards not asked yet. */
  pool: QuestionCard[]
  total: number
  startLevel: Level
  /** The level for the next card (changes every 4 answers). */
  level: Level
  asked: QuizQuestion[]
  startedAt: number
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
export const isRight = (card: QuestionCard, choice: string) => norm(card.answer) === norm(choice)

function ask(round: QuizRound, now: number, random: () => number): QuizRound {
  const card = nextCard(round.pool, round.level, random)
  if (!card) return round
  logLevel(`question ${round.asked.length + 1}: a ${card.level} card (level ${round.level})`, card.prompt)
  const question: QuizQuestion = { card, choices: shuffle(card.choices, random), level: card.level, picked: null, right: null, shownAt: now, ms: 0 }
  return { ...round, pool: round.pool.filter((c) => c !== card), asked: [...round.asked, question] }
}

/** A new round: up to 8 cards (fewer if the lesson has fewer), the first one asked. */
export function startQuiz(cards: readonly QuestionCard[], level: Level, now: number, random = Math.random): QuizRound {
  const total = Math.min(GAMES['quiz-show'].roundSize, cards.length)
  return ask({ pool: [...cards], total, startLevel: level, level, asked: [], startedAt: now }, now, random)
}

export const current = (round: QuizRound) => round.asked[round.asked.length - 1]

/** The Student picks a choice: right or wrong, and every 4 answers the level may change. */
export function answer(round: QuizRound, choice: string, now: number): QuizRound {
  const q = current(round)
  if (!q || q.picked !== null) return round
  const right = isRight(q.card, choice)
  const asked = [...round.asked.slice(0, -1), { ...q, picked: choice, right, ms: Math.max(0, now - q.shownAt) }]
  const decision = decideDuringRound(
    asked.map((a) => !!a.right),
    round.level,
  )
  if (decision) logLevel(`after ${asked.length} answers: ${decision.change} -> ${decision.level}`, decision.reason)
  return { ...round, asked, level: decision?.level ?? round.level }
}

/** True when every question of the round has been answered. */
export const finished = (round: QuizRound) => round.asked.length >= round.total && current(round)?.picked != null

/** The next question (call after Next / Got it). */
export function next(round: QuizRound, now: number, random = Math.random): QuizRound {
  if (round.asked.length >= round.total) return round
  return ask(round, now, random)
}

export const records = (round: QuizRound): AnswerRecord[] =>
  round.asked.map((q) => ({ cardId: q.card.id, level: q.level, right: !!q.right, tries: 1, ms: q.ms }))

/** Dev screens: a round played up to question 4 with answers right, right, wrong (then `last`). */
export function demoQuiz(cards: readonly QuestionCard[], level: Level, last: 'question' | 'right' | 'wrong' | 'results', now: number) {
  let r = startQuiz(cards, level, now)
  const play = (rightAnswer: boolean) => {
    const q = current(r)
    const wrong = q.choices.find((c) => !isRight(q.card, c)) ?? q.choices[0]
    r = answer(r, rightAnswer ? q.card.answer : wrong, now + 4000)
  }
  if (last === 'results') {
    // 7 of 8 right: only the first one wrong.
    for (let i = 0; i < r.total; i++) {
      play(i !== 0)
      if (i < r.total - 1) r = next(r, now)
    }
    return r
  }
  for (const ok of [true, true, false]) {
    play(ok)
    r = next(r, now)
  }
  if (last === 'right') play(true)
  if (last === 'wrong') play(false)
  return r
}
