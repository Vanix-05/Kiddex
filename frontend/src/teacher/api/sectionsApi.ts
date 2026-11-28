/**
 * Typed calls for the section and Student addresses in backend/README.md.
 * Screens don't call these directly: they use the hooks in src/teacher/data/useTeacherData.ts.
 * Students have NO names in KIDDEX: only a School ID.
 */
import type { TemplateId } from '../../content/questionCard'
import { api } from './client'

// ---------- Shapes the backend sends ----------

/** One row of GET /api/sections. */
export interface ServerSection {
  id: string
  grade: number
  name: string
  color: string
  icon: string
  /** Active Students (removed ones are not counted). */
  studentCount: number
  registeredCount: number
  /** Removed Students, for the "Removed (N)" link. */
  removedCount: number
}

/** One row of GET /api/sections/:id/removed (newest removed first). */
export interface ServerRemovedStudent {
  id: string
  /** Shown form, e.g. "2026-0177". */
  schoolId: string
  registered: boolean
  buddy: string | null
  buddyName: string | null
  /** When they were removed (ISO). */
  removedAt: string
}

export interface ServerStudent {
  id: string
  /** Shown form, e.g. "2026-0144". */
  schoolId: string
  /** Has made their PIN code. */
  registered: boolean
  /** Shown form, e.g. "482-915"; null once registered. */
  oneTimeCode: string | null
  buddy: string | null
  buddyName: string | null
  lastLoginAt: string | null
  registeredAt: string | null
  /** When their newest round ended (ISO), or null (never played). */
  lastPlayedAt: string | null
  /** The play streak as shown: 0 once it stopped. */
  streakDays: number
  /** Overall mastery (rule-based), or null while there aren't enough answers yet. */
  mastery: number | null
  /** A topic under 50%. */
  needsHelp: boolean
}

// ---------- A Student's levels (GET /api/students/:id/levels, step 8) ----------
// The difficulty engine is rule-based: the same answers always give the same levels.

export type LevelName = 'easy' | 'medium' | 'hard'
export type LevelChange = 'up' | 'down' | 'keep'

/** One answer: only right / helped, never the question. */
export interface LevelAnswer {
  right: boolean
  helped: boolean
}

/** One check made every 4 answers during a round (none for Match Up). */
export interface LevelCheck {
  from: number
  to: number
  answers: LevelAnswer[]
  /** Answers counted as right (Buddy Help answers don't count). */
  counted: number
  levelBefore: LevelName
  levelAfter: LevelName
  change: LevelChange
  /** false: the leftover answers at the end (fewer than 4), no decision. */
  decided: boolean
  /** e.g. "3 of 4 right, already the hardest level" */
  reason: string
}

export interface LevelRound {
  id: string
  game: TemplateId
  startedAt: string
  endedAt: string
  startLevel: LevelName
  endLevel: LevelName
  change: LevelChange
  /** e.g. "7 of 8 right (88%)" */
  reason: string
  right: number
  total: number
  helpsUsed: number
  answers: LevelAnswer[]
  checks: LevelCheck[]
}

export interface LevelTopic {
  topic: string
  /** Where the next round starts. */
  level: LevelName
  /** The review pack name, or the lesson title. */
  lesson: string
  roundCount: number
  /** Rule-based: percent is null while there are fewer than 8 answers. */
  mastery: { percent: number | null; answers: number }
  ups: number
  downs: number
  /** The newest 6, oldest first. */
  rounds: LevelRound[]
}

export interface StudentLevelsAnswer {
  student: {
    id: string
    schoolId: string
    buddy: string | null
    buddyName: string | null
    /** "Grade 4 – Sampaguita" */
    sectionName: string
    lastPlayedAt: string | null
    streakDays: number
    level: number
    xp: number
    xpIntoLevel: number
    xpGoal: number
    stars: number
    /** Different days this week (Mon–Sun, Philippine time) with a round: 0 to 7. */
    studyDaysThisWeek: number
    /** Review packs of their section they finished / all with a playable game. */
    packsDone: number
    packsTotal: number
    /** Overall mastery, or null while no topic has enough answers. */
    mastery: number | null
    needsHelp: boolean
  }
  topics: LevelTopic[]
}

// ---------- A section's progress (GET /api/sections/:id/progress, step 9) ----------
// Mastery is rule-based. Only registered Students count. Days are Philippine days
// ("2026-11-23").

export interface ProgressPack {
  assignmentId: string
  name: string
  lessonTitle: string
  /** The playable games. */
  games: TemplateId[]
  /** "2026-11-27", or null. */
  dueDate: string | null
  done: number
  /** Of the done ones: finished on or before the due day (always, with no due date). */
  onTime: number
  /** Of the done ones: finished after the due day. */
  late: number
  /** School ID order. */
  notDone: { studentId: string; schoolId: string }[]
  /** Done after the due day, School ID order. */
  doneLate: { studentId: string; schoolId: string }[]
}

export interface SectionProgress {
  registered: number
  today: { played: number }
  week: {
    /** Monday and Sunday of this week. */
    from: string
    to: string
    played: number
    /** null when nobody is registered. */
    studyDaysAverage: number | null
    /** 0 to 5 days always, 6 and 7 only when someone has them. */
    studyDays: { days: number; count: number }[]
    /** Mon to Fri always, Sat and Sun only when someone played. Future days: count null. */
    days: { day: string; weekday: string; count: number | null }[]
  }
  mastery: number | null
  needHelpCount: number
  /** Weakest first, topics without a percent last (A–Z). */
  topics: { topic: string; lesson: string; percent: number | null; needHelp: number; played: number }[]
  /** Lowest percent first. */
  needHelp: { studentId: string; schoolId: string; buddy: string | null; buddyName: string | null; topic: string; percent: number }[]
  /** Due soonest first, no due date last, then newest. */
  packs: ProgressPack[]
  neverPlayed: { studentId: string; schoolId: string; registeredAt: string | null }[]
}

export type SkipReason =
  | 'BAD_FORMAT'
  | 'DUPLICATE_IN_LIST'
  | 'ALREADY_IN_SECTION'
  | 'IN_ANOTHER_SECTION'
  /** Removed from this same section: Restore them instead. */
  | 'REMOVED_IN_SECTION'

/** The answer of POST /api/sections/:id/students. */
export interface AddStudentsAnswer {
  added: ServerStudent[]
  skipped: { schoolId: string; reason: SkipReason }[]
}

/** A review pack given to a section (GET /api/sections/:id/assignments). */
export interface ServerAssignment {
  id: string
  lessonId: string
  name: string
  games: TemplateId[]
  /** "2026-11-27", or null. */
  dueDate: string | null
  createdAt: string
}

export interface AssignInput {
  name: string
  games: TemplateId[]
  /** "2026-11-27", or null. */
  dueDate: string | null
}

// ---------- Calls ----------

const enc = encodeURIComponent

export const sectionsApi = {
  list: () => api<ServerSection[]>('/api/sections'),
  create: (grade: number, name: string) =>
    api<{ section: ServerSection }>('/api/sections', { method: 'POST', body: { grade, name } }).then((a) => a.section),
  students: (sectionId: string) => api<ServerStudent[]>(`/api/sections/${enc(sectionId)}/students`),
  addStudents: (sectionId: string, schoolIds: string[]) =>
    api<AddStudentsAnswer>(`/api/sections/${enc(sectionId)}/students`, { method: 'POST', body: { schoolIds } }),
  assignments: (sectionId: string) => api<ServerAssignment[]>(`/api/sections/${enc(sectionId)}/assignments`),
  /** Gives the lesson to the section as a review pack, or updates the pack given before. */
  assign: (sectionId: string, lessonId: string, input: AssignInput) =>
    api<{ assignment: ServerAssignment }>(`/api/sections/${enc(sectionId)}/assignments/${enc(lessonId)}`, {
      method: 'PUT',
      body: input,
    }).then((a) => a.assignment),
  /** A new one-time code (lost card or forgotten PIN code). Their buddy and progress are kept. */
  newCode: (studentId: string) =>
    api<{ student: ServerStudent }>(`/api/students/${enc(studentId)}/new-code`, { method: 'POST' }).then((a) => a.student),
  /** Remove: they can't log in and leave every list; nothing is deleted. */
  remove: (studentId: string) => api<{ ok: true }>(`/api/students/${enc(studentId)}/remove`, { method: 'POST' }),
  /** Restore a removed Student (409 SECTION_FULL when the section has 45). */
  restore: (studentId: string) =>
    api<{ student: ServerStudent }>(`/api/students/${enc(studentId)}/restore`, { method: 'POST' }).then((a) => a.student),
  /** Delete forever (removed Students only). The typed School ID must match theirs. */
  deleteForever: (studentId: string, schoolId: string) =>
    api<{ ok: true }>(`/api/students/${enc(studentId)}`, { method: 'DELETE', body: { schoolId } }),
  /** The section's removed Students, newest removed first. */
  removed: (sectionId: string) => api<ServerRemovedStudent[]>(`/api/sections/${enc(sectionId)}/removed`),
  /** A Student's level per topic and why (newest played topic first). */
  levels: (studentId: string) => api<StudentLevelsAnswer>(`/api/students/${enc(studentId)}/levels`),
  /** The section's mastery, study days and review packs (Home and Progress). */
  progress: (sectionId: string) => api<SectionProgress>(`/api/sections/${enc(sectionId)}/progress`),
}

/** React Query keys. */
export const sectionKeys = {
  list: ['sections'] as const,
  students: (sectionId: string) => ['sections', sectionId, 'students'] as const,
  assignments: (sectionId: string) => ['sections', sectionId, 'assignments'] as const,
  removed: (sectionId: string) => ['sections', sectionId, 'removed'] as const,
  studentLevels: (studentId: string) => ['teacher', 'student-levels', studentId] as const,
  progress: (sectionId: string) => ['teacher', 'section-progress', sectionId] as const,
}
