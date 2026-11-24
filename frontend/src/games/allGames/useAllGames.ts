import { useMemo } from 'react'
import { toPlayLessons, type PlayLesson } from '../studentData'
import type { StudentGames } from '../studentGames'
import type { GameId } from '../types'
import { useStudentGames } from '../useStudentGames'

/** Today's mission, as the All games banner shows it. */
export interface GamesMission {
  lessonId: string
  /** The pack name. */
  lessonName: string
  teacher: string
  subject: string
  /** "2026-11-27", or null. */
  dueDate: string | null
  /** The most XP the mission games give. */
  maxXp: number
  /** The mission games, in order. */
  games: GameId[]
  /** The ones finished. */
  done: GameId[]
}

export interface AllGamesData {
  /** The Student's stars (the same as the Lobby's). */
  stars: number
  /** null: no mission right now. */
  mission: GamesMission | null
  /** The Student's lessons, newest first. Empty: the Teacher hasn't given the class one yet. */
  lessons: readonly PlayLesson[]
  /** Best stars ever in a game with a lesson (0 = never finished). */
  bestStars: (game: GameId, lessonId: string) => number
}

/** All games' data from the Student's games data (pure). */
export function allGamesFrom(data: StudentGames): AllGamesData {
  const lessons = toPlayLessons(data)
  const m = data.mission
  const missionLesson = m ? data.lessons.find((l) => l.assignmentId === m.assignmentId) : undefined
  return {
    stars: data.progress.stars,
    mission:
      m && missionLesson
        ? {
            lessonId: missionLesson.lessonId,
            lessonName: missionLesson.name,
            teacher: missionLesson.teacher,
            subject: missionLesson.subject ?? '',
            dueDate: missionLesson.dueDate,
            maxXp: m.maxXp,
            games: m.games,
            done: m.done,
          }
        : null,
    lessons,
    bestStars: (game, lessonId) => lessons.find((l) => l.id === lessonId)?.games.find((g) => g.id === game)?.bestStars ?? 0,
  }
}

/**
 * Everything the All games page shows, from the same data as the Lobby and the
 * games (GET /api/student/games), so they always agree. `data` is null while loading.
 */
export function useAllGames() {
  const query = useStudentGames()
  const data = useMemo(() => (query.data ? allGamesFrom(query.data) : null), [query.data])
  return { data, error: query.error, retry: () => void query.refetch() }
}
