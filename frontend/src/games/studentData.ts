/**
 * Pure helpers that turn the Student's games data (studentGames.ts) into what the
 * screens use: the lessons the games play, the Lobby's mission, the due-date text,
 * the round to send, and the cache after a saved round. No React, no fetching.
 */
import type { QuestionCard } from '../content/questionCard'
import type { Mission } from '../screens/Lobby/lobbyData'
import type { Board, GameEntry, RoundBody, SavedRound, StudentGames } from './studentGames'
import { topicKey } from './studentGames'
import type { GameId, GameResult } from './types'

/** A lesson the games can be played with (for a Student: one assignment in their section). */
export interface PlayLesson {
  /** The lessonId (the ?lesson= of a game). */
  id: string
  /** The assignment a round is saved under (null on the dev pages: nothing is saved). */
  assignmentId: string | null
  /** The pack name, e.g. "Fractions Review". */
  name: string
  /** e.g. "Equivalent Fractions" */
  lessonTitle: string
  teacher: string
  subject: string
  /** When the Teacher gave it to the class (ISO). */
  assignedAt: string
  /** The assigned games. Only `playable` ones can be played. */
  games: GameEntry[]
  /** Approved cards of the assigned games. */
  cards: QuestionCard[]
}

/** The Student's lessons, newest first (as the backend sends them). */
export const toPlayLessons = (data: StudentGames): PlayLesson[] =>
  data.lessons.map((l) => ({
    id: l.lessonId,
    assignmentId: l.assignmentId,
    name: l.name,
    lessonTitle: l.lessonTitle,
    teacher: l.teacher,
    subject: l.subject ?? '',
    assignedAt: l.assignedAt,
    games: l.games,
    cards: l.cards,
  }))

/** Can this lesson play this game? */
export const isPlayable = (lesson: PlayLesson | undefined, game: GameId) =>
  !!lesson?.games.some((g) => g.id === game && g.playable)

const EMPTY_BOARD: Board = { keyWords: [], keyIdeas: [] }

/**
 * No mission. `teacher`: the Teacher of the Student's newest lesson ('' when they
 * have none: the screens then say "your teacher").
 */
export const noMission = (teacher: string, hasLessons: boolean): Mission => ({
  state: 'none',
  assignmentId: null,
  lessonId: null,
  name: '',
  lessonTitle: '',
  subject: '',
  teacher,
  dueDate: null,
  games: [],
  done: [],
  bestStars: {},
  maxXp: 0,
  board: EMPTY_BOARD,
  hasLessons,
})

/** The Lobby's mission from the games data. */
export function missionOf(data: StudentGames): Mission {
  const m = data.mission
  const lesson = m ? data.lessons.find((l) => l.assignmentId === m.assignmentId) : undefined
  if (!m || !lesson) return noMission(data.lessons[0]?.teacher ?? '', data.lessons.length > 0)
  return {
    state: m.state,
    assignmentId: m.assignmentId,
    lessonId: lesson.lessonId,
    name: lesson.name,
    lessonTitle: lesson.lessonTitle,
    subject: lesson.subject ?? '',
    teacher: lesson.teacher,
    dueDate: lesson.dueDate,
    games: m.games,
    done: m.done,
    bestStars: Object.fromEntries(lesson.games.map((g) => [g.id, g.bestStars])),
    maxXp: m.maxXp,
    board: m.board,
    hasLessons: true,
  }
}

/** "Ms. Cruz", or "your teacher" / "Your teacher" when we don't know who. */
export const teacherWords = (teacher: string, startOfSentence = false) =>
  teacher || (startOfSentence ? 'Your teacher' : 'your teacher')

// ---------- Due dates ----------

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A due date in words. `card`: "Due Friday, Nov 27". `note`: "due Fri, Nov 27".
 * A date before `today` ("2026-11-24") says "Was due …" / "was due …": no red, no shaming.
 */
export function dueText(dueDate: string, today: string, form: 'card' | 'note'): string {
  const [y, m, d] = dueDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(date.getTime())) return ''
  const day = DAYS[date.getUTCDay()]
  const label = `${form === 'card' ? day : day.slice(0, 3)}, ${MONTHS[m - 1]} ${d}`
  const past = dueDate < today
  if (form === 'card') return `${past ? 'Was due' : 'Due'} ${label}`
  return `${past ? 'was due' : 'due'} ${label}`
}

// ---------- Saving a round ----------

/** The round as POST /api/student/rounds takes it (the card id is the question id). */
export function roundBody(result: GameResult, assignmentId: string): RoundBody {
  return {
    clientRoundId: result.clientRoundId,
    assignmentId,
    game: result.gameId,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    helpsUsed: Math.max(0, Math.min(result.helpsUsed, result.answers.length)),
    answers: result.answers.map((a) => ({
      questionId: a.cardId,
      right: a.right,
      tries: Math.max(1, Math.min(20, Math.round(a.tries) || 1)),
      ms: Math.max(0, Math.round(a.ms) || 0),
      helped: a.helped,
    })),
  }
}

/** The games data after a saved round: the server's progress, level, stars and mission. */
export function withSavedRound(data: StudentGames, body: RoundBody, topic: string, answer: SavedRound): StudentGames {
  const { round, progress } = answer
  const lessons = data.lessons.map((l) =>
    l.assignmentId !== body.assignmentId
      ? l
      : {
          ...l,
          games: l.games.map((g) =>
            g.id !== body.game ? g : { ...g, bestStars: Math.max(g.bestStars, round.stars), done: g.done || round.missionDone.includes(g.id) },
          ),
        },
  )
  let mission = data.mission
  if (mission && mission.assignmentId === body.assignmentId) {
    const done = mission.games.filter((g) => round.missionDone.includes(g))
    mission = { ...mission, done, state: done.length === mission.games.length ? 'complete' : 'open' }
  }
  return { ...data, progress, levels: { ...data.levels, [topicKey(topic)]: round.decision.level }, lessons, mission }
}

// ---------- The Teacher's view of the Lobby ----------
// Teachers never call the Student address: their view builds the mission from the
// section's assignments (GET /api/sections/:id/assignments) and the lesson's questions.

/** Same rule as the backend's chalkboard (backend/src/games/board.ts). `questions` in position order. */
export function makeBoard(questions: readonly Pick<QuestionCard, 'type' | 'prompt' | 'answer' | 'status'>[]): Board {
  const approved = questions.filter((q) => q.status === 'approved')
  const pairs = approved.filter((q) => q.type === 'matching_pair')
  if (pairs.length) return { keyWords: pairs.slice(0, 4).map((q) => ({ word: q.prompt, text: q.answer })), keyIdeas: [] }
  const blank = /_{3,}/
  return {
    keyWords: [],
    keyIdeas: approved
      .filter((q) => q.type === 'fill_blank' && blank.test(q.prompt))
      .slice(0, 3)
      .map((q) => {
        const match = blank.exec(q.prompt)!
        return { before: q.prompt.slice(0, match.index), answer: q.answer, after: q.prompt.slice(match.index + match[0].length) }
      }),
  }
}

/** The assignment a section's Lobby shows: the soonest due date (none last), a tie goes to the newest. */
export function soonestAssignment<T extends { dueDate: string | null; createdAt: string }>(assignments: readonly T[]): T | undefined {
  const due = (a: T) => a.dueDate ?? '9999-12-31'
  return [...assignments].sort((a, b) => due(a).localeCompare(due(b)) || b.createdAt.localeCompare(a.createdAt))[0]
}
