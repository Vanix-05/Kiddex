// The play streak, in Philippine calendar days (UTC+8, no daylight saving).
// Gentle on purpose: a gap just starts again at 1; nothing ever says the streak was lost.
// Pure functions: no database.

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Philippine calendar day of a moment: "2026-11-23". */
export const phDay = (date: Date) => new Date(date.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);

/** "2026-11-23" → "2026-11-22". */
const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);

/**
 * The streak after a round saved on `today`:
 *   same day as the last round → unchanged
 *   the day after              → +1
 *   anything else (or never)   → 1
 */
export function nextStreak(lastPlayDay: string | null, streakDays: number, today: string) {
  if (lastPlayDay === today) return { streakDays: Math.max(1, streakDays), lastPlayDay: today };
  if (lastPlayDay !== null && lastPlayDay === dayBefore(today))
    return { streakDays: streakDays + 1, lastPlayDay: today };
  return { streakDays: 1, lastPlayDay: today };
}
