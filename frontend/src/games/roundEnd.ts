import { useCallback } from 'react'
import { useLobbyData } from '../screens/Lobby/useLobbyData'
import { decideAfterRound, START_LEVEL, type Decision } from './difficulty'
import { GAMES, logLevel, MISSION_GAMES, starsFor, xpFor } from './session'
import type { GameId, GameResult, Level } from './types'
import { useGameProgress } from './useGameProgress'

/** Everything the Results screen shows, worked out once when the round ends. */
export interface RoundSummary {
  right: number
  total: number
  /** Right answers the buddy helped with ("1 with Mochi's help"). */
  helped: number
  decision: Decision
  xpGained: number
  /** The XP bar before this round: level, XP into it, XP the level needs. */
  xpBefore: { level: number; xp: number; goal: number }
  streakDays: number
  /** Today's mission games (in order) and which are done, this one included. Empty in a Teacher preview. */
  mission: { games: GameId[]; done: GameId[] }
  /** The next game this lesson can play, or null (Back to Lobby / Back to games). */
  nextGame: GameId | null
}

/** What finishRound needs from the Student's progress (useGameProgress and useLobbyData in the app). */
export interface RoundEndDeps {
  student: { level: number; xp: number; xpGoal: number; streakDays: number }
  /** How many of MISSION_GAMES today's mission has. */
  missionGameCount: number
  playedToday: (lessonId: string) => GameId[]
  lessonCanPlay: (game: GameId) => boolean
  saveRound: (result: GameResult, nextLevel: Level, xp: number, stars: number) => void
}

/** A Teacher preview offers the other built game next, in this order. */
const PREVIEW_ORDER: readonly GameId[] = MISSION_GAMES

/**
 * Ends a round (pure, apart from `deps.saveRound`): the difficulty decision
 * (rule 4), XP, stars, the mission and the next game. Saves the round only
 * when `save` is set (not in dev demos) and it is not a Teacher `preview`:
 * a preview never calls saveRound, so no XP, stars, level or mission change.
 */
export function finishRound(
  game: GameId,
  result: GameResult,
  startLevel: Level,
  save: boolean,
  preview: boolean,
  deps: RoundEndDeps,
): RoundSummary {
  const answers = result.answers.map((a) => a.right)
  // Stars and "7 of 8 correct" count a helped right answer as right; the level and XP don't.
  const right = answers.filter(Boolean).length
  const helped = result.answers.filter((a) => a.right && a.helped).length
  const decision = decideAfterRound(result.answers, startLevel)
  logLevel(`round over: next round ${decision.change} -> ${decision.level}`, decision.reason)
  const xpGained = xpFor(right, helped)

  // The bar before this round: the Lobby's numbers (they already include earlier games).
  const { student } = deps
  const summary = {
    right,
    total: answers.length,
    helped,
    decision,
    xpGained,
    xpBefore: { level: student.level, xp: student.xp, goal: student.xpGoal },
    streakDays: student.streakDays,
  }

  if (preview) {
    // Nothing is saved and there is no Student mission: "Next game" is the other game this lesson can play.
    const nextGame = PREVIEW_ORDER.find((g) => g !== game && GAMES[g].built && deps.lessonCanPlay(g)) ?? null
    return { ...summary, mission: { games: [], done: [] }, nextGame }
  }

  if (save) deps.saveRound(result, decision.level, xpGained, starsFor(right, answers.length))

  const missionGames = MISSION_GAMES.slice(0, deps.missionGameCount)
  // Today's finished games for this lesson, this one included.
  const done = [...new Set([...deps.playedToday(result.lessonId), game])].filter((g) => missionGames.includes(g))
  const after = missionGames.slice(missionGames.indexOf(game) + 1)
  const nextGame = after.find((g) => GAMES[g].built && deps.lessonCanPlay(g)) ?? null
  return { ...summary, mission: { games: missionGames, done }, nextGame }
}

/**
 * Ends a round in a game screen: finishRound with the Student's progress.
 * XP, streak and level come from useLobbyData (fake for now), which also adds
 * the XP and stars this round saves. `preview` (Teacher preview): nothing is saved.
 */
export function useRoundEnd(game: GameId, lessonCanPlay: (g: GameId) => boolean, preview = false) {
  const { saveRound, playedToday } = useGameProgress()
  const { student, mission } = useLobbyData()

  return useCallback(
    (result: GameResult, startLevel: Level, save: boolean): RoundSummary =>
      finishRound(game, result, startLevel, save, preview, {
        student,
        missionGameCount: mission.games,
        playedToday,
        lessonCanPlay,
        saveRound,
      }),
    [game, lessonCanPlay, preview, saveRound, playedToday, student, mission.games],
  )
}

const previewLevel = (): Level => START_LEVEL

/**
 * The level a round starts at: the Student's saved level for the topic, or
 * always easy in a Teacher preview (the browser's saved Student level is not used).
 */
export function useStartLevel(preview = false): (topic: string) => Level {
  const { levelFor } = useGameProgress()
  return preview ? previewLevel : levelFor
}
