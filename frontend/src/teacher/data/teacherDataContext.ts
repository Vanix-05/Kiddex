import { createContext, useContext } from 'react'
import type { TeacherData } from './types'

export interface TeacherDataContextValue {
  /** Everything the dashboard shows. */
  data: TeacherData
  /** Changes it (in memory only for now: a refresh starts empty again). */
  update: (change: (data: TeacherData) => TeacherData) => void
}

export const TeacherDataContext = createContext<TeacherDataContextValue | null>(null)

/** For useTeacherData.ts only: screens use the hooks there. */
export function useTeacherStore() {
  const ctx = useContext(TeacherDataContext)
  if (!ctx) throw new Error('useTeacherStore must be used inside <TeacherDataProvider>')
  return ctx
}
