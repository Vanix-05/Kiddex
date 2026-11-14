import { useMemo } from 'react'
import { MISSION_GAMES } from '../../games/mission'
import { useGameProgress } from '../../games/useGameProgress'
import { lobbyMock } from '../../mock/lobbyMock'
import type { LobbyData } from './lobbyData'

/**
 * Everything the Lobby shows that will come from the backend: the Student's
 * progress, their classmates, today's mission and Ollie's lines.
 *
 * FAKE for now: src/mock/lobbyMock.ts, plus what the mini games earned
 * (useGameProgress): their XP and stars go on top of the Student's own, and
 * the mission counts the games finished today. Replace the body with the real
 * API calls later; the screen only uses this hook.
 */
export function useLobbyData(): LobbyData {
  const { xpEarned, starsEarned, playedToday } = useGameProgress()

  return useMemo(() => {
    const base = lobbyMock.student
    // Every xpGoal (300) XP is the next level.
    let level = base.level
    let xp = base.xp + xpEarned
    while (xp >= base.xpGoal) {
      xp -= base.xpGoal
      level++
    }
    const { mission } = lobbyMock
    const today = playedToday(mission.lessonId)
    const done = MISSION_GAMES.slice(0, mission.games).filter((g) => today.includes(g))
    return {
      ...lobbyMock,
      student: { ...base, level, xp, stars: base.stars + starsEarned },
      mission: { ...mission, gamesDone: done.length, done },
    }
  }, [xpEarned, starsEarned, playedToday])
}
