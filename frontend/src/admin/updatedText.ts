const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * "Updated just now", "Updated 1 min ago", "Updated 5 min ago", "Updated 1 hour ago"...
 * for the line next to the Refresh button. `lastUpdated` and `now` are in ms.
 */
export function updatedText(lastUpdated: number, now: number): string {
  const age = Math.max(0, now - lastUpdated)
  if (age < MINUTE) return 'Updated just now'
  if (age < HOUR) return `Updated ${Math.floor(age / MINUTE)} min ago`
  const hours = Math.floor(age / HOUR)
  return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
}
