import type { QuestionCard } from '../content/questionCard'
import { comparingCards, equivalentFractionsCards, fakeGameLessons, fakeQuestionCards, mixedCards, partsCards } from '../mock/questionCards'

// FAKE for now: every card and lesson comes from src/mock/questionCards.ts.
// Replace the insides with the API later; useGameCards, canPlay (catalog.ts)
// and useAllGames only use these.

const ALL_CARDS: readonly QuestionCard[] = [...fakeQuestionCards, ...mixedCards, ...partsCards, ...equivalentFractionsCards, ...comparingCards]

/** Every card of a lesson (drafts too: the games keep only approved ones). */
export const cardsOf = (lessonId: string) => ALL_CARDS.filter((c) => c.lessonId === lessonId)

/** A lesson the Student can play games with (approved by their Teacher). */
export interface StudentLesson {
  id: string
  name: string
  teacher: string
  subject: string
  /** When the Teacher gave it to the class ("2026-11-10"). */
  added: string
}

/** The Student's lessons, in the games' default order. */
export const studentLessons: readonly StudentLesson[] = fakeGameLessons
