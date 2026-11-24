import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { finishRound, useRoundEnd, useStartLevel, withServerAnswer, type RoundEndDeps } from './roundEnd'
import type { PlayLesson } from './studentData'
import type { SavedRound } from './studentGames'
import { StudentPlayContext, type StudentPlay } from './studentPlay'
import type { GameResult } from './types'

const result = (rights: boolean[], lessonId = 'L1'): GameResult => ({
  clientRoundId: 'round-1',
  gameId: 'quiz-show',
  lessonId,
  topic: 'Water',
  startedAt: '2026-11-21T08:00:00.000Z',
  endedAt: '2026-11-21T08:05:00.000Z',
  answers: rights.map((right, i) => ({ cardId: `c${i}`, level: 'easy', right, tries: 1, ms: 1000, helped: false })),
  helpsUsed: 0,
})

const deps = (extra: Partial<RoundEndDeps> = {}): RoundEndDeps => ({
  student: { level: 3, xp: 120, xpGoal: 300, streakDays: 4 },
  mission: null,
  lessonGames: ['quiz-show', 'match-up'],
  lessonCanPlay: () => true,
  ...extra,
})

describe('finishRound', () => {
  it('works out stars, right answers, XP and the level decision at once', () => {
    const summary = finishRound('quiz-show', result([true, true, true, true]), 'easy', true, deps())
    expect(summary).toMatchObject({ roundId: 'round-1', right: 4, total: 4, xpGained: 30, decision: { level: 'medium', change: 'up' }, save: 'none' })
    expect(summary.xpBefore).toEqual({ level: 3, xp: 120, goal: 300 })
  })

  it('a preview has no Student mission, and Next game is the other playable game', () => {
    const fromQuiz = finishRound('quiz-show', result([true]), 'easy', true, deps())
    expect(fromQuiz.mission).toEqual({ games: [], done: [] })
    expect(fromQuiz.nextGame).toBe('match-up')

    const fromMatch = finishRound('match-up', { ...result([true]), gameId: 'match-up' }, 'easy', true, deps())
    expect(fromMatch.nextGame).toBe('quiz-show')

    const quizOnly = finishRound('quiz-show', result([true]), 'easy', true, deps({ lessonCanPlay: (g) => g === 'quiz-show' }))
    expect(quizOnly.nextGame).toBeNull()
  })

  it('the mission lesson: this game counts as done, Next game is the first one not done', () => {
    const summary = finishRound('quiz-show', result([true]), 'easy', false, deps({ mission: { games: ['quiz-show', 'match-up'], done: [] } }))
    expect(summary.mission).toEqual({ games: ['quiz-show', 'match-up'], done: ['quiz-show'] })
    expect(summary.nextGame).toBe('match-up')

    const last = finishRound('match-up', { ...result([true]), gameId: 'match-up' }, 'easy', false, deps({ mission: { games: ['quiz-show', 'match-up'], done: ['quiz-show'] } }))
    expect(last.mission.done).toEqual(['quiz-show', 'match-up'])
    expect(last.nextGame).toBeNull()
  })

  it('another lesson: no mission pill, Next game is that lesson’s next game', () => {
    const summary = finishRound('quiz-show', result([true]), 'easy', false, deps())
    expect(summary.mission).toEqual({ games: [], done: [] })
    expect(summary.nextGame).toBe('match-up')
  })
})

describe('withServerAnswer: Results use the server’s numbers', () => {
  it('takes the XP, decision, streak and mission done from the answer', () => {
    const local = finishRound('quiz-show', result([true]), 'easy', false, deps({ mission: { games: ['quiz-show', 'match-up'], done: [] } }))
    const answer: SavedRound = {
      round: { xp: 15, stars: 3, starsEarned: 0, decision: { level: 'medium', change: 'up', reason: '1 of 1 right (100%)' }, countsForMission: false, missionDone: ['quiz-show'] },
      progress: { xp: 315, level: 2, xpIntoLevel: 15, xpGoal: 300, stars: 9, streakDays: 5 },
    }
    expect(withServerAnswer(local, answer)).toMatchObject({ xpGained: 15, streakDays: 5, save: 'saved', mission: { done: ['quiz-show'] } })
  })
})

// ---------- The hooks, with and without the Student's data ----------

const lesson: PlayLesson = {
  id: 'L1',
  assignmentId: 'A1',
  name: 'Water Review',
  lessonTitle: 'Water',
  teacher: 'Ms. Cruz',
  subject: 'Science',
  assignedAt: '2026-11-20T00:00:00.000Z',
  games: [{ id: 'quiz-show', playable: true, bestStars: 0, done: false }],
  cards: [],
}

const studentPlay = (save: StudentPlay['save']): StudentPlay => ({
  progress: { xp: 340, level: 2, xpIntoLevel: 40, xpGoal: 300, stars: 12, streakDays: 3 },
  levels: { 'equivalent fractions': 'hard' },
  lessons: [lesson],
  mission: null,
  save,
})

/** Ends one round while rendering (enough to see whether it saves). */
function EndOneRound({ preview, onSummary }: { preview: boolean; onSummary: (s: unknown) => void }) {
  const end = useRoundEnd('quiz-show', () => true, preview)
  onSummary(end(result([true, true]), 'easy', true))
  return null
}

function StartLevelOf({ topic, preview = false }: { topic: string; preview?: boolean }) {
  return <>{useStartLevel(preview)(topic)}</>
}

describe('useRoundEnd: only a Student round is saved', () => {
  it('a Teacher preview never saves, even next to Student data', () => {
    const save = vi.fn<StudentPlay['save']>(() => new Promise(() => {}))
    let summary: unknown
    renderToStaticMarkup(
      <StudentPlayContext.Provider value={studentPlay(save)}>
        <EndOneRound preview onSummary={(s) => (summary = s)} />
      </StudentPlayContext.Provider>,
    )
    expect(save).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ save: 'none' })
  })

  it('without the Student data (the Teacher Preview and dev pages have none) nothing is saved', () => {
    let summary: unknown
    renderToStaticMarkup(<EndOneRound preview={false} onSummary={(s) => (summary = s)} />)
    expect(summary).toMatchObject({ save: 'none', xpBefore: { level: 1, xp: 0 } })
  })

  it('a Student round is sent once, under its assignment, with the card ids as question ids', () => {
    const save = vi.fn<StudentPlay['save']>(() => new Promise(() => {}))
    let summary: unknown
    renderToStaticMarkup(
      <StudentPlayContext.Provider value={studentPlay(save)}>
        <EndOneRound preview={false} onSummary={(s) => (summary = s)} />
      </StudentPlayContext.Provider>,
    )
    expect(save).toHaveBeenCalledOnce()
    const [body, topic] = save.mock.calls[0]
    expect(body).toMatchObject({ clientRoundId: 'round-1', assignmentId: 'A1', game: 'quiz-show', answers: [{ questionId: 'c0' }, { questionId: 'c1' }] })
    expect(topic).toBe('Water')
    expect(summary).toMatchObject({ save: 'saving', xpBefore: { level: 2, xp: 40, goal: 300 }, streakDays: 3 })
  })
})

describe('useStartLevel: the Student’s level for the round’s topic', () => {
  const withStudent = (topic: string) =>
    renderToStaticMarkup(
      <StudentPlayContext.Provider value={studentPlay(vi.fn())}>
        <StartLevelOf topic={topic} />
      </StudentPlayContext.Provider>,
    )

  it('reads levels[topic trimmed + lowercase]', () => {
    expect(withStudent('  Equivalent Fractions ')).toBe('hard')
  })

  it('a topic never played starts on easy', () => {
    expect(withStudent('Water')).toBe('easy')
  })

  it('a Teacher preview always starts on easy', () => {
    expect(
      renderToStaticMarkup(
        <StudentPlayContext.Provider value={studentPlay(vi.fn())}>
          <StartLevelOf topic="Equivalent Fractions" preview />
        </StudentPlayContext.Provider>,
      ),
    ).toBe('easy')
  })
})
