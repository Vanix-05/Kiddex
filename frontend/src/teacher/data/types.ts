/**
 * The shapes of the Teacher Dashboard data. Lessons, sections, Students and the
 * class's progress come from the backend (src/teacher/api); which To dos were
 * ticked and the open section tab are kept in memory (TeacherDataProvider).
 */
import type { QuestionCard, TemplateId } from '../../content/questionCard'

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
  /** Students who made their PIN code (from GET /api/sections). */
  registeredCount: number
}

export interface Teacher {
  /** e.g. "Ms. Cruz" */
  name: string
}

/** Where a To do button goes. */
export type TodoTarget =
  | { kind: 'check'; lessonId: string }
  | { kind: 'students'; filter?: StudentFilter }
  | { kind: 'games'; lessonId: string }
  /** One Student's page in My Students. */
  | { kind: 'student'; studentId: string }
  | { kind: 'progress' }
  | { kind: 'none' }

export interface TodoItem {
  id: string
  /**
   * Left out on "check" items: useTodos makes their title from the lesson's
   * draft cards ("Check 7 AI-drafted questions"), so the number is always live.
   */
  title?: string
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

export type StudentFilter = 'all' | 'registered' | 'notYet' | 'help'

/**
 * A Student. Students have NO names in KIDDEX (Master Brief 4.1): only a School ID.
 * lastPlayed, mastery and streak stay empty until the Student plays.
 */
export interface Student {
  id: string
  /** e.g. "2026-0144" */
  schoolId: string
  /** Has made their PIN code. */
  registered: boolean
  /** Not registered yet: the one-time code on their login card, e.g. "482-915". */
  oneTimeCode?: string
  buddy?: BuddyHead
  /** The name the Student gave their buddy, e.g. "Mochi". */
  buddyName?: string
  /** e.g. "Today", "Nov 4" */
  lastPlayed?: string
  /** Overall mastery 0–100 (rule-based); undefined while there aren't enough answers. */
  mastery?: number
  streak?: number
  needsHelp?: boolean
}

/** The mini games, named the same everywhere: 'quiz-show' | 'match-up' | 'fill-blank'. */
export type { QuestionCard, TemplateId } from '../../content/questionCard'
export type FileType = 'PDF' | 'PPT' | 'DOC'

/**
 * The screen's lesson status (the backend's status in brackets):
 * draft    = uploaded, no questions yet (uploaded)
 * making   = the AI is drafting questions (making)
 * failed   = making questions didn't work (failed)
 * toCheck  = drafts waiting for the Teacher (ready)
 * ready    = all checked, not assigned yet (approved)
 * assigned = given to the open section as a review pack (approved + an assignment on the server)
 */
export type LessonStatus = 'making' | 'toCheck' | 'ready' | 'assigned' | 'draft' | 'failed'

export interface Lesson {
  id: string
  /** Shown in the list, e.g. "Fractions: Parts of a Whole" */
  title: string
  fileName: string
  fileType: FileType
  /** e.g. "12 pages", "about 3 pages" (Word) or "18 slides" */
  size: string
  /** e.g. "2.1 MB" */
  fileSize?: string
  /** e.g. "uploaded Nov 3" or "just now" */
  uploaded: string
  topic: string
  subject: string
  /** The games picked at upload, and later the ones switched on for the review pack. */
  games: TemplateId[]
  status: LessonStatus
  /** Assigned to the open section (from the server): "due Fri". */
  assignedNote?: string
  /** How many words of text the backend read. */
  wordCount: number
  /** The section's grade it was made for (once questions were asked for). */
  grade?: number
}

/** A small note the screen keeps on top of a server lesson (in memory) until the backend has it. */
export interface LessonNote {
  /** The games switched on for the review pack (Games page), until Assign saves them. */
  games?: TemplateId[]
}

export type Level = QuestionCard['level']

/** A School ID the server skipped when adding Students, and why. */
export interface SkippedSchoolId {
  schoolId: string
  reason: 'BAD_FORMAT' | 'DUPLICATE_IN_LIST' | 'ALREADY_IN_SECTION' | 'IN_ANOTHER_SECTION'
}

/** The Students just added (for "Login codes are ready!"), until My Students closes. */
export interface JustAdded {
  sectionId: string
  added: Student[]
  skipped: SkippedSchoolId[]
}

/** Everything the dashboard shows. */
export interface TeacherData {
  teacher: Teacher
  /** The open section tab (screen only; sections come from the backend). "" = the first one. */
  activeSectionId: string
  /** e.g. "Thursday, November 6" */
  todayLabel: string
  todos: TodoItem[]
  /** Automatic To dos (made from the progress) ticked this session: id → "7:42 AM". */
  autoDone: Record<string, string>
  /** The Students just added, shown as "Login codes are ready!" in My Students. */
  justAdded: JustAdded | null
  /** Screen-only notes on server lessons, by lesson id (review pack games, assigned). */
  lessonNotes: Record<string, LessonNote>
  /** Lessons whose Check list was read to the end once (unlocks Approve all for this session). */
  checkSeenEnd: string[]
  /** The default review pack due date, e.g. "Fri, Nov 14" */
  nextDueLabel: string
}
