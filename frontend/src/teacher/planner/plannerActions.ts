import { createContext, useContext } from 'react'
import type { Student } from '../data/types'
import type { LessonPopup } from './LessonDialogs'

/** The planner's popups that any page can open. */
export interface PlannerActions {
  /** The New section popup (Grade and section name). */
  newSection: () => void
  /** The Add students popup (School IDs only, no names). */
  addStudent: () => void
  /** The Give a new login code popup for one Student. */
  newCode: (student: Student) => void
  /** The Remove this Student? popup. `onDone` runs after a Remove that worked. */
  removeStudent: (student: Student, onDone: (student: Student) => void) => void
  /** The Delete forever? popup (removed Students only). `onDone` runs after the delete. */
  deleteStudent: (student: Student, onDone: (student: Student) => void) => void
  /** A lesson popup (Delete, Archive, Delete forever, Change due date, Pick a due date). Closing gives focus back to what opened it. */
  lessonPopup: (popup: LessonPopup) => void
}

export const PlannerActionsContext = createContext<PlannerActions>({
  newSection: () => {},
  addStudent: () => {},
  newCode: () => {},
  removeStudent: () => {},
  deleteStudent: () => {},
  lessonPopup: () => {},
})

export const usePlannerActions = () => useContext(PlannerActionsContext)
