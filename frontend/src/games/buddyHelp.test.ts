import { describe, expect, it } from 'vitest'
import { afterAnswer, MAX_HELPS, spendHelp, startHelp, streakLine, type HelpState } from './buddyHelp'

/** Plays answers in order: true = right, false = wrong; 'h' = right with help. */
function play(s: HelpState, answers: (boolean | 'h')[]) {
  let state = s
  let last = null as ReturnType<typeof afterAnswer>['event']
  for (const a of answers) {
    const r = afterAnswer(state, a !== false, a === 'h')
    state = r.state
    last = r.event
  }
  return { state, last }
}

describe('Buddy Help', () => {
  it('starts each round with 1 help', () => {
    expect(startHelp()).toEqual({ helps: 1, streak: 0, used: 0 })
  })

  it('3 right in a row gives 1 new help', () => {
    const { state, last } = play(startHelp(), [true, true, true])
    expect(state.helps).toBe(2)
    expect(state.streak).toBe(0)
    expect(last).toBe('earned')
  })

  it('a helped answer does not count toward the streak', () => {
    const { state } = play(startHelp(), [true, 'h', true])
    expect(state.streak).toBe(2)
    expect(state.helps).toBe(1)
  })

  it('a wrong answer resets the streak', () => {
    const { state } = play(startHelp(), [true, true, false, true])
    expect(state.streak).toBe(1)
    expect(state.helps).toBe(1)
  })

  it('never holds more than 2', () => {
    const { state, last } = play(startHelp(), [true, true, true, true, true, true])
    expect(state.helps).toBe(MAX_HELPS)
    expect(last).toBe('full')
  })

  it('using a help costs 1 and counts it; with 0 nothing happens', () => {
    const used = spendHelp(startHelp())
    expect(used).toEqual({ helps: 0, streak: 0, used: 1 })
    expect(spendHelp(used)).toBe(used)
  })

  it('says how far the next help is', () => {
    expect(streakLine({ helps: 1, streak: 0, used: 0 }, null)).toBe('Get 3 in a row')
    expect(streakLine({ helps: 1, streak: 1, used: 0 }, null)).toBe('2 more right')
    expect(streakLine({ helps: 1, streak: 2, used: 0 }, null)).toBe('1 more right')
    expect(streakLine({ helps: 2, streak: 0, used: 0 }, 'earned')).toBe('New help earned!')
  })
})
