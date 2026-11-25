/**
 * Text sizes for long answers. Answers drafted from a lesson can be long ("Divide
 * the numerator by the denominator"): the games pick a smaller text size so the
 * words stay inside their tile, and never cut them off with "…". Pure functions.
 */

/** 0 = as usual, 1 = long, 2 = very long. */
export type LongLevel = 0 | 1 | 2

const length = (text: string) => [...text.trim()].length

/** By the longest of `texts`: up to `long` characters → 0, up to `veryLong` → 1, more → 2. */
function longLevel(texts: readonly string[], long: number, veryLong: number): LongLevel {
  const most = texts.reduce((m, t) => Math.max(m, length(t)), 0)
  if (most <= long) return 0
  if (most <= veryLong) return 1
  return 2
}

/**
 * Quiz Show (and the same board in Fill the Blank): one size for all 4 tiles, by
 * the longest choice of the question. Up to 24 characters as usual (32px),
 * 25 to 44 → 26px, 45 or more → 22px (never smaller).
 */
export const answerSize = (choices: readonly string[]): LongLevel => longLevel(choices, 24, 44)

/** A question over 60 characters uses a smaller prompt (34px instead of 40px). */
export const isLongPrompt = (prompt: string) => length(prompt) > 60

/**
 * Match Up: each card on its own (the cards have a fixed place, so they can't grow).
 * Up to 14 characters as usual, 15 to 28 on two lines, more on up to three.
 */
export const cardSize = (text: string): LongLevel => longLevel([text], 14, 28)

/** For data-long="1" / "2" (nothing when 0). */
export const longAttr = (level: LongLevel) => (level === 0 ? undefined : String(level))
