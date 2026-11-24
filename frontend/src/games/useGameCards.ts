import { useMemo } from 'react'
import { playableCards } from './session'
import { isPlayable, type PlayLesson } from './studentData'
import type { GameId, GameLesson } from './types'

/** The lesson `lessonId` if it can play the game; else the first (newest) lesson that can. */
export const pickLesson = (lessons: readonly PlayLesson[], gameId: GameId, lessonId: string | null) =>
  lessons.find((l) => l.id === lessonId && isPlayable(l, gameId)) ?? lessons.find((l) => isPlayable(l, gameId))

/**
 * The approved cards of a lesson for one game. `lessons`: the Student's (from
 * GET /api/student/games), or the dev pages' samples. `lessonId` from ?lesson=.
 * A game is offered only when the lesson's game is `playable`. `lesson` is undefined
 * when no lesson can play this game.
 */
export function useGameCards(gameId: GameId, lessonId: string | null, lessons: readonly PlayLesson[]) {
  return useMemo(() => {
    const found = pickLesson(lessons, gameId, lessonId)
    // The frame says "From Ms. Cruz · Math" and the pack name.
    const lesson: GameLesson | undefined = found && { id: found.id, name: found.name, teacher: found.teacher, subject: found.subject }
    const cards = found ? playableCards(found.cards, gameId) : []
    /** Can this lesson also play `other` (for "Next game")? */
    const lessonCanPlay = (other: GameId) => isPlayable(found, other)
    return { lesson, cards, lessonCanPlay }
  }, [gameId, lessonId, lessons])
}
