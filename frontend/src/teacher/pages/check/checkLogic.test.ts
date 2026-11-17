import { describe, expect, it } from 'vitest'
import type { ServerQuestion } from '../../api/lessonsApi'
import {
  barState,
  emptyForm,
  formFor,
  formProblems,
  groupCards,
  groupCountLabel,
  insertAtGroupEnd,
  levelLine,
  markedList,
  renumber,
  shorten,
} from './checkLogic'

let n = 0
const q = (type: ServerQuestion['type'], position: number, extra: Partial<ServerQuestion> = {}): ServerQuestion => ({
  id: `q${++n}`,
  lessonId: 'L1',
  type,
  prompt: type === 'fill_blank' ? 'Water turns into ___.' : `Question ${position}?`,
  choices: type === 'matching_pair' ? [] : type === 'fill_blank' ? ['vapor', 'ice', 'sand'] : ['a', 'b', 'c', 'd'],
  answer: type === 'matching_pair' ? 'right' : type === 'fill_blank' ? 'vapor' : 'a',
  subject: 'Science',
  topic: 'Water',
  grade: 4,
  level: 'easy',
  status: 'draft',
  position,
  flagChecked: false,
  madeBy: 'ai',
  ...extra,
})

describe('grouping and numbering', () => {
  it('groups by game in the order Quiz Show, Match Up, Fill the Blank', () => {
    const cards = [q('fill_blank', 4), q('multiple_choice', 1), q('matching_pair', 3), q('multiple_choice', 2)]
    const groups = groupCards(cards, ['quiz-show', 'match-up', 'fill-blank'])
    expect(groups.map((g) => g.game)).toEqual(['quiz-show', 'match-up', 'fill-blank'])
    expect(groups[0].cards.map((c) => c.position)).toEqual([1, 2])
  })

  it("keeps an empty group for a lesson's game, and drops other empty games", () => {
    const groups = groupCards([q('multiple_choice', 1)], ['quiz-show', 'match-up'])
    expect(groups.map((g) => [g.game, g.cards.length])).toEqual([
      ['quiz-show', 1],
      ['match-up', 0],
    ])
  })

  it('renumbers 1, 2, 3 over the whole list after a delete', () => {
    const cards = [q('multiple_choice', 1), q('multiple_choice', 3), q('matching_pair', 4)]
    expect(renumber(cards).map((c) => c.position)).toEqual([1, 2, 3])
  })

  it('puts a new card at the end of its game group', () => {
    const cards = [q('multiple_choice', 1), q('matching_pair', 2), q('matching_pair', 3)]
    const added = q('multiple_choice', 0, { id: 'new' })
    const list = insertAtGroupEnd(cards, added)
    expect(list.find((c) => c.id === 'new')?.position).toBe(2)
    expect(list.map((c) => c.position)).toEqual([1, 2, 3, 4])
  })

  it('names the group counts', () => {
    expect(groupCountLabel('quiz-show', 10)).toBe('10 questions')
    expect(groupCountLabel('match-up', 6)).toBe('6 pairs')
    expect(groupCountLabel('fill-blank', 1)).toBe('1 sentence')
  })
})

describe('the marked list', () => {
  it('lists only marked cards, in order, with the reason and checked state', () => {
    const cards = [
      q('multiple_choice', 6, { flag: 'ai_unsure' }),
      q('multiple_choice', 2, { flag: 'not_in_lesson', flagChecked: true }),
      q('multiple_choice', 1),
    ]
    expect(markedList(cards).map((m) => [m.number, m.reason, m.checked])).toEqual([
      [2, 'Not found in your lesson', true],
      [6, 'AI was not sure', false],
    ])
  })

  it('shortens long questions to one line', () => {
    expect(shorten('Which is a way to make an equivalent fraction from three fifths?')).toBe('Which is a way to make an equivalent…')
    expect(shorten('Short one?')).toBe('Short one?')
  })
})

describe('the bottom bar', () => {
  const marked = [q('multiple_choice', 1), q('multiple_choice', 2, { flag: 'ai_unsure' }), q('multiple_choice', 3, { flag: 'not_in_lesson' })]

  it('1. stays locked until the end was seen', () => {
    expect(barState({ cards: marked, seenEnd: false, moreBelow: 12, lessonApproved: false })).toEqual({ kind: 'locked', moreBelow: 12 })
  })

  it('2. at the end, points at the first marked question left', () => {
    expect(barState({ cards: marked, seenEnd: true, moreBelow: 0, lessonApproved: false })).toMatchObject({ kind: 'marked', left: 2, firstNumber: 2 })
  })

  it('3. is ready when every marked question was checked', () => {
    const checked = marked.map((c) => ({ ...c, flagChecked: true }))
    expect(barState({ cards: checked, seenEnd: true, moreBelow: 0, lessonApproved: false })).toEqual({ kind: 'ready', total: 3 })
  })

  it('shows "approved" for an approved lesson, and "empty" with no questions', () => {
    expect(barState({ cards: marked, seenEnd: false, moreBelow: 3, lessonApproved: true })).toEqual({ kind: 'approved', total: 3 })
    expect(barState({ cards: [], seenEnd: true, moreBelow: 0, lessonApproved: false })).toEqual({ kind: 'empty' })
  })
})

describe('grey lines and the edit form', () => {
  it('shows the page for PDF, the slide for PowerPoint, and no page for Word', () => {
    expect(levelLine({ level: 'easy', sourcePage: 2 }, 'PDF')).toBe('Easy · page 2')
    expect(levelLine({ level: 'hard', sourcePage: 3 }, 'PPT')).toBe('Hard · slide 3')
    expect(levelLine({ level: 'medium', sourcePage: 2 }, 'DOC')).toBe('Medium')
  })

  const base = { id: 'x', lessonId: 'L1', type: 'fill_blank' as const, subject: 'Science', topic: 'Water', grade: 4, status: 'draft' as const }

  it('asks for exactly one blank in a Fill the Blank sentence', () => {
    const form = { ...formFor(q('fill_blank', 1)), prompt: 'No blank here.' }
    expect(formProblems(form, base).prompt).toMatch(/exactly one blank/)
    expect(formProblems(formFor(q('fill_blank', 1)), base)).toEqual({})
  })

  it('asks for all choices and a right answer on a new Quiz Show card', () => {
    const quiz = { ...base, type: 'multiple_choice' as const }
    expect(formProblems({ ...emptyForm('multiple_choice'), prompt: 'Why?' }, quiz).choices).toBe('Fill in all 4 choices.')
    const filled = { ...emptyForm('multiple_choice'), prompt: 'Why?', choices: ['a', 'b', 'c', 'd'] }
    expect(formProblems(filled, quiz).answer).toMatch(/round mark/)
    expect(formProblems({ ...filled, rightIndex: 1 }, quiz)).toEqual({})
  })
})
