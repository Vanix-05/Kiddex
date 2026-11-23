// Fill the Blank: the round is Quiz Show's (quiz-show/quizRound.ts) with its own
// round size and Buddy Help (the first letter). These are its own pure parts:
// the sentence split at ___, the hint and the words for screen readers.
import type { QuestionCard } from '../../content/questionCard'
import { demoQuiz, startQuiz, type QuizDemo } from '../quiz-show/quizRound'
import type { Level } from '../types'

/** A new Fill the Blank round (the same card picking and level rules as Quiz Show). */
export const startBlank = (cards: readonly QuestionCard[], level: Level, now: number, random = Math.random) =>
  startQuiz(cards, level, now, random, 'fill-blank')

/** The dev screens, played out like Quiz Show's. */
export const demoBlank = (cards: readonly QuestionCard[], level: Level, last: QuizDemo, now: number) =>
  demoQuiz(cards, level, last, now, 'fill-blank')

/** Three or more underscores: the blank. */
const BLANK = /_{3,}/

/**
 * A sentence split at its blank, so the slot keeps the word before it and the
 * punctuation after it on the same line (no lonely "." on a new line):
 * `lead` + [`joinBefore` + slot + `joinAfter`] + `rest`, the bracket kept unbroken.
 * No blank: the whole sentence is `lead` and `hasBlank` is false.
 */
export interface PromptParts {
  hasBlank: boolean
  /** Everything before the word that touches the slot. */
  lead: string
  /** The word right before the slot, with its space ("the "), or "" at the start. */
  joinBefore: string
  /** What sticks to the slot after it, up to the next space (".", "s.", "?"), or "". */
  joinAfter: string
  /** The rest of the sentence after that. */
  rest: string
}

export function splitPrompt(prompt: string): PromptParts {
  const match = BLANK.exec(prompt)
  if (!match) return { hasBlank: false, lead: prompt, joinBefore: '', joinAfter: '', rest: '' }
  const before = prompt.slice(0, match.index)
  const after = prompt.slice(match.index + match[0].length)
  // The last word before the blank and its spaces ("called the " -> "called " + "the ").
  const word = /\S*\s*$/.exec(before)?.[0] ?? ''
  const stick = /^\S*/.exec(after)?.[0] ?? ''
  return {
    hasBlank: true,
    lead: before.slice(0, before.length - word.length),
    joinBefore: word,
    joinAfter: stick,
    rest: after.slice(stick.length),
  }
}

/** The sentence as a screen reader says it: "blank" where the ___ is. */
export const spokenPrompt = (prompt: string) => prompt.replace(/_{3,}/g, 'blank')

/** The answer's first letter (or digit), as the buddy whispers it. */
export function firstLetter(answer: string): string {
  const first = /[\p{L}\p{N}]/u.exec(answer)?.[0]
  return first ?? answer.trim().charAt(0)
}

/** What the slot shows after Buddy Help: the first letter and "…", never the word's length. */
export const letterHint = (answer: string) => `${firstLetter(answer)}…`

/** The buddy's line after Buddy Help. */
export const hintLine = (answer: string) => `Psst… it starts with ${firstLetter(answer)}! Now you pick.`

/** Long words get a smaller size so they stay inside their tile (and the slot). */
export function wordSize(word: string): 'normal' | 'small' | 'smaller' {
  const n = [...word].length
  if (n <= 11) return 'normal'
  if (n <= 15) return 'small'
  return 'smaller'
}
