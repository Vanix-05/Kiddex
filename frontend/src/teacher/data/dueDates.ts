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

/** "2026-11-27" → "due Fri" (the Lessons list: "Assigned · due Fri"). */
export const dueNote = (iso: string | null) =>
  iso ? `due ${dayOf(iso).toLocaleDateString('en-US', { weekday: 'short' })}` : 'no due date'

export interface DueChoice {
  iso: string
  label: string
}

/**
 * The due date list: the next school days (Monday to Friday), with the default
 * (`firstLabel`, next Friday) first. A saved date that is not in the list
 * (e.g. already past) is added at the top so it still shows.
 */
export function dueChoices(firstLabel: string, saved?: string | null, today = new Date()): DueChoice[] {
  const days: DueChoice[] = []
  const d = new Date(today)
  while (days.length < 8) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push({ iso: isoDay(d), label: d.toLocaleDateString('en-US', LABEL) })
  }
  const first = days.find((x) => x.label === firstLabel)
  const list = (first ? [first, ...days.filter((x) => x !== first)] : days).slice(0, 6)
  return saved && !list.some((x) => x.iso === saved) ? [{ iso: saved, label: dueLabel(saved) }, ...list] : list
}
