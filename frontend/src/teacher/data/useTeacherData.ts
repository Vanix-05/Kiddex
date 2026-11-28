import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { availableTemplates, MIN_CARDS, TEMPLATE_FOR_TYPE } from '../../content/questionCard'
import { ApiError } from '../api/client'
import {
  lessonKeys,
  lessonsApi,
  type GenerateInput,
  type MakingStep,
  type NewQuestion,
  type QuestionEdit,
  type ServerLesson,
  type ServerQuestion,
  type TextLevel,
  type UploadPhase,
} from '../api/lessonsApi'
import {
  sectionKeys,
  sectionsApi,
  type AssignInput,
  type ServerAssignment,
  type ServerRemovedStudent,
  type ServerSection,
  type ServerStudent,
} from '../api/sectionsApi'
import { playedLabel, streakShown } from './levels'
import { autoTodos, phToday } from './reports'
import { archivedWhen, FILE_TYPE, lessonTitle, toScreenLesson } from './lessonMapping'
import { useTeacherStore } from './teacherDataContext'
import type {
  BuddyHead,
  Lesson,
  LessonNote,
  QuestionCard,
  Section,
  SectionColor,
  SectionIcon,
  Student,
  TeacherData,
  TemplateId,
  TodoItem,
} from './types'

/**
 * The only way Teacher screens read and change data.
 *
 * Lessons, their questions, sections, Students and the class's progress come from
 * the backend (React Query). Which To dos were ticked and the open section tab are
 * kept in memory (TeacherDataProvider): they start empty and a refresh clears them.
 */

/** "4 – Sampaguita" */
export const sectionLabel = (s: Section) => `${s.grade} – ${s.name}`

const nowLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function useTeacher() {
  return useTeacherStore().data.teacher
}

// ---------- Sections and Students (from the backend) ----------

export const SECTION_GRADES = [3, 4, 5, 6] as const

const SECTION_COLORS: SectionColor[] = ['yellow', 'pink', 'coral']
const SECTION_ICONS: SectionIcon[] = ['flower', 'tulip', 'rose']
const BUDDY_HEADS: BuddyHead[] = ['axolotl', 'dog', 'fox', 'kitty', 'monkey', 'otter', 'raccoon', 'ram']

const toSection = (s: ServerSection): Section => ({
  id: s.id,
  grade: s.grade,
  name: s.name,
  color: SECTION_COLORS.includes(s.color as SectionColor) ? (s.color as SectionColor) : 'yellow',
  icon: SECTION_ICONS.includes(s.icon as SectionIcon) ? (s.icon as SectionIcon) : 'flower',
  registeredCount: s.registeredCount,
  removedCount: s.removedCount ?? 0,
})

/** A buddy head the screens have a picture for, else undefined. */
export const toBuddyHead = (buddy: string | null | undefined): BuddyHead | undefined =>
  BUDDY_HEADS.includes(buddy as BuddyHead) ? (buddy as BuddyHead) : undefined

/**
 * Last played ("Today", "Yesterday", "Nov 21"), the streak (0 shows the dash) and
 * mastery (rule-based; null → undefined, "not enough yet") come from the saved rounds.
 */
export const toStudent = (s: ServerStudent, now: Date = new Date()): Student => ({
  id: s.id,
  schoolId: s.schoolId,
  registered: s.registered,
  oneTimeCode: s.oneTimeCode ?? undefined,
  buddy: toBuddyHead(s.buddy),
  buddyName: s.buddyName ?? undefined,
  lastPlayed: playedLabel(s.lastPlayedAt, now),
  streak: streakShown(s.streakDays),
  mastery: s.mastery ?? undefined,
  needsHelp: s.needsHelp,
})

/**
 * My sections (the tabs) and the open one. `active` is undefined until the
 * Teacher makes their first section (or while the list is loading). The open
 * tab is screen only: after a refresh the first section opens.
 */
export function useSection() {
  const { data, update } = useTeacherStore()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: sectionKeys.list, queryFn: sectionsApi.list })
  const sections = useMemo(() => (query.data ?? []).map(toSection), [query.data])
  const active = sections.find((s) => s.id === data.activeSectionId) ?? sections[0]
  const setActive = useCallback((id: string) => update((d) => ({ ...d, activeSectionId: id })), [update])

  /**
   * Saves a section (e.g. Grade 4, "Sampaguita") and opens its tab. Throws an
   * ApiError with the server's friendly message (e.g. 409 SECTION_TAKEN).
   */
  const addSection = useCallback(
    async (grade: number, name: string) => {
      const section = await sectionsApi.create(grade, name.trim())
      queryClient.setQueryData<ServerSection[]>(sectionKeys.list, (old) => [...(old ?? []).filter((s) => s.id !== section.id), section])
      void queryClient.invalidateQueries({ queryKey: sectionKeys.list })
      update((d) => ({ ...d, activeSectionId: section.id }))
    },
    [queryClient, update],
  )

  const retry = useCallback(() => void query.refetch(), [query])

  return {
    sections,
    active,
    label: active ? sectionLabel(active) : '',
    setActive,
    addSection,
    /** The first load (no list yet). */
    loading: query.isPending,
    /** The list could not be loaded (and there is none to show). */
    error: query.data ? null : query.error,
    retry,
  }
}

/** The open section's Students (School ID order), with loading and error for My Students. */
export function useStudentsLoad() {
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const query = useQuery({
    queryKey: sectionKeys.students(sectionId),
    queryFn: () => sectionsApi.students(sectionId),
    enabled: !!sectionId,
  })
  const students = useMemo(() => (query.data ?? []).map((s) => toStudent(s)), [query.data])
  const retry = useCallback(() => void query.refetch(), [query])
  return { students, loading: !!sectionId && query.isPending, error: query.data ? null : query.error, retry }
}

/**
 * One Student's level per topic and why (the Student's page in My Students).
 * Read only: rounds are saved by the games. A refresh of the page loads it again.
 */
export function useStudentLevels(studentId: string) {
  const query = useQuery({
    queryKey: sectionKeys.studentLevels(studentId),
    queryFn: () => sectionsApi.levels(studentId),
    enabled: !!studentId,
  })
  const retry = useCallback(() => void query.refetch(), [query])
  return { data: query.data, loading: query.isPending, error: query.data ? null : query.error, retry }
}

/** The open section's Students (empty while loading). */
export function useStudents() {
  return useStudentsLoad().students
}

/**
 * Adds Students to a section by School ID (no names). The server makes a one-time
 * code for each; the answer is kept for "Login codes are ready!" in My Students.
 * Throws an ApiError with the server's friendly message (e.g. 409 SECTION_FULL).
 */
export function useAddStudents() {
  const { update } = useTeacherStore()
  const queryClient = useQueryClient()
  return useCallback(
    async (sectionId: string, schoolIds: string[]) => {
      const answer = await sectionsApi.addStudents(sectionId, schoolIds)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sectionKeys.students(sectionId) }),
        queryClient.invalidateQueries({ queryKey: sectionKeys.list }),
      ])
      if (answer.added.length > 0) {
        update((d) => ({ ...d, justAdded: { sectionId, added: answer.added.map((s) => toStudent(s)), skipped: answer.skipped } }))
      }
      return answer
    },
    [queryClient, update],
  )
}

/**
 * "New code" for one Student: the server makes a new one-time code; their PIN
 * code stops working, their buddy and progress are kept. Returns the Student
 * with the new code. Throws an ApiError with the server's friendly message.
 */
export function useNewCode() {
  const queryClient = useQueryClient()
  return useCallback(
    async (studentId: string) => {
      const student = toStudent(await sectionsApi.newCode(studentId))
      // Every section list and count (the row is "Not yet" again).
      void queryClient.invalidateQueries({ queryKey: sectionKeys.list })
      return student
    },
    [queryClient],
  )
}

/** A removed Student as the Removed view shows them ("Today", "Yesterday", "Nov 24"). */
export interface RemovedStudent extends Student {
  removedLabel: string
}

export const toRemovedStudent = (s: ServerRemovedStudent, now: Date = new Date()): RemovedStudent => ({
  id: s.id,
  schoolId: s.schoolId,
  registered: s.registered,
  buddy: toBuddyHead(s.buddy),
  buddyName: s.buddyName ?? undefined,
  removedLabel: playedLabel(s.removedAt, now) ?? '',
})

/** The open section's removed Students, newest removed first (the Removed view). */
export function useRemovedStudents() {
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const query = useQuery({
    queryKey: sectionKeys.removed(sectionId),
    queryFn: () => sectionsApi.removed(sectionId),
    enabled: !!sectionId,
  })
  const removed = useMemo(() => (query.data ?? []).map((s) => toRemovedStudent(s)), [query.data])
  const retry = useCallback(() => void query.refetch(), [query])
  return { removed, loaded: !!query.data, loading: !!sectionId && query.isPending, error: query.data ? null : query.error, retry }
}

/**
 * Remove, Restore and Delete forever. Each one waits until every section list and
 * count is fresh (My Students, Removed, the tabs, Home and Progress), then returns.
 * Throws an ApiError with the server's friendly message (e.g. 409 SECTION_FULL).
 */
export function useStudentRemoval() {
  const queryClient = useQueryClient()
  const refresh = useCallback(
    () =>
      Promise.all([
        // ['sections'] also covers each section's Students and Removed lists.
        queryClient.invalidateQueries({ queryKey: sectionKeys.list }),
        queryClient.invalidateQueries({ queryKey: ['teacher', 'section-progress'] }),
      ]),
    [queryClient],
  )
  const remove = useCallback(
    async (studentId: string) => {
      await sectionsApi.remove(studentId)
      await refresh()
    },
    [refresh],
  )
  const restore = useCallback(
    async (studentId: string) => {
      const student = toStudent(await sectionsApi.restore(studentId))
      await refresh()
      return student
    },
    [refresh],
  )
  const deleteForever = useCallback(
    async (studentId: string, schoolId: string) => {
      await sectionsApi.deleteForever(studentId, schoolId)
      queryClient.removeQueries({ queryKey: sectionKeys.studentLevels(studentId) })
      await refresh()
    },
    [queryClient, refresh],
  )
  return { remove, restore, deleteForever }
}

/** "Login codes are ready!": the Students just added to the open section (null = show the list). */
export function useJustAdded() {
  const { data, update } = useTeacherStore()
  const { active } = useSection()
  const justAdded = data.justAdded && data.justAdded.sectionId === active?.id ? data.justAdded : null
  const clear = useCallback(() => update((d) => (d.justAdded ? { ...d, justAdded: null } : d)), [update])
  return { justAdded, clear }
}

/** Today's date line and the registered count for Home. The class's numbers come from useSectionProgress. */
export function useClassSummary() {
  const { data } = useTeacherStore()
  const students = useStudents()
  return {
    todayLabel: data.todayLabel,
    registered: students.filter((s) => s.registered).length,
    total: students.length,
  }
}

/**
 * The open section's progress (GET /api/sections/:id/progress): mastery, who needs
 * help, study days and review packs, for Home and Progress. Asked again when the
 * window gets focus, so a round played in another tab shows up.
 */
export function useSectionProgress() {
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const query = useQuery({
    queryKey: sectionKeys.progress(sectionId),
    queryFn: () => sectionsApi.progress(sectionId),
    enabled: !!sectionId,
    refetchOnWindowFocus: 'always',
  })
  const retry = useCallback(() => void query.refetch(), [query])
  return {
    progress: query.data,
    /** "2026-11-25": today in the Philippines, like the backend. */
    today: phToday(),
    loading: !!sectionId && query.isPending,
    error: query.data ? null : query.error,
    retry,
  }
}

// ---------- Lessons (from the backend) ----------

/** How often to ask again while the AI is making questions. */
const LIST_POLL_MS = 3000
const LESSON_POLL_MS = 2000

export interface LessonWithCounts extends Lesson {
  /** Questions still to check (drafts). */
  toCheck: number
  approved: number
  /** All its questions (the Delete popups say how many are erased). */
  questionCount: number
  /** How many different Students played it (My lessons only; 0 elsewhere). */
  playedBy: number
  /** The open section's review pack of this lesson (Change due date keeps its name and games). */
  pack?: ServerAssignment
}

/** A lesson in the Archived view. */
export interface ArchivedLesson {
  id: string
  title: string
  fileType: Lesson['fileType']
  playedBy: number
  questionCount: number
  /** "Archived today", "Archived yesterday" or "Archived Oct 30". */
  archivedLabel: string
}

/** One lesson with what the Making and Check pages need. */
export interface LessonDetail extends LessonWithCounts {
  textLevel: TextLevel
  makingStep: MakingStep | null
  /** Seconds since making started, as the server said at `fetchedAt` (ms). */
  makingSeconds: number | null
  fetchedAt: number
  /** Why making questions didn't work, in the server's friendly words. */
  error: { code: string; message: string } | null
  questions: ServerQuestion[]
}

/** Changes the screen-only note of one lesson. */
const withNote = (d: TeacherData, id: string, change: Partial<LessonNote>): TeacherData => ({
  ...d,
  lessonNotes: { ...d.lessonNotes, [id]: { ...d.lessonNotes[id], ...change } },
})

/** The open section's review packs, by lesson id (from the server). */
export function useSectionAssignments() {
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const query = useQuery({
    queryKey: sectionKeys.assignments(sectionId),
    queryFn: () => sectionsApi.assignments(sectionId),
    enabled: !!sectionId,
  })
  return useMemo(() => new Map((query.data ?? []).map((a): [string, ServerAssignment] => [a.lessonId, a])), [query.data])
}

/** Assign: which section, the pack name, the games and the due date ("2026-11-27" or null). */
export type AssignPack = AssignInput & { sectionId: string }

/** My lessons, newest first. While any is being made, asks again every 3 seconds. */
export function useLessons() {
  const { data, update } = useTeacherStore()
  const queryClient = useQueryClient()
  const assignments = useSectionAssignments()
  const query = useQuery({
    queryKey: lessonKeys.list,
    queryFn: lessonsApi.list,
    refetchInterval: (q) => (q.state.data?.some((l) => l.status === 'making') ? LIST_POLL_MS : false),
  })
  const { lessonNotes } = data
  const lessons = useMemo(
    () =>
      (query.data ?? []).map((item): LessonWithCounts => {
        const pack = assignments.get(item.id)
        return {
          ...toScreenLesson(item, lessonNotes[item.id], pack),
          toCheck: item.counts.toCheck,
          approved: item.counts.approved,
          questionCount: item.counts.total,
          playedBy: item.playedBy ?? 0,
          pack,
        }
      }),
    [query.data, lessonNotes, assignments],
  )

  /**
   * Saves the review pack on the server (or updates the one given before), then
   * refreshes that section's assignments. Throws an ApiError with the server's
   * friendly message (e.g. 409 LESSON_NOT_READY, 409 GAME_NOT_READY).
   */
  const assignLesson = useCallback(
    async (id: string, { sectionId, ...pack }: AssignPack) => {
      const saved = await sectionsApi.assign(sectionId, id, pack)
      queryClient.setQueryData<ServerAssignment[]>(sectionKeys.assignments(sectionId), (old) => [
        saved,
        ...(old ?? []).filter((a) => a.id !== saved.id),
      ])
      void queryClient.invalidateQueries({ queryKey: sectionKeys.assignments(sectionId) })
      return saved
    },
    [queryClient],
  )

  /** The games switched on for the review pack (screen only for now). */
  const setPackGames = useCallback((id: string, games: TemplateId[]) => update((d) => withNote(d, id, { games })), [update])

  return { lessons, loading: query.isPending, error: query.error, assignLesson, setPackGames }
}

/** One lesson (with its questions). While it is being made, asks again every 2 seconds. */
export function useLessonLoad(id: string | undefined) {
  const { data } = useTeacherStore()
  const query = useQuery({
    queryKey: lessonKeys.one(id ?? ''),
    queryFn: () => lessonsApi.get(id!),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'making' ? LESSON_POLL_MS : false),
  })
  const note = id ? data.lessonNotes[id] : undefined
  const assignment = useSectionAssignments().get(id ?? '')
  const server = query.data
  const fetchedAt = query.dataUpdatedAt
  const lesson = useMemo((): LessonDetail | undefined => {
    if (!server) return undefined
    return {
      ...toScreenLesson(server, note, assignment),
      toCheck: server.counts.toCheck,
      approved: server.counts.approved,
      questionCount: server.counts.total,
      playedBy: 0,
      pack: assignment,
      textLevel: server.textLevel,
      makingStep: server.makingStep,
      makingSeconds: server.seconds,
      fetchedAt,
      error: server.error,
      questions: [...server.questions].sort((a, b) => a.position - b.position),
    }
  }, [server, note, assignment, fetchedAt])
  const notFound = query.error instanceof ApiError && query.error.status === 404
  return { lesson, loading: query.isPending && !!id, notFound, error: query.error }
}

export function useLesson(id: string | undefined) {
  return useLessonLoad(id).lesson
}

/** Upload, delete and "Make questions" for the Lessons pages. Each keeps the cached lessons fresh. */
export function useLessonActions() {
  const queryClient = useQueryClient()

  const upload = useCallback(
    async (file: File, onProgress: (p: UploadPhase) => void, signal?: AbortSignal) => {
      const answer = await lessonsApi.upload(file, onProgress, signal)
      void queryClient.invalidateQueries({ queryKey: lessonKeys.list })
      return answer
    },
    [queryClient],
  )

  const removeLesson = useCallback(
    async (id: string) => {
      await lessonsApi.remove(id)
      queryClient.removeQueries({ queryKey: lessonKeys.one(id) })
      void queryClient.invalidateQueries({ queryKey: lessonKeys.list })
    },
    [queryClient],
  )

  const makeQuestions = useCallback(
    async (id: string, input: GenerateInput) => {
      await lessonsApi.generate(id, input)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lessonKeys.one(id) }),
        queryClient.invalidateQueries({ queryKey: lessonKeys.list }),
      ])
    },
    [queryClient],
  )

  return { upload, removeLesson, makeQuestions }
}

/** The Teacher's archived lessons, newest archived first ("Archived (N)" and the Archived view). */
export function useArchivedLessons() {
  const query = useQuery({ queryKey: lessonKeys.archived, queryFn: lessonsApi.archived })
  const archived = useMemo(
    () =>
      (query.data ?? []).map(
        (item): ArchivedLesson => ({
          id: item.id,
          title: lessonTitle(item.topic, item.fileName),
          fileType: FILE_TYPE[item.fileType],
          playedBy: item.playedBy,
          questionCount: item.counts.total,
          archivedLabel: archivedWhen(item.archivedAt),
        }),
      ),
    [query.data],
  )
  const retry = useCallback(() => void query.refetch(), [query])
  return { archived, loaded: !!query.data, loading: query.isPending, error: query.data ? null : query.error, retry }
}

/**
 * Delete, Archive, Restore, Delete forever and Change due date on My lessons. Each one
 * waits until the lists that show lessons and packs are fresh (My lessons, Archived,
 * every section's packs, Progress and the Student pages), then returns. Throws an
 * ApiError with the server's friendly message (e.g. 409 ARCHIVE_FIRST).
 */
export function useLessonArchive() {
  const queryClient = useQueryClient()
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const refresh = useCallback(
    () =>
      Promise.all([
        // ['lessons'] covers the Archived list too.
        queryClient.invalidateQueries({ queryKey: lessonKeys.list }),
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'sections' && q.queryKey[2] === 'assignments' }),
        queryClient.invalidateQueries({ queryKey: ['teacher', 'section-progress'] }),
        queryClient.invalidateQueries({ queryKey: ['teacher', 'student-levels'] }),
      ]),
    [queryClient],
  )
  const settle = useCallback(
    async (work: Promise<unknown>, lessonId: string, gone = false) => {
      try {
        await work
      } finally {
        // Also after an error (e.g. someone played it meanwhile): show what is true now.
        if (gone) queryClient.removeQueries({ queryKey: lessonKeys.one(lessonId) })
        await refresh()
      }
    },
    [queryClient, refresh],
  )
  const deleteLesson = useCallback((id: string) => settle(lessonsApi.remove(id), id, true), [settle])
  const deleteForever = useCallback((id: string) => settle(lessonsApi.remove(id, true), id, true), [settle])
  const archive = useCallback((id: string) => settle(lessonsApi.archive(id), id), [settle])
  const restore = useCallback((id: string) => settle(lessonsApi.restore(id), id), [settle])
  /** The pack's same name and games with a new due date ("2026-12-04", or null for none). */
  const saveDueDate = useCallback(
    (id: string, pack: Pick<ServerAssignment, 'name' | 'games'>, dueDate: string | null) =>
      settle(sectionsApi.assign(sectionId, id, { name: pack.name, games: pack.games, dueDate }), id),
    [settle, sectionId],
  )
  return { deleteLesson, deleteForever, archive, restore, saveDueDate }
}

// ---------- To do ----------

/** A To do as Home shows it: always with a title. */
export type ShownTodo = TodoItem & { title: string }

/** "Check 7 AI-drafted questions" */
const checkTitle = (n: number) => `Check ${n} AI-drafted question${n === 1 ? '' : 's'}`

export function useTodos() {
  const { data, update } = useTeacherStore()
  const { lessons } = useLessons()
  const { progress, today } = useSectionProgress()
  const todos = useMemo(() => {
    // Made from the class's progress (rule-based); ticked ones stay done for this session.
    const autos = (progress ? autoTodos(progress, today) : []).map(
      (t): ShownTodo => ({ ...t, done: t.id in data.autoDone, doneAt: data.autoDone[t.id] }),
    )
    // One "Check" item per lesson with drafts, from the backend's counts.
    const checks = lessons
      .filter((l) => l.toCheck > 0 && (l.status === 'toCheck' || l.status === 'ready'))
      .map(
        (l): ShownTodo => ({
          id: `check-${l.id}`,
          title: checkTitle(l.toCheck),
          detail: `${l.title} · hidden until approved`,
          action: 'Review',
          primary: true,
          target: { kind: 'check', lessonId: l.id },
          done: false,
        }),
      )
    const assigned = new Set(lessons.filter((l) => l.status === 'assigned').map((l) => l.id))
    const others = data.todos
      .filter((t) => t.target.kind !== 'check')
      .map((t): ShownTodo => {
        const shown = { ...t, title: t.title ?? '' }
        // "Assign …": done once the lesson is really assigned to this section.
        return t.target.kind === 'games' && !t.done && assigned.has(t.target.lessonId) ? { ...shown, done: true } : shown
      })
    return [...autos, ...checks, ...others]
  }, [lessons, data.todos, data.autoDone, progress, today])
  const toggle = useCallback(
    (id: string) =>
      update((d) => {
        if (id.startsWith('auto-')) {
          const { [id]: was, ...rest } = d.autoDone
          return { ...d, autoDone: was === undefined ? { ...rest, [id]: nowLabel() } : rest }
        }
        return {
          ...d,
          todos: d.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : nowLabel() } : t)),
        }
      }),
    [update],
  )
  return { todos, toggle }
}

// ---------- Question cards ----------

/** Positions 1, 2, 3… after a card is added or removed (Quiz Show, Match Up, Fill the Blank). */
const CARD_GAME_ORDER: TemplateId[] = ['quiz-show', 'match-up', 'fill-blank']
const renumberCards = (cards: ServerQuestion[]) =>
  [...cards]
    .sort(
      (a, b) =>
        CARD_GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[a.type]) - CARD_GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[b.type]) ||
        a.position - b.position,
    )
    .map((c, i) => (c.position === i + 1 ? c : { ...c, position: i + 1 }))

/**
 * A lesson's question cards (from the backend, in position order) and the
 * Check page's changes. Every change shows right away (optimistic) and is
 * saved on its own; if the server says no, the card goes back and the
 * function throws an ApiError with the server's friendly message.
 */
export function useCards(lessonId: string | undefined) {
  const queryClient = useQueryClient()
  const { lesson } = useLessonLoad(lessonId)
  const cards = useMemo(() => lesson?.questions ?? [], [lesson])

  /** Changes the cached lesson's questions; returns a function that puts them back. */
  const change = useCallback(
    async (update: (questions: ServerQuestion[]) => ServerQuestion[]) => {
      if (!lessonId) return () => undefined
      const key = lessonKeys.one(lessonId)
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<ServerLesson>(key)
      if (before) queryClient.setQueryData<ServerLesson>(key, { ...before, questions: update(before.questions) })
      return () => {
        if (before) queryClient.setQueryData(key, before)
      }
    },
    [queryClient, lessonId],
  )

  /** After a save: fresh lesson (its status may change) and fresh list counts. */
  const refresh = useCallback(() => {
    if (!lessonId) return
    void queryClient.invalidateQueries({ queryKey: lessonKeys.one(lessonId) })
    void queryClient.invalidateQueries({ queryKey: lessonKeys.list })
  }, [queryClient, lessonId])

  /** Runs a save with an optimistic change; undoes it and rethrows if the server says no. */
  const save = useCallback(
    async <T,>(update: (questions: ServerQuestion[]) => ServerQuestion[], call: () => Promise<T>): Promise<T> => {
      const undo = await change(update)
      try {
        const result = await call()
        refresh()
        return result
      } catch (err) {
        undo()
        throw err
      }
    },
    [change, refresh],
  )

  /** Saves an edit. A marked card counts as checked; an approved card goes back to check. */
  const editCard = useCallback(
    (id: string, edit: QuestionEdit) =>
      save(
        (qs) =>
          qs.map((q) =>
            q.id === id
              ? { ...q, ...edit, explanation: edit.explanation, status: 'draft' as const, flagChecked: q.flag ? true : q.flagChecked }
              : q,
          ),
        () => lessonsApi.editQuestion(id, edit),
      ),
    [save],
  )

  /** "Yes, keep it" for a marked card. */
  const keepCard = useCallback(
    (id: string) => save((qs) => qs.map((q) => (q.id === id ? { ...q, flagChecked: true } : q)), () => lessonsApi.keepQuestion(id)),
    [save],
  )

  const deleteCard = useCallback(
    (id: string) => save((qs) => renumberCards(qs.filter((q) => q.id !== id)), () => lessonsApi.removeQuestion(id)),
    [save],
  )

  /** The Teacher's own question, at the end of its game group. Returns the saved question. */
  const addCard = useCallback(
    (question: NewQuestion) => {
      if (!lessonId || !lesson) return Promise.reject(new ApiError('LESSON_NOT_FOUND', 'We could not find this lesson.'))
      const temp: ServerQuestion = {
        ...question,
        id: `new-${Date.now().toString(36)}`,
        lessonId,
        subject: lesson.subject,
        topic: lesson.topic,
        grade: lesson.grade ?? 4,
        status: 'draft',
        position: Number.MAX_SAFE_INTEGER,
        flagChecked: false,
        madeBy: 'teacher',
      }
      return save((qs) => renumberCards([...qs, temp]), () => lessonsApi.addQuestion(lessonId, question))
    },
    [save, lessonId, lesson],
  )

  /** Approves every card and the lesson. Throws MARKED_NOT_CHECKED / NO_QUESTIONS from the server. */
  const approveAll = useCallback(async () => {
    if (!lessonId) return
    const approved = await lessonsApi.approveAll(lessonId)
    queryClient.setQueryData(lessonKeys.one(lessonId), approved)
    void queryClient.invalidateQueries({ queryKey: lessonKeys.list })
  }, [queryClient, lessonId])

  return { cards, editCard, keepCard, deleteCard, addCard, approveAll, refresh }
}

/** Whether the Teacher read this lesson's Check list to the end once (this session). */
export function useCheckSeenEnd(lessonId: string | undefined) {
  const { data, update } = useTeacherStore()
  const seen = !!lessonId && data.checkSeenEnd.includes(lessonId)
  const markSeen = useCallback(() => {
    if (!lessonId) return
    update((d) => (d.checkSeenEnd.includes(lessonId) ? d : { ...d, checkSeenEnd: [...d.checkSeenEnd, lessonId] }))
  }, [update, lessonId])
  return { seen, markSeen }
}

/** Per game: approved cards, cards still to check, and whether it has enough to play (MIN_CARDS). */
export function useLessonGames(lessonId: string | undefined) {
  const { cards } = useCards(lessonId)
  return useMemo(() => {
    const count = (status: QuestionCard['status']) => {
      const n: Record<TemplateId, number> = { 'quiz-show': 0, 'match-up': 0, 'fill-blank': 0 }
      for (const c of cards) if (c.status === status) n[TEMPLATE_FOR_TYPE[c.type]]++
      return n
    }
    const approved = count('approved')
    return {
      approved,
      toCheck: count('draft'),
      ready: availableTemplates(cards),
      min: MIN_CARDS,
      approvedTotal: cards.filter((c) => c.status === 'approved').length,
      toCheckTotal: cards.filter((c) => c.status === 'draft').length,
    }
  }, [cards])
}
