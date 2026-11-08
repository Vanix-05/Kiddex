import { createContext, useContext } from 'react'
import type { TeacherData } from './types'

// TESTING TOOL: the "Test view: Sample data | Empty" switch. Delete this file,
// TestDataProvider.tsx and TestViewSwitch together with src/mock/teacherMock.ts
// when the database is connected.

export type TestMode = 'sample' | 'empty'

/** The switch shows in dev, or in a build made with VITE_SHOW_TEST_SWITCH=true. */
export const SHOW_TEST_SWITCH = import.meta.env.DEV || import.meta.env.VITE_SHOW_TEST_SWITCH === 'true'

export interface TestDataContextValue {
  mode: TestMode
  setMode: (mode: TestMode) => void
  /** The data for the current mode (a working copy: uploads and edits change it). */
  data: TeacherData
  /** Changes the current mode's working copy. */
  update: (change: (data: TeacherData) => TeacherData) => void
}

export const TestDataContext = createContext<TestDataContextValue | null>(null)

export function useTestData() {
  const ctx = useContext(TestDataContext)
  if (!ctx) throw new Error('useTestData must be used inside <TestDataProvider>')
  return ctx
}
