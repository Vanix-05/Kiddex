import { useMemo } from 'react'
import { missionOf } from '../../games/studentData'
import type { Progress } from '../../games/studentGames'
import { useStudentGames } from '../../games/useStudentGames'
import { lobbyMock, ollieLines } from '../../mock/lobbyMock'
import type { LobbyData, Mission, StudentProgress } from './lobbyData'

/** The Lobby's numbers from the server's progress (the bar shows the XP into this level). */
export const lobbyProgress = (p: Progress): StudentProgress => ({
  level: p.level,
  xp: p.xpIntoLevel,
  xpGoal: p.xpGoal,
  stars: p.stars,
  streakDays: p.streakDays,
})

/** The Lobby's data: real progress and mission, plus the parts that are still fake (lobbyMock.ts). */
export const lobbyDataFrom = (student: StudentProgress, mission: Mission): LobbyData => ({
  ...lobbyMock,
  student,
  mission,
  ollieLines: ollieLines(mission.state === 'none' ? null : mission.name),
})

/**
 * Everything the Student's Lobby shows. REAL: the Student's level, XP, stars and
 * streak, today's mission and the chalkboard (GET /api/student/games). Still
 * fake (lobbyMock.ts): the Class Garden, the Prize Wheel slices and Ollie's lines.
 * Students only: the Teacher's view-only Lobby builds its own (TeacherLobbyScreen).
 */
export function useLobbyData() {
  const query = useStudentGames()
  const data = useMemo(
    () => (query.data ? lobbyDataFrom(lobbyProgress(query.data.progress), missionOf(query.data)) : null),
    [query.data],
  )
  return { data, error: query.error, retry: () => void query.refetch() }
}
