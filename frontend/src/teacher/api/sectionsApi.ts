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
  studentCount: number
  registeredCount: number
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
}

export type SkipReason = 'BAD_FORMAT' | 'DUPLICATE_IN_LIST' | 'ALREADY_IN_SECTION' | 'IN_ANOTHER_SECTION'

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
}

/** React Query keys. */
export const sectionKeys = {
  list: ['sections'] as const,
  students: (sectionId: string) => ['sections', sectionId, 'students'] as const,
  assignments: (sectionId: string) => ['sections', sectionId, 'assignments'] as const,
}
