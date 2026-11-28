import { describe, expect, it } from 'vitest'
import { dueLabel, dueNote, firstPick, isoDay, isPastDue, nextFridayIso, pickedDueText, schoolWeeks } from './dueDates'

/** A local day at 9:00 (month is 1–12). */
const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9)
const isos = (weeks: ReturnType<typeof schoolWeeks>) => weeks.map((w) => w.map((d) => d?.iso ?? null))

describe('review pack due dates', () => {
  it('turns a day into YYYY-MM-DD and back into its label', () => {
    expect(isoDay(new Date(2026, 10, 27, 12))).toBe('2026-11-27')
    expect(dueLabel('2026-11-27')).toBe('Fri, Nov 27')
  })

  describe('dueNote (the assigned chip on My lessons)', () => {
    const today = on(2026, 11, 28)
    it('no due date', () => expect(dueNote(null, today)).toBe('Assigned · no due date'))
    it('a day before today is past due', () => {
      expect(dueNote('2026-11-27', today)).toBe('Past due · Nov 27')
      expect(isPastDue('2026-11-27', today)).toBe(true)
    })
    it('due today is not past due', () => {
      expect(dueNote('2026-11-28', today)).toBe('Due Sat, Nov 28')
      expect(isPastDue('2026-11-28', today)).toBe(false)
    })
    it('a future day', () => expect(dueNote('2026-12-04', today)).toBe('Due Fri, Dec 4'))
  })

  it('the picked text under the calendar', () => {
    expect(pickedDueText('2026-12-04')).toBe('Due Fri, Dec 4')
    expect(pickedDueText(null)).toBe('No due date')
  })

  it('next Friday is always after today', () => {
    expect(nextFridayIso(on(2026, 11, 23))).toBe('2026-11-27') // Monday
    expect(nextFridayIso(on(2026, 11, 27))).toBe('2026-12-04') // Friday
    expect(nextFridayIso(on(2026, 11, 28))).toBe('2026-12-04') // Saturday
  })
})

describe('schoolWeeks (the due date calendar)', () => {
  it('over a weekend: starts with next Monday, 4 full school weeks', () => {
    const weeks = schoolWeeks(on(2026, 11, 28)) // Saturday
    expect(isos(weeks)).toEqual([
      ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'],
      ['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11'],
      ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18'],
      ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25'],
    ])
    // A Sunday gives the same weeks.
    expect(isos(schoolWeeks(on(2026, 11, 29)))).toEqual(isos(weeks))
  })

  it('across a month end: the first tile and the 1st carry the month (5-due: NOV 30, DEC 1)', () => {
    const [first] = schoolWeeks(on(2026, 11, 28))
    expect(first.map((d) => d?.month ?? null)).toEqual(['NOV', 'DEC', null, null, null])
    expect(first.map((d) => d?.day)).toEqual([30, 1, 2, 3, 4])
  })

  it('on a Friday: this week shows only today, then 3 more weeks', () => {
    const weeks = schoolWeeks(on(2026, 11, 27))
    expect(isos(weeks)[0]).toEqual([null, null, null, null, '2026-11-27'])
    expect(weeks[0][4]?.month).toBe('NOV')
    expect(isos(weeks)[3]).toEqual(['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18'])
  })

  it('mid-week: days before today are never shown', () => {
    expect(isos(schoolWeeks(on(2026, 11, 25)))[0]).toEqual([null, null, '2026-11-25', '2026-11-26', '2026-11-27'])
  })

  it('what starts picked', () => {
    const today = on(2026, 11, 28)
    const weeks = schoolWeeks(today)
    expect(firstPick('2026-12-10', weeks, today)).toBe('2026-12-10') // shown: kept
    expect(firstPick('2026-11-27', weeks, today)).toBe('2026-12-04') // past: next Friday
    expect(firstPick('2027-03-01', weeks, today)).toBe('2026-12-04') // too far: next Friday
    expect(firstPick(null, weeks, today)).toBeNull() // no due date stays
  })
})
