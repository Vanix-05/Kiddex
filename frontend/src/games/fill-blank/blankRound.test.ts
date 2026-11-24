import { describe, expect, it } from 'vitest'
import type { QuestionCard } from '../../content/questionCard'
import { answer, current, records, takeBuddyHelp, wasHelped } from '../quiz-show/quizRound'
import { finishRound } from '../roundEnd'
import { firstLetter, hintLine, letterHint, spokenPrompt, splitPrompt, startBlank, wordSize } from './blankRound'

describe('splitPrompt: the sentence around its blank', () => {
  it('one blank: the word before and the "." after stay with the slot', () => {
    expect(splitPrompt('The bottom number of a fraction is called the ___.')).toEqual({
      hasBlank: true,
      lead: 'The bottom number of a fraction is called ',
      joinBefore: 'the ',
      joinAfter: '.',
      rest: '',
    })
  })

  it('a blank in the middle keeps the rest of the sentence', () => {
    expect(splitPrompt('A ___ shows parts of a whole.')).toEqual({
      hasBlank: true,
      lead: '',
      joinBefore: 'A ',
      joinAfter: '',
      rest: ' shows parts of a whole.',
    })
  })

  it('a blank at the start', () => {
    expect(splitPrompt('___ is the top number.')).toEqual({ hasBlank: true, lead: '', joinBefore: '', joinAfter: '', rest: ' is the top number.' })
  })

  it('a blank at the very end (no full stop)', () => {
    expect(splitPrompt('The top number is the ___')).toMatchObject({ lead: 'The top number is ', joinBefore: 'the ', joinAfter: '', rest: '' })
  })

  it('no blank: the whole sentence, hasBlank false', () => {
    expect(splitPrompt('No blank here.')).toEqual({ hasBlank: false, lead: 'No blank here.', joinBefore: '', joinAfter: '', rest: '' })
  })

  it('a longer line of underscores is one blank too, and the parts give back the sentence', () => {
    const p = splitPrompt('Two halves make one _____, like 2/2.')
    expect(p.joinAfter).toBe(',')
    expect(`${p.lead}${p.joinBefore}_____${p.joinAfter}${p.rest}`).toBe('Two halves make one _____, like 2/2.')
  })

  it('screen readers hear "blank"', () => {
    expect(spokenPrompt('The top number is the ___.')).toBe('The top number is the blank.')
  })
})

describe('Buddy Help: the first letter', () => {
  it('shows the first letter and "…", never the word’s length', () => {
    expect(letterHint('denominator')).toBe('d…')
    expect(letterHint('whole')).toBe('w…')
  })

  it('skips spaces and quotes before the first letter', () => {
    expect(firstLetter('  "equal"')).toBe('e')
  })

  it('the buddy’s line', () => {
    expect(hintLine('denominator')).toBe('Psst… it starts with d! Now you pick.')
  })

  it('long words get a smaller size', () => {
    expect(wordSize('whole')).toBe('normal')
    expect(wordSize('denominators')).toBe('small')
    expect(wordSize('photosynthesization')).toBe('smaller')
  })
})

let n = 0
const blank = (level: QuestionCard['level'] = 'easy'): QuestionCard => ({
  id: `b${++n}`,
  lessonId: 'L1',
  type: 'fill_blank',
  prompt: `Sentence ${n} has a ___.`,
  choices: ['blank', 'slot', 'gap'],
  answer: 'blank',
  subject: 'Math',
  topic: 'Fractions',
  grade: 4,
  level,
  status: 'approved',
})

describe('Fill the Blank goes through the same round and difficulty path', () => {
  const cards = Array.from({ length: 10 }, () => blank())

  it('a round is up to 8 sentences', () => {
    expect(startBlank(cards, 'easy', 0).total).toBe(8)
    expect(startBlank(cards.slice(0, 5), 'easy', 0).total).toBe(5)
  })

  it('Buddy Help marks the sentence helped (no choice knocked away) and spends one help', () => {
    const r = takeBuddyHelp(startBlank(cards, 'easy', 0))
    expect(current(r).hinted).toBe(true)
    expect(current(r).removed).toBeNull()
    expect(wasHelped(current(r))).toBe(true)
    expect(r.help).toMatchObject({ helps: 0, used: 1 })
    // Once per sentence.
    expect(takeBuddyHelp(r)).toBe(r)
  })

  it('a helped right answer counts as right for stars but NOT for the level (rule 6)', () => {
    let r = startBlank(cards.slice(0, 4), 'easy', 0)
    r = answer(takeBuddyHelp(r), 'blank', 1000)
    const rec = records(r)
    expect(rec[0]).toMatchObject({ right: true, helped: true })

    const deps = {
      student: { level: 1, xp: 0, xpGoal: 300, streakDays: 0 },
      mission: null,
      lessonGames: [],
      lessonCanPlay: () => true,
    }
    const result = { clientRoundId: 'r1', gameId: 'fill-blank' as const, lessonId: 'L1', topic: 'Fractions', startedAt: '', endedAt: '', answers: rec, helpsUsed: 1 }
    const summary = finishRound('fill-blank', result, 'easy', false, deps)
    // 1 of 1 right for the stars, but the helped answer doesn't count for the level: 0% -> keep at easy (can't go lower).
    expect(summary.right).toBe(1)
    expect(summary.helped).toBe(1)
    expect(summary.decision).toMatchObject({ level: 'easy', change: 'keep' })
    // Helped right answers give less XP: 2 + 10 for finishing.
    expect(summary.xpGained).toBe(12)
  })
})
