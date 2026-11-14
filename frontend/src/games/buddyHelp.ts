/**
 * Buddy Help: the Student's buddy gives a hint they earned by playing. Pure
 * functions, no React.
 *
 * The rules
 * 1. Each round starts with 1 help. The Student can hold at most 2.
 * 2. 3 right answers in a row = 1 new help. With 2 already, the streak still
 *    finishes (and starts again), but the count stays at 2.
 * 3. A helped answer does not count toward the streak (right or not, the
 *    streak stays where it was). A wrong answer resets the streak to 0.
 * 4. Using a help costs 1. It can be used once per question (Quiz Show) or
 *    once per picked card (Match Up); the games check that part.
 * 5. Help only comes from playing: stars can never buy it (Master Brief 4.9).
 *
 * Helped answers are recorded (AnswerRecord.helped): the difficulty engine
 * counts them as not right, and they give less XP (see difficulty.ts, session.ts).
 */

export const START_HELPS = 1
export const MAX_HELPS = 2
export const STREAK_FOR_HELP = 3

export interface HelpState {
  /** Helps the Student holds now (0..MAX_HELPS). */
  helps: number
  /** Right answers in a row (0..STREAK_FOR_HELP - 1). */
  streak: number
  /** Helps used this round (saved as GameResult.helpsUsed). */
  used: number
}

/** What the last answer did: earned a help, finished a streak with the count already full, or nothing. */
export type HelpEvent = 'earned' | 'full' | null

export const startHelp = (): HelpState => ({ helps: START_HELPS, streak: 0, used: 0 })

export const canSpend = (s: HelpState) => s.helps > 0

/** Rule 4: one help used (nothing happens with 0). */
export function spendHelp(s: HelpState): HelpState {
  if (!canSpend(s)) return s
  return { ...s, helps: s.helps - 1, used: s.used + 1 }
}

/** Rules 2 and 3: the help state after one answer. */
export function afterAnswer(s: HelpState, right: boolean, helped: boolean): { state: HelpState; event: HelpEvent } {
  if (!right) return { state: { ...s, streak: 0 }, event: null }
  if (helped) return { state: s, event: null }
  const streak = s.streak + 1
  if (streak < STREAK_FOR_HELP) return { state: { ...s, streak }, event: null }
  if (s.helps >= MAX_HELPS) return { state: { ...s, streak: 0 }, event: 'full' }
  return { state: { ...s, streak: 0, helps: s.helps + 1 }, event: 'earned' }
}

/** The short line under "Buddy Help": how far the next help is. */
export function streakLine(s: HelpState, event: HelpEvent): string {
  if (event === 'earned') return 'New help earned!'
  const left = STREAK_FOR_HELP - s.streak
  return s.streak === 0 ? 'Get 3 in a row' : `${left} more right`
}
