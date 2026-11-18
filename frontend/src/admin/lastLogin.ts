/**
 * "Last login" on a Teacher card, in the phone's own date and time format:
 * "Never", "Today, 3:15 PM", "Yesterday, 9:02 AM", "Nov 12, 3:15 PM", or with
 * the year when it was another year ("Dec 30, 2025, 8:00 AM").
 * `locale` is only passed by the tests; the app uses the phone's own.
 */
export function lastLoginText(iso: string | null, now: Date = new Date(), locale?: string): string {
  if (!iso) return 'Never'
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return 'Never'

  const time = when.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const daysAgo = Math.round((dayStart(now) - dayStart(when)) / 86_400_000)

  if (daysAgo === 0) return `Today, ${time}`
  if (daysAgo === 1) return `Yesterday, ${time}`
  const date = when.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(when.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
  return `${date}, ${time}`
}
