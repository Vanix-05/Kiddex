// School IDs. Saved as 8 digits with no dash ("20260144"), shown everywhere as "2026-0144".
// Students have NO names in KIDDEX: the School ID is the only thing a Teacher types.

/**
 * Cleans what a Teacher typed or pasted: "2026-0144", "20260144" and "2026 0144"
 * all give "20260144". Anything that is not 8 digits after removing spaces and
 * dashes gives null.
 */
export function cleanSchoolId(raw: string): string | null {
  // Spaces, "-" and the look-alike dashes Word or Sheets sometimes put in (‐ – — −).
  const clean = raw.replace(/[\s\-‐-―−]/g, "");
  return /^\d{8}$/.test(clean) ? clean : null;
}

/** "20260144" → "2026-0144". */
export function showSchoolId(clean: string): string {
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}
