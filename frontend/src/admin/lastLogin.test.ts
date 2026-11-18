import { describe, expect, it } from 'vitest'
import { lastLoginText } from './lastLogin'

// Local times, so the tests pass in any time zone.
const NOW = new Date(2026, 10, 18, 17, 30) // Nov 18, 2026, 5:30 PM
const at = (...parts: [number, number, number, number, number]) => new Date(...parts).toISOString()

describe('lastLoginText', () => {
  it('says Never when the Teacher never logged in', () => {
    expect(lastLoginText(null, NOW, 'en-US')).toBe('Never')
    expect(lastLoginText('not a date', NOW, 'en-US')).toBe('Never')
  })

  it('says Today with the time', () => {
    expect(lastLoginText(at(2026, 10, 18, 15, 15), NOW, 'en-US')).toBe('Today, 3:15 PM')
  })

  it('says Yesterday with the time, even just after midnight', () => {
    expect(lastLoginText(at(2026, 10, 17, 9, 2), NOW, 'en-US')).toBe('Yesterday, 9:02 AM')
    const justAfterMidnight = new Date(2026, 10, 18, 0, 5)
    expect(lastLoginText(at(2026, 10, 17, 23, 50), justAfterMidnight, 'en-US')).toBe('Yesterday, 11:50 PM')
  })

  it('shows the date for older logins, with the year only when it is another year', () => {
    expect(lastLoginText(at(2026, 10, 12, 15, 15), NOW, 'en-US')).toBe('Nov 12, 3:15 PM')
    expect(lastLoginText(at(2025, 11, 30, 8, 0), NOW, 'en-US')).toBe('Dec 30, 2025, 8:00 AM')
  })

  it('uses the given format (the phone’s own in the app)', () => {
    expect(lastLoginText(at(2026, 10, 18, 15, 15), NOW, 'en-GB')).toBe('Today, 15:15')
  })
})
