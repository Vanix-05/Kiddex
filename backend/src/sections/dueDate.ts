// Due dates are a date only ("2026-11-27"). They are saved as noon Philippine
// time (UTC+8, so 04:00 UTC), which is the same calendar day everywhere from
// UTC-11 to UTC+12: the date never slips a day.

/** "2026-11-27" → that day at noon Philippine time, or null when it is not a real date. */
export function dueDateFromText(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
  // Rejects "2026-02-30" (Date would roll it over to March).
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** A saved due date → "2026-11-27" (its Philippine calendar day). */
export function dueDateText(date: Date): string {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
