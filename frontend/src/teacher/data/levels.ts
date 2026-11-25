/**
 * Words for a Student's levels (My Students and the Student's page). Pure functions.
 * The difficulty engine is rule-based: these only put its saved decisions into words.
 * Dates are in Philippine time (UTC+8, no daylight saving), like the backend's streak.
 */
import type { LevelChange, LevelCheck, LevelName, LevelRound } from '../api/sectionsApi'

const PH_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The moment shifted to Philippine time, read with the UTC getters. */
const ph = (ms: number) => new Date(ms + PH_OFFSET_MS)
/** The Philippine calendar day: "2026-11-23". */
const phDay = (ms: number) => ph(ms).toISOString().slice(0, 10)

/** "Today", "Yesterday", else "Nov 21" (Philippine time, no year). Null or a bad date → undefined. */
export function playedLabel(iso: string | null | undefined, now: Date = new Date()): string | undefined {
  if (!iso) return undefined
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return undefined
  const day = phDay(ms)
  if (day === phDay(now.getTime())) return 'Today'
  if (day === phDay(now.getTime() - DAY_MS)) return 'Yesterday'
  const d = ph(ms)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "2:15 PM" in Philippine time. */
export function phTime(iso: string): string {
  const d = ph(Date.parse(iso))
  const h = d.getUTCHours()
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "6 min" (at least 1). */
export function roundMinutes(startedAt: string, endedAt: string): string {
  const min = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000))
  return `${min} min`
}

/** The streak to show: 0 (or nothing) shows the dash, so undefined. */
export const streakShown = (days: number | null | undefined) => (days && days > 0 ? days : undefined)

export const LEVEL_NAME: Record<LevelName, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

/** "already the hardest" / "already the easiest" from a saved reason, else null. */
export function alreadyAtEnd(reason: string): 'hardest' | 'easiest' | null {
  if (reason.includes('already the hardest')) return 'hardest'
  if (reason.includes('already the easiest')) return 'easiest'
  return null
}

/** "7 of 8 right (88%)" from a saved round reason (without ", already the … level"). */
export const reasonScore = (reason: string) => reason.split(', already')[0]

/** The end box's line: what the round's result did to the next round's level. */
export interface EndLine {
  /** "80% or more" */
  lead: string
  /** "starts on" or "stays on" */
  verb: 'starts on' | 'stays on'
  level: LevelName
  /** "already the hardest" */
  note?: string
}

export function endLine(round: Pick<LevelRound, 'change' | 'reason' | 'endLevel'>): EndLine {
  const edge = alreadyAtEnd(round.reason)
  if (round.change === 'up') return { lead: '80% or more', verb: 'starts on', level: round.endLevel }
  if (round.change === 'down') return { lead: 'Under 50%', verb: 'starts on', level: round.endLevel }
  if (edge === 'hardest') return { lead: '80% or more', verb: 'stays on', level: round.endLevel, note: 'already the hardest' }
  if (edge === 'easiest') return { lead: 'Under 50%', verb: 'stays on', level: round.endLevel, note: 'already the easiest' }
  if (round.reason === 'no answers') return { lead: 'No answers', verb: 'stays on', level: round.endLevel }
  return { lead: 'Between 50% and 80%', verb: 'stays on', level: round.endLevel }
}

/** The end line as plain text, e.g. "80% or more, so the next round starts on Hard". */
export function endLineText(round: Pick<LevelRound, 'change' | 'reason' | 'endLevel'>): string {
  const l = endLine(round)
  return `${l.lead}, so the next round ${l.verb} ${LEVEL_NAME[l.level]}${l.note ? ` (${l.note})` : ''}`
}

/** A check box's outcome: "4 of 4 right → Hard", "2 of 4 right → stays Medium", "3 of 4 right → stays Hard (the hardest)". */
export interface CheckLine {
  score: string
  /** null: leftover answers, no decision. */
  stays: boolean | null
  level: LevelName
  note?: string
}

export function checkLine(c: LevelCheck): CheckLine {
  const score = `${c.counted} of ${c.answers.length} right`
  if (!c.decided) return { score, stays: null, level: c.levelAfter }
  if (c.change !== 'keep') return { score, stays: false, level: c.levelAfter }
  const edge = alreadyAtEnd(c.reason)
  return { score, stays: true, level: c.levelAfter, note: edge ? `the ${edge}` : undefined }
}

export function checkLineText(c: LevelCheck): string {
  const l = checkLine(c)
  if (l.stays === null) return `${l.score}: too few for a check`
  return `${l.score} → ${l.stays ? 'stays ' : ''}${LEVEL_NAME[l.level]}${l.note ? ` (${l.note})` : ''}`
}

export const changeWord = (c: LevelChange) => (c === 'up' ? 'went up' : c === 'down' ? 'went down' : 'stayed')
