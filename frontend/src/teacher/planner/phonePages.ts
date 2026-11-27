import { createContext, useContext } from 'react'

/**
 * A phone held sideways shows one page of the planner's spread at a time:
 * page 1 is the left page, page 2 the right one (TeacherPlanner). Laptops and
 * tablets show both and ignore all of this.
 */
export type PageSide = 'L' | 'R'

export interface PhonePages {
  /** A phone held sideways (usePhoneSideways). */
  phone: boolean
  /** The page on show (always 'L' when not on a phone). */
  side: PageSide
  /** Phone: turn to that page of the spread (does nothing elsewhere). */
  turn?: (to: PageSide) => void
}

export const PhonePagesContext = createContext<PhonePages>({ phone: false, side: 'L' })

export const usePhonePages = () => useContext(PhonePagesContext)

/**
 * Navigation state for a tap on page 1 that is about something on page 2
 * (`navigate(to, { state: SHOW_PAGE_2 })`): on a phone the book turns to page
 * 2 by itself. Laptops show both pages and ignore it.
 */
export const SHOW_PAGE_2 = { phonePage: 2 } as const

/** Did this navigation ask for page 2? */
export const wantsPage2 = (state: unknown) => (state as { phonePage?: unknown } | null)?.phonePage === 2
