import { createContext, useContext } from 'react'
import type { Student } from '../data/types'

/** The planner's popups that any page can open. */
export interface PlannerActions {
  /** The New section popup (Grade and section name). */
  newSection: () => void
  /** The Add students popup (School IDs only, no names). */
  addStudent: () => void
  /** The Give a new login code popup for one Student. */
  newCode: (student: Student) => void
}

export const PlannerActionsContext = createContext<PlannerActions>({ newSection: () => {}, addStudent: () => {}, newCode: () => {} })

export const usePlannerActions = () => useContext(PlannerActionsContext)
