import { useCallback, useMemo } from 'react'
import { fakeDraftsFor } from '../../mock/teacherMock'
import { useTestData } from './testDataContext'
import type { Draft, FileType, GameType, Lesson, Section, TeacherData, TodoItem } from './types'

/**
 * The only way Teacher screens read and change data.
 *
 * Today these hooks read the fake data (src/mock/teacherMock.ts) through the
 * test-data provider. When the backend exists, replace the insides of these
 * hooks with API calls; the screens don't need to change.
 */

/** "4 – Sampaguita" */
export const sectionLabel = (s: Section) => `${s.grade} – ${s.name}`

const nowLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function useTeacher() {
  return useTestData().data.teacher
}

export function useSection() {
  const { data, update } = useTestData()
  const active = data.sections.find((s) => s.id === data.activeSectionId) ?? data.sections[0]
  const setActive = useCallback((id: string) => update((d) => ({ ...d, activeSectionId: id })), [update])
  return { sections: data.sections, active, label: sectionLabel(active), setActive }
}

export function useStudents() {
  return useTestData().data.students
}

/** Numbers for Home: stats, weakest topics, the week chart and Ollie's note. */
export function useClassSummary() {
  const { data } = useTestData()
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

export function useTodos() {
  const { data, update } = useTestData()
  const toggle = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        todos: d.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : nowLabel() } : t)),
      })),
    [update],
  )
  return { todos: data.todos, upcoming: data.upcoming, toggle }
}

export interface LessonWithCounts extends Lesson {
  toCheck: number
  approved: number
}

const withCounts = (data: TeacherData) => (l: Lesson): LessonWithCounts => {
  const mine = data.drafts.filter((q) => q.lessonId === l.id)
  return {
    ...l,
    toCheck: mine.filter((q) => q.status === 'toCheck').length,
    approved: mine.filter((q) => q.status === 'approved').length,
  }
}

export interface NewLesson {
  fileName: string
  fileType: FileType
  fileSize: string
  topic: string
  subject: string
  games: GameType[]
}

/** Marks every To do that points at this lesson as done. */
const finishTodos = (todos: TodoItem[], kind: 'check' | 'games', lessonId: string) =>
  todos.map((t) =>
    !t.done && t.target.kind === kind && t.target.lessonId === lessonId ? { ...t, done: true, doneAt: nowLabel() } : t,
  )

export function useLessons() {
  const { data, update } = useTestData()
  const lessons = useMemo(() => data.lessons.map(withCounts(data)), [data])

  /** Adds an uploaded lesson (status "making"). Returns its id. */
  const addLesson = useCallback(
    (input: NewLesson) => {
      const id = `l${Date.now().toString(36)}`
      const lesson: Lesson = {
        id,
        title: input.fileName.replace(/\.(pdf|pptx)$/i, ''),
        fileName: input.fileName,
        fileType: input.fileType,
        // TODO: the real page count comes from the backend once the file is read.
        size: input.fileType === 'PDF' ? '8 pages' : '12 slides',
        fileSize: input.fileSize,
        uploaded: 'just now',
        topic: input.topic,
        subject: input.subject,
        games: input.games,
        status: 'making',
        makingStep: 1,
      }
      update((d) => ({ ...d, lessons: [lesson, ...d.lessons] }))
      return id
    },
    [update],
  )

  /** Fake progress while the "AI" drafts (5 steps). */
  const setMakingStep = useCallback(
    (id: string, step: number) =>
      update((d) => ({ ...d, lessons: d.lessons.map((l) => (l.id === id ? { ...l, makingStep: step } : l)) })),
    [update],
  )

  /** Drafting finished: the lesson gets its draft questions and a To do. */
  const finishMaking = useCallback(
    (id: string) =>
      update((d) => {
        const lesson = d.lessons.find((l) => l.id === id)
        if (!lesson || lesson.status !== 'making') return d
        // TODO: the drafts come from the backend (AI) once it exists.
        const drafts = fakeDraftsFor(id, lesson.topic).filter((q) => lesson.games.includes(q.game))
        const todo: TodoItem = {
          id: `t-${id}`,
          title: `Check ${drafts.length} AI-drafted questions`,
          detail: `${lesson.title} · hidden until approved`,
          action: 'Review',
          primary: true,
          target: { kind: 'check', lessonId: id },
          done: false,
        }
        return {
          ...d,
          lessons: d.lessons.map((l) => (l.id === id ? { ...l, status: 'toCheck', makingStep: 5 } : l)),
          drafts: [...d.drafts, ...drafts],
          todos: [todo, ...d.todos],
        }
      }),
    [update],
  )

  const assignLesson = useCallback(
    (id: string, dueLabel: string) =>
      update((d) => ({
        ...d,
        lessons: d.lessons.map((l) =>
          l.id === id ? { ...l, status: 'assigned', assignedNote: `due ${dueLabel.split(',')[0]}` } : l,
        ),
        todos: finishTodos(d.todos, 'games', id),
      })),
    [update],
  )

  return { lessons, addLesson, setMakingStep, finishMaking, assignLesson }
}

export function useLesson(id: string | undefined) {
  const { data } = useTestData()
  const lesson = data.lessons.find((l) => l.id === id)
  return lesson ? withCounts(data)(lesson) : undefined
}

/** After a draft changes: a lesson with nothing left to check is Ready. */
const settle = (d: TeacherData, lessonId: string): TeacherData => {
  const left = d.drafts.some((q) => q.lessonId === lessonId && q.status === 'toCheck')
  if (left) return d
  return {
    ...d,
    lessons: d.lessons.map((l) => (l.id === lessonId && l.status === 'toCheck' ? { ...l, status: 'ready' } : l)),
    todos: finishTodos(d.todos, 'check', lessonId),
  }
}

export function useDrafts(lessonId: string | undefined) {
  const { data, update } = useTestData()
  const drafts = useMemo(() => data.drafts.filter((q) => q.lessonId === lessonId), [data.drafts, lessonId])

  const updateDraft = useCallback(
    (id: string, patch: Partial<Draft>) =>
      update((d) => {
        const next = { ...d, drafts: d.drafts.map((q) => (q.id === id ? { ...q, ...patch } : q)) }
        return lessonId ? settle(next, lessonId) : next
      }),
    [update, lessonId],
  )

  const deleteDraft = useCallback(
    (id: string) =>
      update((d) => {
        const next = { ...d, drafts: d.drafts.filter((q) => q.id !== id) }
        return lessonId ? settle(next, lessonId) : next
      }),
    [update, lessonId],
  )

  /** "+ Add my own question": an empty Quiz Show question. Returns its id. */
  const addDraft = useCallback(() => {
    if (!lessonId) return undefined
    const id = `${lessonId}-own${Date.now().toString(36)}`
    update((d) => {
      const lesson = d.lessons.find((l) => l.id === lessonId)
      const draft: Draft = {
        id,
        lessonId,
        text: '',
        game: 'quiz',
        choices: ['', '', '', ''],
        right: 0,
        topic: lesson?.topic ?? '',
        level: 'easy',
        status: 'toCheck',
        source: { page: 0, quote: '', highlight: '' },
      }
      return {
        ...d,
        drafts: [...d.drafts, draft],
        lessons: d.lessons.map((l) => (l.id === lessonId && l.status === 'ready' ? { ...l, status: 'toCheck' } : l)),
      }
    })
    return id
  }, [update, lessonId])

  return { drafts, updateDraft, deleteDraft, addDraft }
}

/** The topics a question can belong to (Check page dropdown). */
export function useTopics() {
  const { data } = useTestData()
  return useMemo(() => [...new Set(data.lessons.map((l) => l.topic).concat(data.weakTopics.map((t) => t.topic)))], [data])
}

export function useReviewPackDefaults() {
  return { dueLabel: useTestData().data.nextDueLabel }
}
