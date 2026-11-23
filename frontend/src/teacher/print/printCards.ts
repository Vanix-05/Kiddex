import { createContext, useContext } from 'react'
import type { Section, Student } from '../data/types'

/** What one login card shows. No buddy, no avatar, no progress. */
export interface LoginCardInfo {
  id: string
  /** "2026-0191" */
  schoolId: string
  /** "482-915" */
  code: string
  /** "Grade 4 – Sampaguita" */
  section: string
  /** "Ms. Cruz" */
  teacher: string
}

/** 2 columns × 4 rows on each A4 page. */
export const CARDS_PER_PAGE = 8

export const pageCount = (cards: number) => Math.ceil(cards / CARDS_PER_PAGE)

/** Cards for the Students that have a one-time code (registered ones don't need a card). */
export function toLoginCards(students: Student[], section: Section, teacher: string): LoginCardInfo[] {
  const sectionName = `Grade ${section.grade} – ${section.name}`
  return students
    .filter((s) => !s.registered && s.oneTimeCode)
    .map((s) => ({ id: s.id, schoolId: s.schoolId, code: s.oneTimeCode ?? '', section: sectionName, teacher }))
}

/** Prints these cards with the browser's print (PrintCardsProvider). */
export type PrintCards = (cards: LoginCardInfo[]) => void

export const PrintCardsContext = createContext<PrintCards>(() => {})

export const usePrintCards = () => useContext(PrintCardsContext)
