import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '../../session/session'
import { TeacherDataContext } from './teacherDataContext'
import type { TeacherData } from './types'

/** "Sunday, November 15" */
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** A brand-new Teacher: nothing ticked yet. Lessons, sections, Students and progress come from the backend. */
function emptyData(): TeacherData {
  const today = new Date()
  return {
    // The real name comes from the session (see TeacherDataProvider).
    teacher: { name: '' },
    activeSectionId: '',
    todayLabel: dayLabel(today),
    todos: [],
    autoDone: {},
    justAdded: null,
    lessonNotes: {},
    checkSeenEnd: [],
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
