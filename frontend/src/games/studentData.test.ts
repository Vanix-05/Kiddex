import { describe, expect, it } from 'vitest'
import { dueText, makeBoard, missionOf, roundBody, soonestAssignment, withSavedRound } from './studentData'
import type { ServerLesson, StudentGames } from './studentGames'

describe('due-date text', () => {
  it('the card says the whole day name, the note a short one', () => {
    expect(dueText('2026-11-27', '2026-11-24', 'card')).toBe('Due Friday, Nov 27')
    expect(dueText('2026-11-27', '2026-11-24', 'note')).toBe('due Fri, Nov 27')
  })

  it('the due day itself is still "Due"', () => {
    expect(dueText('2026-11-24', '2026-11-24', 'card')).toBe('Due Tuesday, Nov 24')
  })

  it('a past date says "Was due" (no shaming)', () => {
    expect(dueText('2026-11-20', '2026-11-24', 'card')).toBe('Was due Friday, Nov 20')
    expect(dueText('2026-11-20', '2026-11-24', 'note')).toBe('was due Fri, Nov 20')
  })

  it('works across months and years', () => {
    expect(dueText('2027-01-01', '2026-12-30', 'card')).toBe('Due Friday, Jan 1')
  })
})

const lesson = (extra: Partial<ServerLesson> = {}): ServerLesson => ({
  assignmentId: 'A1',
  lessonId: 'L1',
  name: 'Fractions Review',
  lessonTitle: 'Equivalent Fractions',
  subject: 'Math',
  grade: 4,
  teacher: 'Ms. Cruz',
  dueDate: '2026-11-27',
  assignedAt: '2026-11-23T00:00:00.000Z',
  games: [
    { id: 'quiz-show', playable: true, bestStars: 0, done: false },
    { id: 'match-up', playable: true, bestStars: 0, done: false },
  ],
  cards: [],
  ...extra,
})

const games = (extra: Partial<StudentGames> = {}): StudentGames => ({
  progress: { xp: 340, level: 2, xpIntoLevel: 40, xpGoal: 300, stars: 12, streakDays: 3 },
  levels: {},
  lessons: [lesson()],
  mission: { assignmentId: 'A1', state: 'open', games: ['quiz-show', 'match-up'], done: [], maxXp: 85, board: { keyWords: [], keyIdeas: [] } },
  ...extra,
})

describe('missionOf', () => {
  it('an open mission, with the pack name, lesson, Teacher and due date', () => {
    expect(missionOf(games())).toMatchObject({
      state: 'open',
      lessonId: 'L1',
      name: 'Fractions Review',
      lessonTitle: 'Equivalent Fractions',
      teacher: 'Ms. Cruz',
      dueDate: '2026-11-27',
      games: ['quiz-show', 'match-up'],
      maxXp: 85,
    })
  })

  it('no mission: the newest lesson’s Teacher, or "your teacher" with no lessons', () => {
    expect(missionOf(games({ mission: null }))).toMatchObject({ state: 'none', teacher: 'Ms. Cruz', hasLessons: true })
    expect(missionOf(games({ mission: null, lessons: [] }))).toMatchObject({ state: 'none', teacher: '', hasLessons: false })
  })
})

describe('saving a round', () => {
  it('sends the card ids as question ids, with tries and help in range', () => {
    const body = roundBody(
      {
        clientRoundId: 'r1',
        gameId: 'match-up',
        lessonId: 'L1',
        topic: 'Fractions',
        startedAt: 'a',
        endedAt: 'b',
        helpsUsed: 9,
        answers: [{ cardId: 'card-7', level: 'easy', right: true, tries: 0, ms: 1234.6, helped: false }],
      },
      'A1',
    )
    expect(body).toEqual({
      clientRoundId: 'r1',
      assignmentId: 'A1',
      game: 'match-up',
      startedAt: 'a',
      endedAt: 'b',
      helpsUsed: 1,
      answers: [{ questionId: 'card-7', right: true, tries: 1, ms: 1235, helped: false }],
    })
  })

  it('the cache takes the server’s progress, level, stars and mission', () => {
    const before = games({ mission: { ...games().mission!, done: ['quiz-show'] } })
    const after = withSavedRound(before, roundBody({ clientRoundId: 'r', gameId: 'match-up', lessonId: 'L1', topic: ' Fractions ', startedAt: '', endedAt: '', helpsUsed: 0, answers: [] }, 'A1'), ' Fractions ', {
      round: { xp: 35, stars: 3, starsEarned: 3, decision: { level: 'medium', change: 'up', reason: '5 of 5 right (100%)' }, countsForMission: true, missionDone: ['quiz-show', 'match-up'] },
      progress: { xp: 375, level: 2, xpIntoLevel: 75, xpGoal: 300, stars: 15, streakDays: 3 },
    })
    expect(after.progress.xp).toBe(375)
    expect(after.levels).toEqual({ fractions: 'medium' })
    expect(after.mission).toMatchObject({ state: 'complete', done: ['quiz-show', 'match-up'] })
    expect(after.lessons[0].games.find((g) => g.id === 'match-up')).toMatchObject({ bestStars: 3, done: true })
  })
})

describe('the Teacher’s view of the Lobby', () => {
  it('picks the soonest due date, no due date last, a tie goes to the newest', () => {
    const a = (id: string, dueDate: string | null, createdAt: string) => ({ id, dueDate, createdAt })
    expect(soonestAssignment([a('none', null, '2026-11-23'), a('later', '2026-11-30', '2026-11-22'), a('soon', '2026-11-25', '2026-11-20')])?.id).toBe('soon')
    expect(soonestAssignment([a('old', '2026-11-25', '2026-11-18'), a('new', '2026-11-25', '2026-11-21')])?.id).toBe('new')
    expect(soonestAssignment([])).toBeUndefined()
  })

  it('the chalkboard: pairs as key words, else blanks as key ideas', () => {
    const q = (type: 'matching_pair' | 'fill_blank', prompt: string, answer: string) => ({ type, prompt, answer, status: 'approved' as const })
    expect(makeBoard([q('matching_pair', 'Numerator', 'the top number')]).keyWords).toEqual([{ word: 'Numerator', text: 'the top number' }])
    expect(makeBoard([q('fill_blank', 'A fraction shows ___ parts.', 'equal')]).keyIdeas).toEqual([
      { before: 'A fraction shows ', answer: 'equal', after: ' parts.' },
    ])
  })
})
