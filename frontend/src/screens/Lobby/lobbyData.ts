/** What the Lobby shows (see useLobbyData.ts). */
import type { Board } from '../../games/studentGames'
import type { GameId } from '../../games/types'
import type { Avatar } from '../../setup/avatar'
import type { Look } from '../../setup/customizeData'
import type { BuddyId } from '../../setup/quizData'

/**
 * The Student's progress. Students have NO names in KIDDEX (brief 4.1, 4.14): their
 * card and name tag show their buddy's name (from the session).
 */
export interface StudentProgress {
  level: number
  xp: number
  /** XP that fills the bar (reaching the next level). */
  xpGoal: number
  stars: number
  streakDays: number
}

/** A classmate in the Lobby right now (the live Lobby, live/useLiveClassmates.ts). */
export interface Classmate {
  /** Made by the server when they came in: not their School ID or database id. */
  id: string
  /** What their name tag shows: their BUDDY's name (Students have no names in KIDDEX). */
  name: string
  avatar: Avatar
  look: Look
  buddy: BuddyId
  buddyName: string
  /** Their real level (from their XP). */
  level: number
}

/** Today's mission: the assignment the Lobby puts first (from GET /api/student/games). */
export interface Mission {
  /** open: a game is left. complete: all done (today). none: nothing to do now. */
  state: 'open' | 'complete' | 'none'
  assignmentId: string | null
  /** The lesson its games play (?lesson=). */
  lessonId: string | null
  /** The pack name, e.g. "Fractions Review". */
  name: string
  /** e.g. "Equivalent Fractions" */
  lessonTitle: string
  subject: string
  /** The Teacher's name ('' when the Student has no lessons: say "your teacher"). */
  teacher: string
  /** "2026-11-27", or null. */
  dueDate: string | null
  /** The playable mission games, in the usual order. */
  games: GameId[]
  /** The ones finished (each counts once). */
  done: GameId[]
  /** Best stars per game with this lesson. */
  bestStars: Partial<Record<GameId, number>>
  /** The most XP a perfect run of every mission game gives ("Up to +85 XP"). */
  maxXp: number
  /** The chalkboard. */
  board: Board
  /** Does the Student have any lessons at all (for the "none" lines)? */
  hasLessons: boolean
}

/** The Class Garden: one plant the whole section grows by finishing missions. */
export interface ClassGarden {
  /** Missions finished by anyone in the section since it was planted. */
  done: number
  /** Missions it takes to bloom. */
  goal: number
}

/** One slice of the Prize Wheel. Every slice is a prize. */
export interface WheelPrize {
  label: string
  icon: string
  /** Stars it adds (0 for a sticker, which goes to My Room later). */
  stars: number
}

export interface LobbyData {
  student: StudentProgress
  mission: Mission
  garden: ClassGarden
  /** The Prize Wheel's slices, clockwise from the top. */
  wheel: WheelPrize[]
  /** Short lines Ollie's speech bubble rotates through. */
  ollieLines: string[]
}
