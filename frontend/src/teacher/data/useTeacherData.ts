import { useCallback, useEffect, useMemo } from 'react'
import { availableTemplates, MIN_CARDS, TEMPLATE_FOR_TYPE } from '../../content/questionCard'
import { fakeDraftsFor } from '../../mock/teacherMock'
import { useTestData } from './testDataContext'
import type { FileType, Lesson, QuestionCard, Section, TeacherData, TemplateId, TodoItem } from './types'

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

const activeSection = (d: TeacherData) => d.sections.find((s) => s.id === d.activeSectionId) ?? d.sections[0]

export function useTeacher() {
  return useTestData().data.teacher
}

export function useSection() {
  const { data, update } = useTestData()
  const active = activeSection(data)
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

/** A To do as Home shows it: always with a title. */
export type ShownTodo = TodoItem & { title: string }

/** "Check 7 AI-drafted questions" */
const checkTitle = (n: number) => `Check ${n} AI-drafted question${n === 1 ? '' : 's'}`

export function useTodos() {
  const { data, update } = useTestData()
  // "Check" items count the lesson's draft cards now, and leave the list at 0.
  const todos = useMemo(
    () =>
      data.todos.flatMap((t): ShownTodo[] => {
        if (t.target.kind !== 'check') return [{ ...t, title: t.title ?? '' }]
        const { lessonId } = t.target
        const left = data.cards.filter((c) => c.lessonId === lessonId && c.status === 'draft').length
        return left > 0 ? [{ ...t, title: checkTitle(left) }] : []
      }),
    [data.todos, data.cards],
  )
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

export interface LessonWithCounts extends Lesson {
  toCheck: number
  approved: number
}

const withCounts = (data: TeacherData) => (l: Lesson): LessonWithCounts => {
  const mine = data.cards.filter((c) => c.lessonId === l.id)
  return {
    ...l,
    toCheck: mine.filter((c) => c.status === 'draft').length,
    approved: mine.filter((c) => c.status === 'approved').length,
  }
}

export interface NewLesson {
  fileName: string
  fileType: FileType
  fileSize: string
  topic: string
  subject: string
  games: TemplateId[]
}

/** FAKE: the "AI" takes about this long to draft a lesson's questions. */
export const MAKING_MS = 6000

/** FAKE: what "reading" an uploaded file finds. TODO: the backend reads the real file. */
export const fakeFileFacts = (type: FileType) => ({ size: type === 'PPT' ? '12 slides' : '3 pages', words: 1240 })

/** Marks every To do that points at this lesson as done. */
const finishTodos = (todos: TodoItem[], kind: 'check' | 'games', lessonId: string) =>
  todos.map((t) =>
    !t.done && t.target.kind === kind && t.target.lessonId === lessonId ? { ...t, done: true, doneAt: nowLabel() } : t,
  )

/** Drafting finished: the lesson gets its question cards and a To do. */
const finishMaking = (d: TeacherData, id: string): TeacherData => {
  const lesson = d.lessons.find((l) => l.id === id)
  if (!lesson || lesson.status !== 'making') return d
  // TODO: the cards come from the backend (AI) once it exists.
  const { cards, quotes } = fakeDraftsFor(lesson, activeSection(d).grade)
  // No title: useTodos counts the draft cards left.
  const todo: TodoItem = {
    id: `t-${id}`,
    detail: `${lesson.title} · hidden until approved`,
    action: 'Review',
    primary: true,
    target: { kind: 'check', lessonId: id },
    done: false,
  }
  return {
    ...d,
    lessons: d.lessons.map((l) => (l.id === id ? { ...l, status: 'toCheck' } : l)),
    cards: [...d.cards, ...cards],
    sourceQuotes: { ...d.sourceQuotes, ...quotes },
    todos: [todo, ...d.todos],
  }
}

/**
 * FAKE "AI": finishes every lesson that's being made, MAKING_MS after its upload,
 * whichever page the Teacher is on. Mounted once, in the planner.
 */
export function useFakeMaking() {
  const { data, update } = useTestData()
  const making = data.lessons.filter((l) => l.status === 'making')
  const key = making.map((l) => `${l.id}@${l.makingStartedAt}`).join()
  useEffect(() => {
    if (!key) return
    const timers = key.split(',').map((entry) => {
      const [id, at] = entry.split('@')
      const wait = Math.max(0, Number(at) + MAKING_MS - Date.now())
      return window.setTimeout(() => update((d) => finishMaking(d, id)), wait)
    })
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [key, update])
}

export function useLessons() {
  const { data, update } = useTestData()
  const lessons = useMemo(() => data.lessons.map(withCounts(data)), [data])

  /** Adds an uploaded lesson (status "making"). Returns its id. */
  const addLesson = useCallback(
    (input: NewLesson) => {
      const id = `l${Date.now().toString(36)}`
      const lesson: Lesson = {
        id,
        title: input.fileName.replace(/\.(pdf|pptx|docx)$/i, ''),
        fileName: input.fileName,
        fileType: input.fileType,
        size: fakeFileFacts(input.fileType).size,
        fileSize: input.fileSize,
        uploaded: 'just now',
        topic: input.topic,
        subject: input.subject,
        games: input.games,
        status: 'making',
        makingStartedAt: Date.now(),
      }
      update((d) => ({ ...d, lessons: [lesson, ...d.lessons] }))
      return id
    },
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

  /** The games switched on for the review pack. */
  const setPackGames = useCallback(
    (id: string, games: TemplateId[]) => update((d) => ({ ...d, lessons: d.lessons.map((l) => (l.id === id ? { ...l, games } : l)) })),
    [update],
  )

  return { lessons, addLesson, assignLesson, setPackGames }
}

export function useLesson(id: string | undefined) {
  const { data } = useTestData()
  const lesson = data.lessons.find((l) => l.id === id)
  return lesson ? withCounts(data)(lesson) : undefined
}

/** After a card changes: a lesson with nothing left to check is Ready. */
const settle = (d: TeacherData, lessonId: string): TeacherData => {
  const left = d.cards.some((c) => c.lessonId === lessonId && c.status === 'draft')
  if (left) return d
  return {
    ...d,
    lessons: d.lessons.map((l) => (l.id === lessonId && l.status === 'toCheck' ? { ...l, status: 'ready' } : l)),
    todos: finishTodos(d.todos, 'check', lessonId),
  }
}

/** A lesson's question cards, and the Check page's changes to them. */
export function useCards(lessonId: string | undefined) {
  const { data, update } = useTestData()
  const cards = useMemo(() => data.cards.filter((c) => c.lessonId === lessonId), [data.cards, lessonId])
  const { sourceQuotes, editedCardIds } = data

  /** FAKE: the lesson quote for a card (not a card field). */
  const quoteFor = useCallback((id: string) => sourceQuotes[id], [sourceQuotes])
  const isEdited = useCallback((id: string) => editedCardIds.includes(id), [editedCardIds])

  /** An edit on the Check page (shown with a pencil until approved). */
  const editCard = useCallback(
    (id: string, patch: Partial<QuestionCard>) =>
      update((d) => ({
        ...d,
        cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        editedCardIds: d.editedCardIds.includes(id) ? d.editedCardIds : [...d.editedCardIds, id],
      })),
    [update],
  )

  /** The caller checks the card with QuestionCardSchema first. */
  const approveCard = useCallback(
    (id: string) =>
      update((d) => {
        const next = {
          ...d,
          cards: d.cards.map((c) => (c.id === id ? { ...c, status: 'approved' as const } : c)),
          editedCardIds: d.editedCardIds.filter((x) => x !== id),
        }
        return lessonId ? settle(next, lessonId) : next
      }),
    [update, lessonId],
  )

  const deleteCard = useCallback(
    (id: string) =>
      update((d) => {
        const next = { ...d, cards: d.cards.filter((c) => c.id !== id), editedCardIds: d.editedCardIds.filter((x) => x !== id) }
        return lessonId ? settle(next, lessonId) : next
      }),
    [update, lessonId],
  )

  /** "+ Add my own question": an empty Quiz Show card, no right answer yet. Returns its id. */
  const addCard = useCallback(() => {
    if (!lessonId) return undefined
    const id = `${lessonId}-own${Date.now().toString(36)}`
    update((d) => {
      const lesson = d.lessons.find((l) => l.id === lessonId)
      const card: QuestionCard = {
        id,
        lessonId,
        type: 'multiple_choice',
        prompt: '',
        choices: ['', '', '', ''],
        answer: '',
        subject: lesson?.subject ?? 'Math',
        topic: lesson?.topic ?? '',
        grade: activeSection(d).grade,
        level: 'easy',
        status: 'draft',
      }
      return {
        ...d,
        cards: [...d.cards, card],
        lessons: d.lessons.map((l) => (l.id === lessonId && l.status === 'ready' ? { ...l, status: 'toCheck' } : l)),
      }
    })
    return id
  }, [update, lessonId])

  return { cards, quoteFor, isEdited, editCard, approveCard, deleteCard, addCard }
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

/** The topics a question can belong to (Check page dropdown). */
export function useTopics() {
  const { data } = useTestData()
  return useMemo(() => [...new Set(data.lessons.map((l) => l.topic).concat(data.weakTopics.map((t) => t.topic)))], [data])
}

export function useReviewPackDefaults() {
  return { dueLabel: useTestData().data.nextDueLabel }
}
