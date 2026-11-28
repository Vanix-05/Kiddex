/**
 * Review pack due dates. The screen shows labels ("Fri, Nov 27"); the backend
 * keeps the date only ("2026-11-27"). Both are the Teacher's own calendar day.
 */

const LABEL: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }

/** A local date → "2026-11-27". */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "2026-11-27" → that day (local, at noon so no clock change moves it). */
function dayOf(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** "2026-11-27" → "Fri, Nov 27" */
export const dueLabel = (iso: string) => dayOf(iso).toLocaleDateString('en-US', LABEL)

/** "2026-11-27" → "Nov 27" */
const shortDay = (iso: string) => dayOf(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** The due day is before today (the Teacher's calendar day). Due today is not past due. */
export const isPastDue = (iso: string | null, today = new Date()) => !!iso && iso < isoDay(today)

/**
 * The assigned chip on My lessons (1-list): "Assigned · no due date",
 * "Past due · Nov 27" (a day before today), or "Due Fri, Dec 4".
 */
export function dueNote(iso: string | null, today = new Date()): string {
  if (!iso) return 'Assigned · no due date'
  if (isPastDue(iso, today)) return `Past due · ${shortDay(iso)}`
  return `Due ${dueLabel(iso)}`
}

/** "Due Fri, Dec 4", or "No due date" (the picked text under the calendar). */
export const pickedDueText = (iso: string | null) => (iso ? `Due ${dueLabel(iso)}` : 'No due date')

/** The Friday after today ("2026-12-04" on Fri Nov 27 or Sat Nov 28): the usual due date. */
export function nextFridayIso(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return isoDay(d)
}

/** One tile of the due date calendar. */
export interface SchoolDay {
  iso: string
  /** 1 to 31 */
  day: number
  /** "NOV": shown on the first tile and on the 1st of a month. */
  month: string | null
}

/** How many school weeks the calendar shows. */
export const SCHOOL_WEEKS = 4

/**
 * The due date calendar: 4 school weeks (Mon to Fri), starting with the week of the
 * next school day (today on a weekday, else the next Monday). Days before today are
 * never shown (null). The first shown tile and the 1st of a month carry the month.
 */
export function schoolWeeks(today = new Date()): (SchoolDay | null)[][] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  // Saturday or Sunday: the next school day is Monday.
  if (start.getDay() === 6) start.setDate(start.getDate() + 2)
  if (start.getDay() === 0) start.setDate(start.getDate() + 1)
  const todayIso = isoDay(today)
  const monday = new Date(start)
  monday.setDate(monday.getDate() - (monday.getDay() - 1))

  let first = true
  return Array.from({ length: SCHOOL_WEEKS }, (_, w) =>
    Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + w * 7 + i)
      const iso = isoDay(d)
      if (iso < todayIso) return null
      const month = first || d.getDate() === 1 ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : null
      first = false
      return { iso, day: d.getDate(), month }
    }),
  )
}

/**
 * What the calendar starts with: no due date stays "No due date" (null); a saved
 * date in the shown weeks starts picked; otherwise (e.g. already past) next Friday.
 */
export function firstPick(saved: string | null, weeks: (SchoolDay | null)[][], today = new Date()): string | null {
  if (saved === null) return null
  if (weeks.some((row) => row.some((d) => d?.iso === saved))) return saved
  return nextFridayIso(today)
}
