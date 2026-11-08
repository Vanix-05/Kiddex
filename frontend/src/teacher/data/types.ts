/**
 * The shapes of the Teacher Dashboard data. The fake data (src/mock/teacherMock.ts)
 * and, later, the real API both fill these in.
 */

/** Buddy heads shown in the student list (src/assets/teacher/h_*.png). */
export type BuddyHead = 'axolotl' | 'dog' | 'fox' | 'kitty' | 'monkey' | 'otter' | 'raccoon' | 'ram'

export type SectionColor = 'yellow' | 'pink' | 'coral'
export type SectionIcon = 'flower' | 'tulip' | 'rose'

export interface Section {
  id: string
  grade: number
  /** e.g. "Sampaguita". Shown as "4 – Sampaguita". */
  name: string
  color: SectionColor
  icon: SectionIcon
}

export interface Teacher {
  /** e.g. "Ms. Cruz" */
  name: string
}

export interface ClassStats {
  playedToday: number
  /** Students who finished the current review pack (null = no pack yet). */
  reviewPackDone: number | null
  reviewPackTotal: number | null
  /** Average study days this week (null = no activity yet). */
  studyDays: number | null
}

export interface TopicMastery {
  topic: string
  /** 0–100 */
  percent: number
}

export interface DayPlays {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'
  /** null = a day still to come */
  count: number | null
  today?: boolean
}

/** Where a To do button goes. */
export type TodoTarget =
  | { kind: 'check'; lessonId: string }
  | { kind: 'students'; filter?: StudentFilter }
  | { kind: 'games'; lessonId: string }
  | { kind: 'none' }

export interface TodoItem {
  id: string
  title: string
  detail: string
  /** A small red tag after the title, e.g. "below 50%". */
  tag?: string
  action: string
  /** The orange (main) button. */
  primary?: boolean
  target: TodoTarget
  done: boolean
  /** e.g. "7:42 AM" */
  doneAt?: string
}

export interface UpcomingItem {
  id: string
  /** e.g. "FRI" */
  weekday: string
  date: number
  title: string
  detail: string
}

export type StudentFilter = 'all' | 'registered' | 'notYet' | 'help'

export interface Student {
  id: string
  name: string
  /** e.g. "2026-0144" */
  schoolId: string
  registered: boolean
  /** Not registered yet: the one-time code on their login card, e.g. "482-915". */
  oneTimeCode?: string
  buddy?: BuddyHead
  /** e.g. "Today", "Nov 4" */
  lastPlayed?: string
  /** 0–100 */
  mastery?: number
  streak?: number
  needsHelp?: boolean
}

export type GameType = 'quiz' | 'match' | 'blank'
export type FileType = 'PDF' | 'PPT'

/**
 * making   = the AI is drafting questions
 * toCheck  = drafts waiting for the Teacher
 * ready    = all checked, not assigned yet
 * assigned = given to the class as a review pack
 * draft    = uploaded, nothing approved
 */
export type LessonStatus = 'making' | 'toCheck' | 'ready' | 'assigned' | 'draft'

export interface Lesson {
  id: string
  /** Shown in the list, e.g. "Fractions: Parts of a Whole" */
  title: string
  fileName: string
  fileType: FileType
  /** e.g. "12 pages" or "18 slides" */
  size: string
  /** e.g. "2.1 MB" */
  fileSize?: string
  /** e.g. "uploaded Nov 3" or "just now" */
  uploaded: string
  topic: string
  subject: string
  games: GameType[]
  status: LessonStatus
  /** Assigned: "due Fri" or "done". */
  assignedNote?: string
  /** While making: how many of the 5 steps are done (0–5). */
  makingStep?: number
}

export type DraftStatus = 'toCheck' | 'approved'
export type Level = 'easy' | 'medium' | 'hard'

export interface Draft {
  id: string
  lessonId: string
  text: string
  game: GameType
  choices: string[]
  /** Index of the right choice. */
  right: number
  topic: string
  level: Level
  status: DraftStatus
  /** The Teacher changed the AI's draft (shown with a pencil). */
  edited?: boolean
  /** Where in the lesson the AI found it (page 0 = the Teacher's own question). */
  source: { page: number; quote: string; highlight: string }
}

/** Everything the dashboard shows, for one test mode. */
export interface TeacherData {
  teacher: Teacher
  sections: Section[]
  activeSectionId: string
  /** e.g. "Thursday, November 6" */
  todayLabel: string
  /** The subject the class is on this week, e.g. "Fractions" */
  weekSubject: string
  stats: ClassStats
  todos: TodoItem[]
  upcoming: UpcomingItem[]
  weakTopics: TopicMastery[]
  week: DayPlays[]
  /** Ollie's note on Home. */
  ollieNote: string
  students: Student[]
  lessons: Lesson[]
  drafts: Draft[]
  /** The default review pack due date, e.g. "Fri, Nov 14" */
  nextDueLabel: string
}
