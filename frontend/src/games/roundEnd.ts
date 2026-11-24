import { useCallback, useContext, type Dispatch, type SetStateAction } from 'react'
import { decideAfterRound, START_LEVEL, type Decision } from './difficulty'
import { neverSaves } from './pendingRounds'
import { GAMES, logLevel, MISSION_GAMES, xpFor } from './session'
import { roundBody } from './studentData'
import { topicKey, type SavedRound } from './studentGames'
import { StudentPlayContext } from './studentPlay'
import type { GameId, GameResult, Level } from './types'

/** Everything the Results screen shows. Worked out at once when the round ends, then the server's numbers. */
export interface RoundSummary {
  /** The round's clientRoundId. */
  roundId: string
  right: number
  total: number
  /** Right answers the buddy helped with ("1 with Mochi's help"). */
  helped: number
  decision: Decision
  xpGained: number
  /** The XP bar before this round: level, XP into it, XP the level needs. */
  xpBefore: { level: number; xp: number; goal: number }
  streakDays: number
  /** Today's mission games (in order) and which are done, this one included. Empty when this lesson isn't the mission's (and in a Teacher preview). */
  mission: { games: GameId[]; done: GameId[] }
  /** The next game this lesson can play, or null (Back to Lobby / Back to games). */
  nextGame: GameId | null
  /**
   * none: not saved (Teacher preview, dev pages, or it can never be saved).
   * saving → saved (the server's numbers are shown), or failed (kept in this browser to send again).
   */
  save: 'none' | 'saving' | 'saved' | 'failed'
}

/** What finishRound needs from the Student's data. */
export interface RoundEndDeps {
  /** The Student's numbers before this round. */
  student: { level: number; xp: number; xpGoal: number; streakDays: number }
  /** Today's mission, when this round's lesson is the mission's lesson; else null. */
  mission: { games: GameId[]; done: GameId[] } | null
  /** The games this lesson can play, in the usual order (Next game when it isn't the mission). */
  lessonGames: GameId[]
  lessonCanPlay: (game: GameId) => boolean
}

/** A Teacher preview offers the other built game next, in this order. */
const PREVIEW_ORDER: readonly GameId[] = MISSION_GAMES

/** Before the Student's data is there (dev pages): level 1, no XP. */
const NO_STUDENT: RoundEndDeps['student'] = { level: 1, xp: 0, xpGoal: 300, streakDays: 0 }

/**
 * Ends a round (pure): the difficulty decision, XP, stars, the mission and the next
 * game, with the same rules as the backend, so Results never waits for the server.
 * Saving is NOT done here (useRoundEnd does it, and never in a Teacher `preview`).
 */
export function finishRound(game: GameId, result: GameResult, startLevel: Level, preview: boolean, deps: RoundEndDeps): RoundSummary {
  // Stars and "7 of 8 correct" count a helped right answer as right; the level and XP don't.
  const right = result.answers.filter((a) => a.right).length
  const helped = result.answers.filter((a) => a.right && a.helped).length
  const decision = decideAfterRound(result.answers, startLevel)
  logLevel(`round over: next round ${decision.change} -> ${decision.level}`, decision.reason)

  const { student } = deps
  const summary = {
    roundId: result.clientRoundId,
    right,
    total: result.answers.length,
    helped,
    decision,
    xpGained: xpFor(right, helped),
    xpBefore: { level: student.level, xp: student.xp, goal: student.xpGoal },
    streakDays: student.streakDays,
    save: 'none' as const,
  }
  const canPlay = (g: GameId) => GAMES[g].built && deps.lessonCanPlay(g)

  if (preview) {
    // There is no Student mission: "Next game" is the other game this lesson can play.
    const nextGame = PREVIEW_ORDER.find((g) => g !== game && canPlay(g)) ?? null
    return { ...summary, mission: { games: [], done: [] }, nextGame }
  }

  if (deps.mission) {
    const { games } = deps.mission
    const done = games.filter((g) => g === game || deps.mission!.done.includes(g))
    const nextGame = games.find((g) => !done.includes(g) && canPlay(g)) ?? null
    return { ...summary, mission: { games, done }, nextGame }
  }

  const after = deps.lessonGames.slice(deps.lessonGames.indexOf(game) + 1)
  return { ...summary, mission: { games: [], done: [] }, nextGame: after.find(canPlay) ?? null }
}

/** Results with the server's numbers (usually the same; the streak can go up on the day's first round). */
export function withServerAnswer(summary: RoundSummary, answer: SavedRound): RoundSummary {
  const { games } = summary.mission
  return {
    ...summary,
    xpGained: answer.round.xp,
    decision: answer.round.decision,
    streakDays: answer.progress.streakDays,
    mission: { games, done: games.filter((g) => answer.round.missionDone.includes(g)) },
    save: 'saved',
  }
}

/**
 * Ends a round in a game screen: finishRound with the Student's data, then (for a
 * Student, when `save`) sends the round. `update` (the game's setSummary) gets the
 * server's numbers, or the "couldn't save yet" state.
 * `preview` (Teacher preview): nothing is read from a Student and nothing is saved.
 */
export function useRoundEnd(game: GameId, lessonCanPlay: (g: GameId) => boolean, preview = false) {
  const context = useContext(StudentPlayContext)
  const play = preview ? null : context

  return useCallback(
    (result: GameResult, startLevel: Level, save: boolean, update?: Dispatch<SetStateAction<RoundSummary | null>>): RoundSummary => {
      const lesson = play?.lessons.find((l) => l.id === result.lessonId)
      const mission = play?.mission && lesson && play.mission.assignmentId === lesson.assignmentId ? play.mission : null
      const progress = play?.progress
      const summary = finishRound(game, result, startLevel, preview, {
        student: progress
          ? { level: progress.level, xp: progress.xpIntoLevel, xpGoal: progress.xpGoal, streakDays: progress.streakDays }
          : NO_STUDENT,
        mission: mission && { games: mission.games, done: mission.done },
        lessonGames: lesson ? lesson.games.filter((g) => g.playable).map((g) => g.id) : [],
        lessonCanPlay,
      })
      if (!save || !play || !lesson?.assignmentId) return summary

      const mine = (fix: (s: RoundSummary) => RoundSummary) =>
        update?.((now) => (now && now.roundId === summary.roundId ? fix(now) : now))
      play
        .save(roundBody(result, lesson.assignmentId), result.topic)
        .then((answer) => mine((s) => withServerAnswer(s, answer)))
        .catch((err: unknown) => mine((s) => ({ ...s, save: neverSaves(err) ? 'none' : 'failed' })))
      return { ...summary, save: 'saving' }
    },
    [game, lessonCanPlay, preview, play],
  )
}

/** The Student's level for a topic (easy until they've played it). */
export const startLevelFor = (levels: Record<string, Level>, topic: string): Level => levels[topicKey(topic)] ?? START_LEVEL

const previewLevel = (): Level => START_LEVEL

/**
 * The level a round starts at: the Student's level for the topic (from the server),
 * or always easy in a Teacher preview and on the dev pages.
 */
export function useStartLevel(preview = false): (topic: string) => Level {
  const context = useContext(StudentPlayContext)
  const levels = preview ? null : context?.levels
  return useCallback((topic: string) => (levels ? startLevelFor(levels, topic) : previewLevel()), [levels])
}
