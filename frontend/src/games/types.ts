// Shared shapes for every mini game. Each game sends the same GameResult,
// so the difficulty engine never needs to know which game was played.
import type { QuestionCard, TemplateId } from '../content/questionCard'
import type { Avatar } from '../setup/avatar'
import type { Look } from '../setup/customizeData'
import type { BuddyId } from '../setup/quizData'

/** The mini games, named like the Teacher side: 'quiz-show' | 'match-up' | 'fill-blank'. */
export type GameId = TemplateId

export type Level = QuestionCard['level']

/** One card in a round, as it was played. */
export interface AnswerRecord {
  cardId: string
  level: Level
  /** Quiz Show: the first pick was right. Match Up: tied on the first try. */
  right: boolean
  /** Picks until it was right (Quiz Show is always 1: one pick per question). */
  tries: number
  /** From when the card could be answered to the (first) answer. */
  ms: number
}

/** One finished round: saved by useGameProgress, later sent to the backend. */
export interface GameResult {
  gameId: GameId
  lessonId: string
  /** The topic the Student's level belongs to (the cards' topic). */
  topic: string
  /** ISO times. */
  startedAt: string
  endedAt: string
  answers: AnswerRecord[]
}

/** The Student playing: their name, rig and buddy in their Customize look. */
export interface Player {
  name: string
  avatar: Avatar
  buddy: BuddyId
  buddyName: string
  look: Look
}

/** The lesson a round is about, as the frame shows it ("From Ms. Cruz · Math"). */
export interface GameLesson {
  id: string
  name: string
  teacher: string
  subject: string
}

/** Where the Student came from, so Leave and Back to games return there. */
export type GameFrom = 'stage' | 'match' | 'mission' | 'dev'

/** Dev screens (/dev/games): open a game at one moment. */
export type DemoState = 'question' | 'right' | 'wrong' | 'results' | 'picked' | 'miss'

/** What every game screen gets from the play route. */
export interface GameProps {
  player: Player
  lesson: GameLesson
  /** The lesson's approved cards for this game. */
  cards: QuestionCard[]
  /** Can this lesson also play another game (for "Next game")? */
  lessonCanPlay: (game: GameId) => boolean
  /** Dev only: start at this moment; nothing is saved. */
  demo?: DemoState
  onLeave: () => void
  onPlayGame: (game: GameId) => void
}
