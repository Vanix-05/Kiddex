import { useMemo } from 'react'
import { useLobbyData } from '../../screens/Lobby/useLobbyData'
import { studentLessons, type StudentLesson } from '../lessonCards'
import { MISSION_GAMES } from '../mission'
import type { GameId } from '../types'
import { useGameProgress } from '../useGameProgress'

/** Today's mission, as the All games banner shows it. */
export interface GamesMission {
  lessonId: string
  lessonName: string
  teacher: string
  subject: string
  due: string
  /** XP for finishing every mission game. */
  xp: number
  /** The mission games, in order. */
  games: GameId[]
  /** The ones finished today. */
  done: GameId[]
}

export interface AllGamesData {
  /** The Student's stars (the same as the Lobby's). */
  stars: number
  /** null: the Teacher assigned nothing today. */
  mission: GamesMission | null
  /** The Student's lessons, newest first. */
  lessons: readonly StudentLesson[]
  /** Best stars ever in a game with a lesson (0 = never finished). */
  bestStars: (game: GameId, lessonId: string) => number
}

/**
 * Everything the All games page shows. FAKE for now, from the same hooks as
 * the Lobby (useLobbyData: stars and the mission with its games done today)
 * and the games (useGameProgress, lessonCards.ts), so they always agree.
 * Replace the insides with the API later; the page only uses this hook.
 */
export function useAllGames(): AllGamesData {
  const { student, mission } = useLobbyData()
  const { bestStars } = useGameProgress()

  return useMemo(() => {
    const games = MISSION_GAMES.slice(0, mission.games)
    return {
      stars: student.stars,
      mission:
        games.length === 0
          ? null
          : {
              lessonId: mission.lessonId,
              lessonName: mission.title,
              teacher: mission.teacher,
              subject: mission.subject,
              due: mission.due,
              xp: mission.xp,
              games,
              done: mission.done,
            },
      lessons: [...studentLessons].sort((a, b) => b.added.localeCompare(a.added)),
      bestStars,
    }
  }, [student.stars, mission, bestStars])
}
