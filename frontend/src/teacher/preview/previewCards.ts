// Teacher preview: which games a lesson can be tried in, and its cards for one game.
// Pure functions; the same rule as the Student side (games/session.ts): a BUILT game
// with at least MIN_CARDS approved cards of its type.
import type { QuestionCard } from '../../content/questionCard'
import { GAMES, hasEnough, playableCards } from '../../games/session'
import type { GameId } from '../../games/types'
import type { ServerQuestion } from '../api/lessonsApi'
import { lessonStepPath } from '../planner/pages'

/** The order the games are offered in. */
const PREVIEW_ORDER: readonly GameId[] = ['quiz-show', 'match-up', 'fill-blank']

/** The games "Preview as a student" offers: built, with enough approved cards. */
export function previewGames(questions: readonly QuestionCard[]): GameId[] {
  return PREVIEW_ORDER.filter((g) => GAMES[g].built && hasEnough(questions, g))
}

/** Can this lesson be previewed in this game? */
export const canPreview = (questions: readonly QuestionCard[], game: GameId) => previewGames(questions).includes(game)

/**
 * The lesson's APPROVED cards of one game (drafts and other games left out), as
 * the game's QuestionCard: without the backend's position, flagChecked and madeBy.
 */
export function approvedCardsFor(questions: readonly ServerQuestion[], game: GameId): QuestionCard[] {
  return playableCards(questions, game).map(
    (q) => Object.fromEntries(Object.entries(q).filter(([key]) => !SERVER_ONLY.has(key))) as QuestionCard,
  )
}

/** What the backend adds to a card for the Check list; the games don't use it. */
const SERVER_ONLY: ReadonlySet<string> = new Set<keyof ServerQuestion>(['position', 'flagChecked', 'madeBy'])

/** /teacher/lessons/:id/preview/:gameId */
export const previewPath = (lessonId: string, game: GameId) =>
  `/teacher/lessons/${encodeURIComponent(lessonId)}/preview/${game}`

/** Back to the lesson's Games page. */
export const gamesPagePath = (lessonId: string) => lessonStepPath(lessonId, 'games')
