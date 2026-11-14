import { useMemo } from 'react'
import { cardsOf, studentLessons } from './lessonCards'
import { hasEnough, playableCards } from './session'
import type { GameId, GameLesson } from './types'

/**
 * The approved cards of a lesson for one game. `lessonId` from ?lesson=;
 * without it (or if that lesson hasn't enough cards), the first lesson that
 * has enough. `lesson` is undefined when no lesson can play this game.
 */
export function useGameCards(gameId: GameId, lessonId: string | null) {
  return useMemo(() => {
    const ok = (id: string) => hasEnough(cardsOf(id), gameId)
    const found = studentLessons.find((l) => l.id === lessonId && ok(l.id)) ?? studentLessons.find((l) => ok(l.id))
    const lesson: GameLesson | undefined = found && { id: found.id, name: found.name, teacher: found.teacher, subject: found.subject }
    const cards = lesson ? playableCards(cardsOf(lesson.id), gameId) : []
    /** Can this lesson also play `other` (for "Next game")? */
    const lessonCanPlay = (other: GameId) => !!lesson && hasEnough(cardsOf(lesson.id), other)
    return { lesson, cards, lessonCanPlay }
  }, [gameId, lessonId])
}
