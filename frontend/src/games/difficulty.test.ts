import { describe, expect, it } from 'vitest'
import { decideAfterFour, decideAfterRound, decideDuringRound, levelOrder, pickCards } from './difficulty'

const R = true
const W = false

describe('during a round: every 4 answers', () => {
  it('4 of 4 right goes up', () => {
    expect(decideAfterFour([R, R, R, R], 'easy')).toEqual({ level: 'medium', change: 'up', reason: '4 of 4 right' })
  })

  it('3 of 4 right also goes up', () => {
    expect(decideAfterFour([R, W, R, R], 'medium').level).toBe('hard')
  })

  it('1 of 4 right goes down', () => {
    expect(decideAfterFour([W, R, W, W], 'medium')).toMatchObject({ level: 'easy', change: 'down' })
  })

  it('2 of 4 right keeps the level', () => {
    expect(decideAfterFour([R, W, R, W], 'medium')).toMatchObject({ level: 'medium', change: 'keep' })
  })

  it('hard can’t go higher', () => {
    const d = decideAfterFour([R, R, R, R], 'hard')
    expect(d).toMatchObject({ level: 'hard', change: 'keep' })
    expect(d.reason).toContain('already the hardest level')
  })

  it('easy can’t go lower', () => {
    const d = decideAfterFour([W, W, W, W], 'easy')
    expect(d).toMatchObject({ level: 'easy', change: 'keep' })
    expect(d.reason).toContain('already the easiest level')
  })

  it('only decides after 4, 8, 12 … answers', () => {
    expect(decideDuringRound([R, R, R], 'easy')).toBeNull()
    expect(decideDuringRound([R, R, R, R], 'easy')?.level).toBe('medium')
    // Only the last 4 count: 4 wrong after 4 right goes down.
    expect(decideDuringRound([R, R, R, R, W, W, W, W], 'medium')?.level).toBe('easy')
  })
})

describe('end of a round', () => {
  it('80% or more goes up', () => {
    expect(decideAfterRound([R, R, R, R, W], 'easy')).toEqual({ level: 'medium', change: 'up', reason: '4 of 5 right (80%)' })
  })

  it('under 50% goes down', () => {
    expect(decideAfterRound([R, W, W, R, W, W, R, W], 'medium')).toMatchObject({ level: 'easy', change: 'down' })
  })

  it('50% to 79% keeps the level', () => {
    expect(decideAfterRound([R, R, R, W, W], 'medium')).toMatchObject({ level: 'medium', change: 'keep' })
  })

  it('uses the level the round started at, not where the round ended', () => {
    // 7 of 8: the round started on easy (and moved up to hard on the way). Next round: one up from easy.
    const answers = [R, R, R, R, R, R, W, R]
    expect(decideAfterRound(answers, 'easy').level).toBe('medium')
    expect(decideAfterRound(answers, 'medium').level).toBe('hard')
  })
})

describe('picking cards', () => {
  it('takes the current level first, then the nearest', () => {
    expect(levelOrder('easy')).toEqual(['easy', 'medium', 'hard'])
    expect(levelOrder('hard')).toEqual(['hard', 'medium', 'easy'])
    const cards = [
      { id: 'h1', level: 'hard' as const },
      { id: 'm1', level: 'medium' as const },
      { id: 'e1', level: 'easy' as const },
      { id: 'e2', level: 'easy' as const },
    ]
    const picked = pickCards(cards, 'easy', 3, () => 0)
    expect(picked.map((c) => c.level)).toEqual(['easy', 'easy', 'medium'])
  })
})
