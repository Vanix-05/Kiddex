/**
 * The Student's games on the backend (backend/README.md, "Game rounds and progress"):
 *   GET  /api/student/games   everything the game screens need
 *   POST /api/student/rounds  saves one finished round
 * The backend works out XP, stars, the streak and the level (rule-based, not AI);
 * the browser only says which answers were right.
 * Screens don't call these directly: they use useStudentGames.
 */
import type { QuestionCard } from '../content/questionCard'
import { api } from '../teacher/api/client'
import type { Decision } from './difficulty'
import type { GameId, Level } from './types'

export interface Progress {
  xp: number
  level: number
  xpIntoLevel: number
  xpGoal: number
  stars: number
  /** 0 when the Student didn't play today or yesterday. */
  streakDays: number
}

/** One game of an assignment. Only `playable` ones can be played. */
export interface GameEntry {
  id: GameId
  playable: boolean
  /** Why it can't be played, in the backend's words. */
  reason?: string
  /** Best stars ever with this lesson (0 = never finished). */
  bestStars: number
  /** Finished once in this assignment (counts for the mission). */
  done: boolean
}

/** One lesson the Teacher gave the Student's section (an assignment). */
export interface ServerLesson {
  assignmentId: string
  lessonId: string
  /** The pack name, e.g. "Fractions Review". */
  name: string
  /** e.g. "Equivalent Fractions" */
  lessonTitle: string
  subject: string | null
  grade: number | null
  /** The Teacher's name, e.g. "Ms. Cruz". */
  teacher: string
  /** "2026-11-27", or null. */
  dueDate: string | null
  assignedAt: string
  games: GameEntry[]
  /** The approved questions of the assigned games. */
  cards: QuestionCard[]
}

export interface Board {
  keyWords: { word: string; text: string }[]
  /** before + answer + after is the whole sentence. */
  keyIdeas: { before: string; answer: string; after: string }[]
}

export interface ServerMission {
  assignmentId: string
  state: 'open' | 'complete'
  /** The playable games, in the usual order. */
  games: GameId[]
  done: GameId[]
  maxXp: number
  board: Board
}

export interface StudentGames {
  progress: Progress
  /** Topic key (trimmed, lowercase) → the Student's level. */
  levels: Record<string, Level>
  /** Newest first. */
  lessons: ServerLesson[]
  mission: ServerMission | null
}

/** What POST /api/student/rounds takes. */
export interface RoundBody {
  clientRoundId: string
  assignmentId: string
  game: GameId
  startedAt: string
  endedAt: string
  helpsUsed: number
  answers: { questionId: string; right: boolean; tries: number; ms: number; helped: boolean }[]
}

/** What POST /api/student/rounds answers. */
export interface SavedRound {
  round: {
    xp: number
    stars: number
    starsEarned: number
    decision: Decision
    countsForMission: boolean
    missionDone: GameId[]
  }
  progress: Progress
}

/** The free server can take about 50 seconds to wake up: wait as long as the Student login does. */
const WAKE_TIMEOUT_MS = 75_000

export const getGames = () => api<StudentGames>('/api/student/games', { timeoutMs: WAKE_TIMEOUT_MS })

export const saveRound = (body: RoundBody) =>
  api<SavedRound>('/api/student/rounds', { method: 'POST', body, timeoutMs: WAKE_TIMEOUT_MS })

/** A topic as the backend keys the levels: trimmed and lowercase. */
export const topicKey = (topic: string) => topic.trim().toLowerCase()
