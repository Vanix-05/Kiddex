import { describe, expect, it } from 'vitest'
import { canPlay, CATALOG, catalogGame } from './catalog'

const quiz = catalogGame('quiz-show')!
const match = catalogGame('match-up')!

describe('canPlay', () => {
  it('plays a game when the lesson has enough approved cards of its type', () => {
    expect(canPlay(quiz, 'g4-fractions')).toEqual({ ok: true })
    expect(canPlay(match, 'g4-fractions')).toEqual({ ok: true })
    expect(canPlay(match, 'mixed')).toEqual({ ok: true })
  })

  it('says how many more cards are missing, in the card type’s words', () => {
    // Comparing Fractions has 2 approved pairs; Match Up needs 4.
    expect(canPlay(match, 'comparing')).toEqual({ ok: false, reason: 'Needs 2 more pairs' })
    expect(canPlay({ cardType: 'fill_blank' }, 'comparing')).toEqual({ ok: false, reason: 'Needs 2 more sentences' })
    expect(canPlay({ cardType: 'multiple_choice' }, 'nothing-here')).toEqual({ ok: false, reason: 'Needs 3 more questions' })
  })

  it('does not count drafts', () => {
    // Parts of a Whole: only drafts (the Teacher hasn't checked them yet).
    expect(canPlay(quiz, 'parts')).toEqual({ ok: false, reason: 'Needs 3 more questions' })
  })

  it('lists every built game once', () => {
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(CATALOG.length)
  })
})
