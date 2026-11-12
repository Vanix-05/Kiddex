import { describe, expect, it } from 'vitest'
import { availableTemplates, QuestionCardSchema, type QuestionCard } from './questionCard'

const base = { lessonId: 'l1', subject: 'Math', topic: 'Fractions', grade: 4, level: 'easy', status: 'approved' } as const

const quiz: QuestionCard = { ...base, id: 'q1', type: 'multiple_choice', prompt: 'Which is the same as 1/2?', choices: ['2/4', '1/3', '2/3', '3/4'], answer: '2/4' }
const pair: QuestionCard = { ...base, id: 'p1', type: 'matching_pair', prompt: '1/2', choices: [], answer: 'one half' }
const blank: QuestionCard = { ...base, id: 'b1', type: 'fill_blank', prompt: 'The top number is the ___.', choices: ['numerator', 'denominator', 'whole'], answer: 'numerator' }

const ok = (card: unknown) => QuestionCardSchema.safeParse(card).success

describe('QuestionCardSchema', () => {
  it('accepts one valid card of each type', () => {
    expect(ok(quiz)).toBe(true)
    expect(ok(pair)).toBe(true)
    expect(ok(blank)).toBe(true)
  })

  it('fails multiple choice when the answer isn’t one of the choices', () => {
    expect(ok({ ...quiz, answer: '5/6' })).toBe(false)
  })

  it('fails duplicate choices (ignoring case and spaces)', () => {
    expect(ok({ ...quiz, choices: ['2/4', ' 2 / 4', '2/3', '3/4'] })).toBe(false)
  })

  it('fails grade 7', () => {
    expect(ok({ ...quiz, grade: 7 })).toBe(false)
  })

  it('fails a matching pair with choices', () => {
    expect(ok({ ...pair, choices: ['one half', 'one third'] })).toBe(false)
  })
})

describe('availableTemplates', () => {
  it('drops Match Up when there are only 3 pairs', () => {
    const pairs = (n: number) => Array.from({ length: n }, (_, i): QuestionCard => ({ ...pair, id: `p${i}`, prompt: `${i}/2` }))
    const quizzes = Array.from({ length: 3 }, (_, i): QuestionCard => ({ ...quiz, id: `q${i}` }))
    expect(availableTemplates([...quizzes, ...pairs(3)])).toEqual(['quiz-show'])
    expect(availableTemplates([...quizzes, ...pairs(4)])).toEqual(['quiz-show', 'match-up'])
  })
})
