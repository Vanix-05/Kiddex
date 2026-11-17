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
import { toScreenLesson } from './lessonMapping'
import { useTeacherStore } from './teacherDataContext'
import type { Lesson, LessonNote, QuestionCard, Section, TeacherData, TemplateId, TodoItem } from './types'

/**
 * The only way Teacher screens read and change data.
 *
 * Lessons and their questions come from the backend (React Query). Sections,
 * students, To dos and stats are still kept in memory (TeacherDataProvider):
 * they start empty and a refresh clears them. The screens don't need to change
 * when those get their own addresses too.
 */

/** "4 – Sampaguita" */
export const sectionLabel = (s: Section) => `${s.grade} – ${s.name}`

const nowLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** The open section, or undefined before the Teacher makes one. */
const activeSection = (d: TeacherData): Section | undefined => d.sections.find((s) => s.id === d.activeSectionId) ?? d.sections[0]

export function useTeacher() {
  return useTeacherStore().data.teacher
}

/** Each new section takes the next tab color and icon. */
const SECTION_LOOKS: Pick<Section, 'color' | 'icon'>[] = [
  { color: 'yellow', icon: 'flower' },
  { color: 'pink', icon: 'tulip' },
  { color: 'coral', icon: 'rose' },
]

export const SECTION_GRADES = [3, 4, 5, 6] as const

/** `active` is undefined until the Teacher makes their first section. */
export function useSection() {
  const { data, update } = useTeacherStore()
  const active = activeSection(data)
  const setActive = useCallback((id: string) => update((d) => ({ ...d, activeSectionId: id })), [update])

  /** Adds a section (e.g. Grade 4, "Sampaguita") and opens it. */
  const addSection = useCallback(
    (grade: number, name: string) =>
      update((d) => {
        const id = `sec-${Date.now().toString(36)}`
        const section: Section = { id, grade, name: name.trim(), ...SECTION_LOOKS[d.sections.length % SECTION_LOOKS.length] }
        return { ...d, sections: [...d.sections, section], activeSectionId: id }
      }),
    [update],
  )

  return { sections: data.sections, active, label: active ? sectionLabel(active) : '', setActive, addSection }
}

/** A 6-digit one-time code for a login card, e.g. "482-915". */
const oneTimeCode = () => {
  const n = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return `${n.slice(0, 3)}-${n.slice(3)}`
}

export function useStudents() {
  return useTeacherStore().data.students
}

/** Adds a student by name and School ID. They get a one-time code for their login card. */
export function useAddStudent() {
  const { update } = useTeacherStore()
  return useCallback(
    (name: string, schoolId: string) =>
      update((d) => ({
        ...d,
        students: [
          ...d.students,
          // TODO: the backend makes the student and their one-time code.
          { id: `s-${Date.now().toString(36)}`, name: name.trim(), schoolId: schoolId.trim(), registered: false, oneTimeCode: oneTimeCode() },
        ],
      })),
    [update],
  )
}

/** Numbers for Home: stats, weakest topics, the week chart and Ollie's note. */
export function useClassSummary() {
  const { data } = useTeacherStore()
  const registered = data.students.filter((s) => s.registered).length
  return {
    todayLabel: data.todayLabel,
    weekSubject: data.weekSubject,
    registered,
    total: data.students.length,
    stats: data.stats,
    weakTopics: data.weakTopics,
    week: data.week,
    ollieNote: data.ollieNote,
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

/** Marks every To do that points at this lesson as done. */
const finishTodos = (todos: TodoItem[], kind: 'check' | 'games', lessonId: string) =>
  todos.map((t) =>
    !t.done && t.target.kind === kind && t.target.lessonId === lessonId ? { ...t, done: true, doneAt: nowLabel() } : t,
  )

/** Changes the screen-only note of one lesson. */
const withNote = (d: TeacherData, id: string, change: Partial<LessonNote>): TeacherData => ({
  ...d,
  lessonNotes: { ...d.lessonNotes, [id]: { ...d.lessonNotes[id], ...change } },
})

/** My lessons, newest first. While any is being made, asks again every 3 seconds. */
export function useLessons() {
  const { data, update } = useTeacherStore()
  const query = useQuery({
    queryKey: lessonKeys.list,
    queryFn: lessonsApi.list,
    refetchInterval: (q) => (q.state.data?.some((l) => l.status === 'making') ? LIST_POLL_MS : false),
  })
  const { lessonNotes } = data
  const lessons = useMemo(
    () =>
      (query.data ?? []).map(
        (item): LessonWithCounts => ({
          ...toScreenLesson(item, lessonNotes[item.id]),
          toCheck: item.counts.toCheck,
          approved: item.counts.approved,
        }),
      ),
    [query.data, lessonNotes],
  )

  /** Assign stays on the screen for now (the backend has no assign yet). */
  const assignLesson = useCallback(
    (id: string, dueLabel: string) =>
      update((d) => ({ ...withNote(d, id, { assignedNote: `due ${dueLabel.split(',')[0]}` }), todos: finishTodos(d.todos, 'games', id) })),
    [update],
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
  const server = query.data
  const fetchedAt = query.dataUpdatedAt
  const lesson = useMemo((): LessonDetail | undefined => {
    if (!server) return undefined
    return {
      ...toScreenLesson(server, note),
      toCheck: server.counts.toCheck,
      approved: server.counts.approved,
      textLevel: server.textLevel,
      makingStep: server.makingStep,
      makingSeconds: server.seconds,
      fetchedAt,
      error: server.error,
      questions: [...server.questions].sort((a, b) => a.position - b.position),
    }
  }, [server, note, fetchedAt])
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

// ---------- To do ----------

/** A To do as Home shows it: always with a title. */
export type ShownTodo = TodoItem & { title: string }

/** "Check 7 AI-drafted questions" */
const checkTitle = (n: number) => `Check ${n} AI-drafted question${n === 1 ? '' : 's'}`

export function useTodos() {
  const { data, update } = useTeacherStore()
  const { lessons } = useLessons()
  const todos = useMemo(() => {
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
    const others = data.todos.filter((t) => t.target.kind !== 'check').map((t): ShownTodo => ({ ...t, title: t.title ?? '' }))
    return [...checks, ...others]
  }, [lessons, data.todos])
  const toggle = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        todos: d.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : nowLabel() } : t)),
      })),
    [update],
  )
  return { todos, upcoming: data.upcoming, toggle }
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

export function useReviewPackDefaults() {
  return { dueLabel: useTeacherStore().data.nextDueLabel }
}
