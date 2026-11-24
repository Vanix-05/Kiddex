import { describe, expect, it } from 'vitest'
import { canPlay, CATALOG, catalogGame } from './catalog'
import type { PlayLesson } from './studentData'

const quiz = catalogGame('quiz-show')!
const match = catalogGame('match-up')!
const blank = catalogGame('fill-blank')!

const lesson: PlayLesson = {
  id: 'L1',
  assignmentId: 'A1',
  name: 'Fractions Review',
  lessonTitle: 'Equivalent Fractions',
  teacher: 'Ms. Cruz',
  subject: 'Math',
  assignedAt: '2026-11-23T00:00:00.000Z',
  games: [
    { id: 'quiz-show', playable: true, bestStars: 2, done: true },
    { id: 'match-up', playable: false, reason: 'Needs at least 4 approved pairs.', bestStars: 0, done: false },
  ],
  cards: [],
}

describe('canPlay', () => {
  it('plays a game that is in the lesson and playable', () => {
    expect(canPlay(quiz, lesson)).toEqual({ ok: true })
  })

  it('a game that is not playable is grey with the backend’s reason', () => {
    expect(canPlay(match, lesson)).toEqual({ ok: false, reason: 'Needs at least 4 approved pairs.' })
  })

  it('a game the Teacher didn’t put in the lesson can’t be played', () => {
    expect(canPlay(blank, lesson)).toEqual({ ok: false, reason: 'Not in this lesson' })
    expect(canPlay(quiz, undefined)).toEqual({ ok: false, reason: 'Not in this lesson' })
  })

  it('lists every built game once', () => {
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(CATALOG.length)
  })
})
