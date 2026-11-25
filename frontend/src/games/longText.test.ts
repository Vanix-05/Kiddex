import { describe, expect, it } from 'vitest'
import { answerSize, cardSize, isLongPrompt, longAttr } from './longText'

const text = (n: number) => 'x'.repeat(n)

describe('long answers: one size for the 4 tiles, by the longest choice', () => {
  it('24 characters: as usual', () => {
    expect(answerSize(['1/2', text(24), '3/4'])).toBe(0)
    expect(longAttr(answerSize([text(24)]))).toBeUndefined()
  })

  it('25 characters: smaller (26px)', () => {
    expect(answerSize(['1/2', text(25)])).toBe(1)
    expect(answerSize([text(44)])).toBe(1)
    expect(longAttr(answerSize([text(25)]))).toBe('1')
  })

  it('45 characters: smallest (22px)', () => {
    expect(answerSize([text(45), 'short'])).toBe(2)
    expect(longAttr(answerSize([text(45)]))).toBe('2')
  })

  it('the real example from mockup 4', () => {
    expect(answerSize(['Divide the numerator by the denominator', 'Multiply the numerator by the denominator', 'Add the top and bottom numbers', 'Subtract the bottom number from the top'])).toBe(1)
  })

  it('spaces around a choice do not count', () => {
    expect(answerSize([`  ${text(24)}  `])).toBe(0)
  })

  it('a question over 60 characters gets the smaller prompt', () => {
    expect(isLongPrompt(text(60))).toBe(false)
    expect(isLongPrompt(text(61))).toBe(true)
  })

  it('Match Up cards: each on its own', () => {
    expect(cardSize('one half')).toBe(0)
    expect(cardSize('The number on top of a fraction')).toBe(2)
    expect(cardSize('three fourths of it')).toBe(1)
  })
})
