import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FAKE_TEACHER_NAME } from '../../mock/teacherMock'
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

/** A brand-new Teacher: no sections, students, lessons or numbers yet. */
function emptyData(): TeacherData {
  const today = new Date()
  return {
    teacher: { name: FAKE_TEACHER_NAME },
    sections: [],
    activeSectionId: '',
    todayLabel: dayLabel(today),
    weekSubject: '',
    stats: { playedToday: 0, reviewPackDone: null, reviewPackTotal: null, studyDays: null },
    todos: [],
    upcoming: [],
    weakTopics: [],
    week: [],
    ollieNote: 'Your class’s progress will show here after the first game.',
    students: [],
    lessons: [],
    cards: [],
    sourceQuotes: {},
    editedCardIds: [],
    nextDueLabel: nextFriday(today),
  }
}

/**
 * Holds the Teacher Dashboard's data. It starts empty; what the Teacher adds
 * (sections, students, lessons, approvals) lives in memory until a refresh.
 * TODO: the backend keeps it once it exists (replace the hooks in useTeacherData.ts).
 */
export function TeacherDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData)
  const update = useCallback((change: (data: TeacherData) => TeacherData) => setData((d) => change(d)), [])
  const value = useMemo(() => ({ data, update }), [data, update])
  return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>
}
