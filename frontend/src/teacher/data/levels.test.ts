import { describe, expect, it } from 'vitest'
import type { LevelCheck, LevelRound, ServerStudent } from '../api/sectionsApi'
import { checkLineText, endLineText, phTime, playedLabel, reasonScore, roundMinutes, streakShown } from './levels'
import { toStudent } from './useTeacherData'

// 2026-11-25 10:00 in the Philippines (02:00 UTC).
const NOW = new Date('2026-11-25T02:00:00Z')

describe('playedLabel (Philippine time)', () => {
  it('today, yesterday, else "Nov 21"', () => {
    expect(playedLabel('2026-11-24T17:00:00Z', NOW)).toBe('Today') // 01:00 on the 25th in Manila
    expect(playedLabel('2026-11-24T15:59:00Z', NOW)).toBe('Yesterday') // 23:59 on the 24th
    expect(playedLabel('2026-11-23T16:00:00Z', NOW)).toBe('Yesterday') // 00:00 on the 24th
    expect(playedLabel('2026-11-21T05:00:00Z', NOW)).toBe('Nov 21')
    expect(playedLabel('2025-12-31T20:00:00Z', NOW)).toBe('Jan 1') // already Jan 1 in Manila, no year
  })

  it('no date shows the dash (undefined)', () => {
    expect(playedLabel(null, NOW)).toBeUndefined()
    expect(playedLabel('not a date', NOW)).toBeUndefined()
  })

  it('time and length of a round', () => {
    expect(phTime('2026-11-24T06:15:00Z')).toBe('2:15 PM')
    expect(phTime('2026-11-24T16:05:00Z')).toBe('12:05 AM')
    expect(roundMinutes('2026-11-24T06:09:00Z', '2026-11-24T06:15:10Z')).toBe('6 min')
    expect(roundMinutes('2026-11-24T06:15:00Z', '2026-11-24T06:15:10Z')).toBe('1 min')
  })
})

describe('My Students row', () => {
  const server: ServerStudent = {
    id: 's1',
    schoolId: '2026-0144',
    registered: true,
    oneTimeCode: null,
    buddy: 'fox',
    buddyName: 'Mochi',
    lastLoginAt: null,
    registeredAt: null,
    lastPlayedAt: '2026-11-24T17:00:00Z',
    streakDays: 6,
    mastery: 72,
    needsHelp: false,
  }

  it('fills Last played, Streak and Mastery', () => {
    const s = toStudent(server, NOW)
    expect(s.lastPlayed).toBe('Today')
    expect(s.streak).toBe(6)
    expect(s.mastery).toBe(72)
    expect(s.needsHelp).toBe(false)
  })

  it('mastery null (not enough answers yet) becomes undefined', () => {
    const s = toStudent({ ...server, mastery: null, needsHelp: true }, NOW)
    expect(s.mastery).toBeUndefined()
    expect(s.needsHelp).toBe(true)
  })

  it('a streak of 0 and no rounds show the dash', () => {
    const s = toStudent({ ...server, streakDays: 0, lastPlayedAt: null }, NOW)
    expect(s.streak).toBeUndefined()
    expect(s.lastPlayed).toBeUndefined()
    expect(streakShown(0)).toBeUndefined()
    expect(streakShown(3)).toBe(3)
  })
})

describe('end of round line', () => {
  const r = (change: LevelRound['change'], reason: string, endLevel: LevelRound['endLevel']) => ({ change, reason, endLevel })

  it('up', () => {
    expect(endLineText(r('up', '7 of 8 right (88%)', 'hard'))).toBe('80% or more, so the next round starts on Hard')
  })

  it('down', () => {
    expect(endLineText(r('down', '3 of 8 right (38%)', 'easy'))).toBe('Under 50%, so the next round starts on Easy')
  })

  it('keep', () => {
    expect(endLineText(r('keep', '5 of 8 right (63%)', 'medium'))).toBe('Between 50% and 80%, so the next round stays on Medium')
  })

  it('already the hardest / easiest', () => {
    expect(endLineText(r('keep', '8 of 8 right (100%), already the hardest level', 'hard'))).toBe(
      '80% or more, so the next round stays on Hard (already the hardest)',
    )
    expect(endLineText(r('keep', '0 of 8 right (0%), already the easiest level', 'easy'))).toBe(
      'Under 50%, so the next round stays on Easy (already the easiest)',
    )
  })

  it('the score without the "already" part', () => {
    expect(reasonScore('8 of 8 right (100%), already the hardest level')).toBe('8 of 8 right (100%)')
  })
})

describe('check line', () => {
  const ok = { right: true, helped: false }
  const no = { right: false, helped: false }
  const c = (extra: Partial<LevelCheck>): LevelCheck => ({
    from: 1,
    to: 4,
    answers: [ok, ok, ok, ok],
    counted: 4,
    levelBefore: 'medium',
    levelAfter: 'hard',
    change: 'up',
    decided: true,
    reason: '4 of 4 right',
    ...extra,
  })

  it('up, keep, already the hardest, leftover', () => {
    expect(checkLineText(c({}))).toBe('4 of 4 right → Hard')
    expect(checkLineText(c({ answers: [ok, ok, no, no], counted: 2, levelAfter: 'medium', change: 'keep', reason: '2 of 4 right' }))).toBe(
      '2 of 4 right → stays Medium',
    )
    expect(
      checkLineText(c({ counted: 3, levelBefore: 'hard', levelAfter: 'hard', change: 'keep', reason: '3 of 4 right, already the hardest level' })),
    ).toBe('3 of 4 right → stays Hard (the hardest)')
    expect(checkLineText(c({ from: 5, to: 6, answers: [ok, no], counted: 1, change: 'keep', decided: false, reason: '' }))).toBe(
      '1 of 2 right: too few for a check',
    )
  })
})
