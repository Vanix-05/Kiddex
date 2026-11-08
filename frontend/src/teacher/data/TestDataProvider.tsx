import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { emptyData, sampleData } from '../../mock/teacherMock'
import { TestDataContext, type TestMode } from './testDataContext'
import type { TeacherData } from './types'

// TESTING TOOL: holds the fake data and the Sample data / Empty switch.
// Deleted together with src/mock/teacherMock.ts when the database is connected.

const STORAGE_KEY = 'kiddex.teacherTestMode'

function loadMode(): TestMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'empty' ? 'empty' : 'sample'
  } catch {
    return 'sample'
  }
}

function saveMode(mode: TestMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Storage blocked: the mode just isn't remembered.
  }
}

/**
 * Holds which fake data set the Teacher Dashboard shows ('sample' or 'empty')
 * and a working copy of each, so uploads and edits show up right away.
 * Edits live in memory only and reset on reload.
 */
export function TestDataProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TestMode>(loadMode)
  const [sets, setSets] = useState<Record<TestMode, TeacherData>>(() => ({
    sample: structuredClone(sampleData),
    empty: structuredClone(emptyData),
  }))

  const setMode = useCallback((next: TestMode) => {
    setModeState(next)
    saveMode(next)
  }, [])

  const update = useCallback(
    (change: (data: TeacherData) => TeacherData) => setSets((s) => ({ ...s, [mode]: change(s[mode]) })),
    [mode],
  )

  const value = useMemo(() => ({ mode, setMode, data: sets[mode], update }), [mode, setMode, sets, update])

  return <TestDataContext.Provider value={value}>{children}</TestDataContext.Provider>
}
