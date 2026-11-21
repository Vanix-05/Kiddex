import { describe, expect, it } from 'vitest'
import type { ServerQuestion } from '../api/lessonsApi'
import { approvedCardsFor, canPreview, previewGames, previewPath } from './previewCards'

let n = 0
const q = (type: ServerQuestion['type'], status: ServerQuestion['status'] = 'approved'): ServerQuestion => ({
  id: `q${++n}`,
  lessonId: 'L1',
  type,
  prompt: type === 'fill_blank' ? 'Water turns into ___.' : `Question ${n}?`,
  choices: type === 'matching_pair' ? [] : type === 'fill_blank' ? ['vapor', 'ice', 'sand'] : ['a', 'b', 'c', 'd'],
  answer: type === 'matching_pair' ? `right ${n}` : type === 'fill_blank' ? 'vapor' : 'a',
  subject: 'Science',
  topic: 'Water',
  grade: 4,
  level: 'easy',
  status,
  position: n,
  flagChecked: false,
  madeBy: 'ai',
})

const many = (count: number, type: ServerQuestion['type'], status: ServerQuestion['status'] = 'approved') =>
  Array.from({ length: count }, () => q(type, status))

describe('approvedCardsFor: one game’s approved cards', () => {
  const lesson = [
    ...many(3, 'multiple_choice'),
    ...many(2, 'multiple_choice', 'draft'),
    ...many(4, 'matching_pair'),
    ...many(3, 'fill_blank'),
  ]

  it('keeps only approved cards of that game (drafts and other games left out)', () => {
    const quiz = approvedCardsFor(lesson, 'quiz-show')
    expect(quiz).toHaveLength(3)
    expect(quiz.every((c) => c.type === 'multiple_choice' && c.status === 'approved')).toBe(true)
    expect(approvedCardsFor(lesson, 'match-up').every((c) => c.type === 'matching_pair')).toBe(true)
  })

  it('drops position, flagChecked and madeBy, keeps everything else', () => {
    const [card] = approvedCardsFor([q('multiple_choice')], 'quiz-show')
    expect(card).not.toHaveProperty('position')
    expect(card).not.toHaveProperty('flagChecked')
    expect(card).not.toHaveProperty('madeBy')
    expect(card).toMatchObject({ type: 'multiple_choice', prompt: expect.any(String), choices: ['a', 'b', 'c', 'd'], topic: 'Water' })
  })
})

describe('previewGames: what "Preview as a student" offers', () => {
  it('both built games when each has enough approved cards', () => {
    expect(previewGames([...many(3, 'multiple_choice'), ...many(4, 'matching_pair')])).toEqual(['quiz-show', 'match-up'])
  })

  it('one game when the other is short (3 pairs is not enough for Match Up)', () => {
    expect(previewGames([...many(5, 'multiple_choice'), ...many(3, 'matching_pair')])).toEqual(['quiz-show'])
  })

  it('drafts do not count', () => {
    expect(previewGames([...many(2, 'multiple_choice'), ...many(5, 'multiple_choice', 'draft')])).toEqual([])
  })

  it('never Fill the Blank (not built yet), even with enough sentences', () => {
    expect(previewGames(many(6, 'fill_blank'))).toEqual([])
    expect(canPreview(many(6, 'fill_blank'), 'fill-blank')).toBe(false)
  })

  it('nothing for a lesson with no approved questions', () => {
    expect(previewGames([])).toEqual([])
  })

  it('the preview address', () => {
    expect(previewPath('abc123', 'match-up')).toBe('/teacher/lessons/abc123/preview/match-up')
  })
})
