/**
 * Words and rows for the Teacher's reports (Home, Progress, My Students). Pure functions.
 * Everything here is made from the backend's numbers by fixed rules (not AI): the same
 * progress always gives the same To dos and the same note from Ollie.
 * Days are Philippine calendar days ("2026-11-27"), like the backend.
 */
import type { ProgressPack, SectionProgress } from '../api/sectionsApi'
import type { Student, TodoItem } from './types'

const PH_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Under this: Needs help (the backend's rule, shown in words). */
export const HELP_BELOW = 50
/** A pack due within this many days is a To do and can be in Ollie's note. */
export const DUE_SOON_DAYS = 3

/** Today in the Philippines: "2026-11-25". */
export const phToday = (now: Date = new Date()) => new Date(now.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10)

/** "2026-11-27" read as a date (UTC getters give that calendar day). */
const dateOf = (day: string) => new Date(`${day}T00:00:00Z`)

/** Days from `from` to `to` (both "2026-11-27"): tomorrow is 1, yesterday -1. */
export const daysBetween = (from: string, to: string) => Math.round((dateOf(to).getTime() - dateOf(from).getTime()) / DAY_MS)

/** "Nov 27" */
export const shortDate = (day: string) => {
  const d = dateOf(day)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "Fri, Nov 27" */
export const dueDateLabel = (day: string) => `${WEEKDAYS[dateOf(day).getUTCDay()].slice(0, 3)}, ${shortDate(day)}`

/** "today", "tomorrow" or "Friday": for a day within the next week. */
export function dueWords(day: string, today: string): string {
  const diff = daysBetween(today, day)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return WEEKDAYS[dateOf(day).getUTCDay()]
}

/** "today's", "tomorrow's", "Friday's" */
const dueWordsOf = (day: string, today: string) => `${dueWords(day, today)}’s`

/** The due chip on a pack: "Due today", "Due tomorrow", "Due Fri, Nov 27", "Was due Nov 20". */
export function dueChip(day: string, today: string): { text: string; past: boolean } {
  const diff = daysBetween(today, day)
  if (diff < 0) return { text: `Was due ${shortDate(day)}`, past: true }
  if (diff === 0) return { text: 'Due today', past: false }
  if (diff === 1) return { text: 'Due tomorrow', past: false }
  return { text: `Due ${dueDateLabel(day)}`, past: false }
}

/** "this week (Nov 23–27)", Monday to Friday; "this week (Nov 30–Dec 4)" across months. */
export function weekLabel(monday: string): string {
  const friday = new Date(dateOf(monday).getTime() + 4 * DAY_MS).toISOString().slice(0, 10)
  const a = dateOf(monday)
  const b = dateOf(friday)
  const end = a.getUTCMonth() === b.getUTCMonth() ? String(b.getUTCDate()) : shortDate(friday)
  return `this week (${shortDate(monday)}–${end})`
}

/** A registration time (ISO) → its Philippine day "Nov 20". */
const phDateOf = (iso: string) => shortDate(phToday(new Date(iso)))

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** A pack due today or in the next 3 days that some Students haven't finished. */
const dueSoon = (p: ProgressPack, today: string) => {
  if (!p.dueDate || p.notDone.length === 0) return false
  const diff = daysBetween(today, p.dueDate)
  return diff >= 0 && diff <= DUE_SOON_DAYS
}

// ---------- Automatic To dos ----------

/** An automatic To do: always with a title. Ids start with "auto-". */
export type AutoTodo = Omit<TodoItem, 'done' | 'doneAt'> & { title: string }

/** "2026-0177, 2026-0162 (Fractions) · 2026-0165 (Plant Parts)": up to 3 Students, grouped by topic. */
function helpDetail(needHelp: SectionProgress['needHelp']): string {
  const groups: { topic: string; ids: string[] }[] = []
  for (const n of needHelp.slice(0, 3)) {
    const last = groups[groups.length - 1]
    if (last && last.topic === n.topic) last.ids.push(n.schoolId)
    else groups.push({ topic: n.topic, ids: [n.schoolId] })
  }
  const shown = groups.map((g) => `${g.ids.join(', ')} (${g.topic})`).join(' · ')
  return needHelp.length > 3 ? `${shown} · +${needHelp.length - 3} more` : shown
}

/**
 * The To dos made from the class's progress, in this order:
 * 1. Students under 50% in a topic → See who (My Students, Need help).
 * 2. The soonest pack due within 3 days that some haven't finished → Progress.
 * 3. Registered Students who never played → Open (one) or See who (more).
 */
export function autoTodos(progress: SectionProgress, today: string): AutoTodo[] {
  const todos: AutoTodo[] = []
  const help = progress.needHelp
  if (help.length > 0) {
    todos.push({
      id: 'auto-help',
      title: `${help.length} ${plural(help.length, 'Student needs', 'Students need')} help`,
      tag: 'below 50%',
      detail: helpDetail(help),
      action: 'See who',
      primary: true,
      target: { kind: 'students', filter: 'help' },
    })
  }

  const pack = progress.packs.find((p) => dueSoon(p, today))
  if (pack?.dueDate) {
    const n = pack.notDone.length
    todos.push({
      id: `auto-due-${pack.assignmentId}`,
      title: `${pack.name} is due ${dueWords(pack.dueDate, today)}`,
      detail: `${n} of ${progress.registered} ${plural(progress.registered, 'Student', 'Students')} ${plural(n, 'hasn’t', 'haven’t')} finished it yet`,
      action: 'Progress',
      target: { kind: 'progress' },
    })
  }

  const never = progress.neverPlayed
  if (never.length === 1) {
    const s = never[0]
    todos.push({
      id: 'auto-never',
      title: `${s.schoolId} hasn’t played yet`,
      detail: s.registeredAt ? `Registered ${phDateOf(s.registeredAt)} · no rounds so far` : 'No rounds so far',
      action: 'Open',
      target: { kind: 'student', studentId: s.studentId },
    })
  } else if (never.length > 1) {
    const ids = never.slice(0, 3).map((s) => s.schoolId).join(', ')
    todos.push({
      id: 'auto-never',
      title: `${never.length} Students haven’t played yet`,
      detail: `${ids}${never.length > 3 ? ` · +${never.length - 3} more` : ''} · no rounds so far`,
      action: 'See who',
      target: { kind: 'students' },
    })
  }
  return todos
}

// ---------- Ollie's note ----------

/** Nobody has played yet (or nobody is registered). */
export const nobodyPlayed = (p: SectionProgress) => p.neverPlayed.length >= p.registered

/**
 * Ollie's note on Home: the first rule that fits.
 * 1. Nobody played yet. 2. 2+ Students under 50% in the same topic. 3. A pack due
 * within 3 days with Students not done. 4. Someone never played. 5. All on track.
 */
export function ollieNote(p: SectionProgress, today: string): string {
  if (nobodyPlayed(p)) return 'Your class’s progress will show here after the first game.'

  const weak = p.topics.find((t) => t.needHelp >= 2)
  if (weak) {
    const pack = p.packs.find((k) => (k.name === weak.lesson || k.lessonTitle === weak.lesson) && dueSoon(k, today))
    const before = pack?.dueDate ? ` before ${dueWordsOf(pack.dueDate, today)} due date` : ''
    return `${weak.needHelp} Students are below 50% on ${weak.topic}. A short class review${before} could help.`
  }

  const pack = p.packs.find((k) => dueSoon(k, today))
  if (pack?.dueDate) {
    const n = pack.notDone.length
    return `${n} ${plural(n, 'Student hasn’t', 'Students haven’t')} finished ${pack.name} yet. It’s due ${dueWords(pack.dueDate, today)}.`
  }

  if (p.neverPlayed.length === 1) return `${p.neverPlayed[0].schoolId} hasn’t played yet. Maybe check their login card?`
  if (p.neverPlayed.length > 1) return `${p.neverPlayed.length} Students haven’t played yet. Maybe check their login cards?`

  return 'Everyone is on track this week. Nice work!'
}

// ---------- My Students ----------

/** The Mastery cell: a number, "Not enough yet" (played, under 8 answers) or the dash (never played). */
export type MasteryCell = { kind: 'percent'; percent: number } | { kind: 'notEnough' } | { kind: 'none' }

export function masteryCell(s: Pick<Student, 'mastery' | 'lastPlayed'>): MasteryCell {
  if (s.mastery !== undefined) return { kind: 'percent', percent: s.mastery }
  if (s.lastPlayed) return { kind: 'notEnough' }
  return { kind: 'none' }
}

/**
 * Packs in the order the screens show them: due today or later (soonest first), then
 * past due (most recent first), then no due date (the backend's order: newest first).
 */
export function orderPacks(packs: readonly ProgressPack[], today: string): ProgressPack[] {
  const upcoming = packs.filter((p) => p.dueDate && daysBetween(today, p.dueDate) >= 0)
  const past = packs.filter((p) => p.dueDate && daysBetween(today, p.dueDate) < 0).reverse()
  const none = packs.filter((p) => !p.dueDate)
  return [...upcoming, ...past, ...none]
}

/** The pack Home talks about: the next one due (an overdue one only when nothing is coming up). */
export const currentPack = (p: SectionProgress, today: string): ProgressPack | undefined => orderPacks(p.packs, today)[0]

/** The next packs with a due date from today on (at most 3), for Coming up. */
export const comingUp = (p: SectionProgress, today: string) =>
  p.packs.filter((k) => k.dueDate && daysBetween(today, k.dueDate) >= 0).slice(0, 3)

/** "FRI" and 27 for the little calendar. */
export const calendarOf = (day: string) => ({
  weekday: WEEKDAYS[dateOf(day).getUTCDay()].slice(0, 3).toUpperCase(),
  date: dateOf(day).getUTCDate(),
})
