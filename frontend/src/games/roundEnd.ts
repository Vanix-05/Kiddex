import { useCallback } from 'react'
import { useLobbyData } from '../screens/Lobby/useLobbyData'
import { decideAfterRound, type Decision } from './difficulty'
import { GAMES, logLevel, MISSION_GAMES, starsFor, xpFor } from './session'
import type { GameId, GameResult, Level } from './types'
import { useGameProgress } from './useGameProgress'

/** Everything the Results screen shows, worked out once when the round ends. */
export interface RoundSummary {
  right: number
  total: number
  decision: Decision
  xpGained: number
  /** The XP bar before this round: level, XP into it, XP the level needs. */
  xpBefore: { level: number; xp: number; goal: number }
  streakDays: number
  /** Today's mission games (in order) and which are done, this one included. */
  mission: { games: GameId[]; done: GameId[] }
  /** The next mission game this lesson can play, or null (Back to Lobby). */
  nextGame: GameId | null
}

/**
 * Ends a round: the difficulty decision (rule 4), saving the GameResult and
 * the new level with useGameProgress (not in dev demos), XP, streak and the
 * mission. XP, streak and level come from useLobbyData (fake for now), which
 * also adds the XP and stars this round saves.
 */
export function useRoundEnd(game: GameId, lessonCanPlay: (g: GameId) => boolean) {
  const { saveRound, playedToday } = useGameProgress()
  const { student, mission } = useLobbyData()

  return useCallback(
    (result: GameResult, startLevel: Level, save: boolean): RoundSummary => {
      const answers = result.answers.map((a) => a.right)
      const right = answers.filter(Boolean).length
      const decision = decideAfterRound(answers, startLevel)
      logLevel(`round over: next round ${decision.change} -> ${decision.level}`, decision.reason)
      const xpGained = xpFor(right)

      // The bar before this round: the Lobby's numbers (they already include earlier games).
      const { level, xp } = student

      if (save) saveRound(result, decision.level, xpGained, starsFor(right, answers.length))

      const missionGames = MISSION_GAMES.slice(0, mission.games)
      // Today's finished games for this lesson, this one included.
      const done = [...new Set([...playedToday(result.lessonId), game])].filter((g) => missionGames.includes(g))
      const after = missionGames.slice(missionGames.indexOf(game) + 1)
      const nextGame = after.find((g) => GAMES[g].built && lessonCanPlay(g)) ?? null

      return {
        right,
        total: answers.length,
        decision,
        xpGained,
        xpBefore: { level, xp, goal: student.xpGoal },
        streakDays: student.streakDays,
        mission: { games: missionGames, done },
        nextGame,
      }
    },
    [game, lessonCanPlay, saveRound, playedToday, student, mission.games],
  )
}
