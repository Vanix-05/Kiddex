import { describe, expect, it } from 'vitest'
import { updatedText } from './updatedText'

const NOW = 1_000_000_000
const ago = (ms: number) => NOW - ms

describe('updatedText', () => {
  it('says just now for under a minute', () => {
    expect(updatedText(NOW, NOW)).toBe('Updated just now')
    expect(updatedText(ago(59_000), NOW)).toBe('Updated just now')
  })

  it('counts whole minutes', () => {
    expect(updatedText(ago(60_000), NOW)).toBe('Updated 1 min ago')
    expect(updatedText(ago(5 * 60_000 + 30_000), NOW)).toBe('Updated 5 min ago')
    expect(updatedText(ago(59 * 60_000), NOW)).toBe('Updated 59 min ago')
  })

  it('switches to hours after an hour', () => {
    expect(updatedText(ago(60 * 60_000), NOW)).toBe('Updated 1 hour ago')
    expect(updatedText(ago(3 * 60 * 60_000 + 1), NOW)).toBe('Updated 3 hours ago')
  })

  it('treats a time in the future (clock change) as just now', () => {
    expect(updatedText(NOW + 5000, NOW)).toBe('Updated just now')
  })
})
