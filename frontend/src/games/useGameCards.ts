import { useMemo } from 'react'
import type { QuestionCard } from '../content/questionCard'
import { equivalentFractionsCards, fakeGameLessons, fakeQuestionCards, mixedCards, partsCards } from '../mock/questionCards'
import { hasEnough, playableCards } from './session'
import type { GameId, GameLesson } from './types'

// FAKE for now: every card comes from src/mock/questionCards.ts. Replace the
// insides with the API later; the games only use this hook.
const ALL_CARDS: readonly QuestionCard[] = [...fakeQuestionCards, ...mixedCards, ...partsCards, ...equivalentFractionsCards]
const cardsOf = (lessonId: string) => ALL_CARDS.filter((c) => c.lessonId === lessonId)

/**
 * The approved cards of a lesson for one game. `lessonId` from ?lesson=;
 * without it (or if that lesson hasn't enough cards), the first lesson that
 * has enough. `lesson` is undefined when no lesson can play this game.
 */
export function useGameCards(gameId: GameId, lessonId: string | null) {
  return useMemo(() => {
    const ok = (id: string) => hasEnough(cardsOf(id), gameId)
    const lesson: GameLesson | undefined =
      fakeGameLessons.find((l) => l.id === lessonId && ok(l.id)) ?? fakeGameLessons.find((l) => ok(l.id))
    const cards = lesson ? playableCards(cardsOf(lesson.id), gameId) : []
    /** Can this lesson also play `other` (for "Next game")? */
    const lessonCanPlay = (other: GameId) => !!lesson && hasEnough(cardsOf(lesson.id), other)
    return { lesson, cards, lessonCanPlay }
  }, [gameId, lessonId])
}
