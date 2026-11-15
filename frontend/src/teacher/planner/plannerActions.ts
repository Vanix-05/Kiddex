import { createContext, useContext } from 'react'

/** The planner's popups that any page can open. */
export interface PlannerActions {
  /** The New section popup (Grade and section name). */
  newSection: () => void
  /** The Add student popup (name and School ID). */
  addStudent: () => void
}

export const PlannerActionsContext = createContext<PlannerActions>({ newSection: () => {}, addStudent: () => {} })

export const usePlannerActions = () => useContext(PlannerActionsContext)
