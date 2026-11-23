import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '../../session/session'
import { TeacherDataContext } from './teacherDataContext'
import type { TeacherData } from './types'

/** "Sunday, November 15" */
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** The next Friday after today, for the review pack's due date: "Fri, Nov 21". */
function nextFriday(today: Date) {
  const d = new Date(today)
  d.setDate(d.getDate() + (((5 - d.getDay() + 7) % 7) || 7))
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** A brand-new Teacher: no To dos or numbers yet. Lessons, sections and Students come from the backend. */
function emptyData(): TeacherData {
  const today = new Date()
  return {
    // The real name comes from the session (see TeacherDataProvider).
    teacher: { name: '' },
    activeSectionId: '',
    todayLabel: dayLabel(today),
    weekSubject: '',
    stats: { playedToday: 0, reviewPackDone: null, reviewPackTotal: null, studyDays: null },
    todos: [],
    upcoming: [],
    weakTopics: [],
    week: [],
    ollieNote: 'Your class’s progress will show here after the first game.',
    justAdded: null,
    lessonNotes: {},
    checkSeenEnd: [],
    nextDueLabel: nextFriday(today),
  }
}

/**
 * Holds the Teacher Dashboard's in-memory data. It starts empty; what the Teacher adds
 * here (To dos, the open section tab) lives in memory until a refresh. Lessons,
 * sections and Students come from the backend (React Query, see useTeacherData.ts). The
 * Teacher's name comes from the login (the email until /api/auth/me answers).
 */
export function TeacherDataProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const name = user?.name || user?.username || ''
  const [data, setData] = useState(emptyData)
  const update = useCallback((change: (data: TeacherData) => TeacherData) => setData((d) => change(d)), [])
  const value = useMemo(() => ({ data: { ...data, teacher: { ...data.teacher, name } }, update }), [data, name, update])
  return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>
}
