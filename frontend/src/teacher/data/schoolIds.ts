/**
 * School IDs on the screen (the server checks them all again). Saved as 8 digits,
 * shown as "2026-0144". Students have NO names in KIDDEX: only a School ID.
 */

/** At most this many Students in one section (Master Brief 4.1). */
export const MAX_STUDENTS_PER_SECTION = 45

/** "2026-0144", "20260144" or "2026 0144" → "20260144"; anything else → null. */
export function cleanSchoolId(raw: string): string | null {
  // Spaces, "-" and the look-alike dashes Word or Sheets sometimes put in.
  const clean = raw.replace(/[\s\-‐-―−]/g, '')
  return /^\d{8}$/.test(clean) ? clean : null
}

/** "20260144" → "2026-0144". */
export const showSchoolId = (clean: string) => `${clean.slice(0, 4)}-${clean.slice(4)}`

/**
 * Splits a pasted list into School IDs: one per line, and also on commas, tabs and
 * semicolons (a column copied from Excel or Google Sheets). A piece with spaces is
 * kept whole when it is one School ID ("2026 0144"), else split on the spaces too.
 */
export function splitList(text: string): string[] {
  return text
    .split(/[\r\n,;\t]+/)
    .flatMap((piece) => (cleanSchoolId(piece) ? [piece] : piece.split(/\s+/)))
    .map((piece) => piece.trim())
    .filter(Boolean)
}

export type IdProblem = 'format' | 'twice' | 'inSection'

export interface CheckedId {
  /** What was typed, trimmed. */
  raw: string
  /** "2026-0144" when it is a School ID, else the raw text. */
  shown: string
  problem: IdProblem | null
}

/** Checks each School ID. `inSection` holds the section's School IDs in the shown form. */
export function checkIds(raws: string[], inSection: ReadonlySet<string>): CheckedId[] {
  const seen = new Set<string>()
  return raws.map((raw) => {
    const clean = cleanSchoolId(raw)
    if (!clean) return { raw, shown: raw, problem: 'format' }
    const shown = showSchoolId(clean)
    if (seen.has(shown)) return { raw, shown, problem: 'twice' }
    seen.add(shown)
    return { raw, shown, problem: inSection.has(shown) ? 'inSection' : null }
  })
}

/** "2026-019 needs 8 numbers", "2026-0144 is already in this section", … */
export function problemText({ shown, problem }: CheckedId): string {
  if (problem === 'twice') return `${shown} is in the list twice`
  if (problem === 'inSection') return `${shown} is already in this section`
  return /^[\d\s\-‐-―−]+$/.test(shown) ? `${shown} needs 8 numbers` : `${shown} is not a School ID`
}
