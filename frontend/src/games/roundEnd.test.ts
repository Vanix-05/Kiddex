import { describe, expect, it, vi } from 'vitest'
import { finishRound, type RoundEndDeps } from './roundEnd'
import type { GameResult } from './types'

const result = (rights: boolean[]): GameResult => ({
  gameId: 'quiz-show',
  lessonId: 'L1',
  topic: 'Water',
  startedAt: '2026-11-21T08:00:00.000Z',
  endedAt: '2026-11-21T08:05:00.000Z',
  answers: rights.map((right, i) => ({ cardId: `c${i}`, level: 'easy', right, tries: 1, ms: 1000, helped: false })),
  helpsUsed: 0,
})

const deps = () => ({
  student: { level: 3, xp: 120, xpGoal: 300, streakDays: 4 },
  missionGameCount: 2,
  playedToday: () => [],
  lessonCanPlay: () => true,
  saveRound: vi.fn<RoundEndDeps['saveRound']>(),
})

describe('finishRound: a Teacher preview saves nothing', () => {
  it('a preview round end does NOT call saveRound', () => {
    const d = deps()
    finishRound('quiz-show', result([true, true, true, true, false]), 'easy', true, true, d)
    expect(d.saveRound).not.toHaveBeenCalled()
  })

  it('a Student round end does call saveRound (with the XP and stars)', () => {
    const d = deps()
    const summary = finishRound('quiz-show', result([true, true, true, true]), 'easy', true, false, d)
    expect(d.saveRound).toHaveBeenCalledOnce()
    expect(d.saveRound).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'L1' }), 'medium', summary.xpGained, 3)
  })

  it('a preview still shows stars, right answers, XP a Student would get and the level decision', () => {
    const summary = finishRound('quiz-show', result([true, true, true, true]), 'easy', true, true, deps())
    expect(summary).toMatchObject({ right: 4, total: 4, xpGained: 30, decision: { level: 'medium', change: 'up' } })
  })

  it('a preview has no Student mission, and Next game is the other playable game', () => {
    const fromQuiz = finishRound('quiz-show', result([true]), 'easy', true, true, deps())
    expect(fromQuiz.mission).toEqual({ games: [], done: [] })
    expect(fromQuiz.nextGame).toBe('match-up')

    const fromMatch = finishRound('match-up', { ...result([true]), gameId: 'match-up' }, 'easy', true, true, deps())
    expect(fromMatch.nextGame).toBe('quiz-show')

    const quizOnly = finishRound('quiz-show', result([true]), 'easy', true, true, { ...deps(), lessonCanPlay: (g) => g === 'quiz-show' })
    expect(quizOnly.nextGame).toBeNull()
  })
})
