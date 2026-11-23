import { describe, expect, it } from 'vitest'
import { dueChoices, dueLabel, dueNote, isoDay } from './dueDates'

describe('review pack due dates', () => {
  it('turns a day into YYYY-MM-DD and back into its label', () => {
    expect(isoDay(new Date(2026, 10, 27, 12))).toBe('2026-11-27')
    expect(dueLabel('2026-11-27')).toBe('Fri, Nov 27')
    expect(dueNote('2026-11-27')).toBe('due Fri')
  })

  it('lists school days only, with the default first and a saved past date kept', () => {
    // Monday, Nov 23, 2026: next Friday is Nov 27.
    const today = new Date(2026, 10, 23, 9)
    const list = dueChoices('Fri, Nov 27', null, today)
    expect(list[0]).toEqual({ iso: '2026-11-27', label: 'Fri, Nov 27' })
    expect(list.every((c) => !c.label.startsWith('Sat') && !c.label.startsWith('Sun'))).toBe(true)
    expect(dueChoices('Fri, Nov 27', '2026-11-20', today)[0].iso).toBe('2026-11-20')
  })
})
