// FAKE DATA for the front-end only. Delete this file when the database is connected.
//
// Every fake question card lives here (src/content/questionCard.ts has the format):
// - fakeQuestionCards: 20 approved Grade 4 fraction cards + 2 drafts, for building the mini games
// - partsCards / mixedCards: the Teacher Dashboard's sample lessons
// - equivalentFractionsCards: what the fake "AI" writes for any uploaded lesson (16 cards)
// - fakeSourceQuotes: the "From your lesson · page N" quotes, by card id (not a card field)

import { QuestionCardSchema, type QuestionCard } from '../content/questionCard'
import type { SourceQuote } from '../teacher/data/types'

/** FAKE: lesson quotes by card id. The page is the card's sourcePage. */
export const fakeSourceQuotes: Record<string, SourceQuote> = {}

type Extra = Pick<QuestionCard, 'level'> &
  Partial<Pick<QuestionCard, 'explanation' | 'sourcePage' | 'status'>> & {
    /** [the quote, the words to highlight]: saved in fakeSourceQuotes. */
    quote?: [string, string]
  }

/** Card makers for one lesson. Ids are `<lessonId>-c01`, `-c02`, … in order. */
function deck(lessonId: string, topic: string, status: QuestionCard['status']) {
  let n = 0
  const make = (type: QuestionCard['type'], prompt: string, choices: string[], answer: string, { quote, ...extra }: Extra): QuestionCard => {
    const id = `${lessonId}-c${String(++n).padStart(2, '0')}`
    if (quote) fakeSourceQuotes[id] = { quote: quote[0], highlight: quote[1] }
    return { id, lessonId, subject: 'Math', topic, grade: 4, type, prompt, choices, answer, status, ...extra }
  }
  return {
    mc: (prompt: string, choices: string[], answer: string, extra: Extra) => make('multiple_choice', prompt, choices, answer, extra),
    pair: (left: string, right: string, extra: Extra) => make('matching_pair', left, [], right, extra),
    blank: (prompt: string, choices: string[], answer: string, extra: Extra) => make('fill_blank', prompt, choices, answer, extra),
  }
}

/**
 * FAKE: the Student's lessons the mini games can be played with: the Teacher
 * approved them (src/games/lessonCards.ts). In order: the first one with
 * enough cards for a game is that game's default. `added`: when the Teacher
 * gave it to the class (All games picks the newest when there is no mission).
 */
export const fakeGameLessons = [
  { id: 'g4-fractions', name: 'Fractions', teacher: 'Ms. Cruz', subject: 'Math', added: '2026-11-10' },
  { id: 'mixed', name: 'Mixed Numbers', teacher: 'Ms. Cruz', subject: 'Math', added: '2026-11-03' },
  { id: 'comparing', name: 'Comparing Fractions', teacher: 'Ms. Cruz', subject: 'Math', added: '2026-10-27' },
]

// ---------- For the mini games: 20 approved + 2 drafts ----------

const g4 = deck('g4-fractions', 'Fractions', 'approved')

export const fakeQuestionCards: QuestionCard[] = [
  // Multiple choice (Quiz Show)
  g4.mc('A pizza is cut into 4 equal slices. You eat 1 slice. What fraction did you eat?', ['1/4', '1/3', '4/1', '3/4'], '1/4', {
    level: 'easy', sourcePage: 1, explanation: 'You ate 1 of the 4 equal slices, so you ate 1/4.',
  }),
  g4.mc('In the fraction 3/5, what is the bottom number called?', ['denominator', 'numerator', 'whole', 'sum'], 'denominator', {
    level: 'easy', sourcePage: 1, explanation: 'The bottom number is the denominator. It tells how many equal parts make a whole.',
  }),
  g4.mc('Which fraction is the same as 1/2?', ['2/4', '1/4', '2/3', '3/4'], '2/4', {
    level: 'easy', sourcePage: 2, explanation: 'Two fourths is the same amount as one half.',
  }),
  g4.mc('Which fraction is bigger?', ['3/4', '1/4', '2/4', '0/4'], '3/4', {
    level: 'medium', sourcePage: 3, explanation: 'All have 4 equal parts, so the one with the most parts, 3/4, is the biggest.',
  }),
  g4.mc('Which fraction equals 2/3?', ['4/6', '2/6', '3/2', '4/3'], '4/6', {
    level: 'medium', sourcePage: 2, explanation: 'Multiply the top and bottom of 2/3 by 2 to get 4/6.',
  }),
  g4.mc('What is 1/5 + 2/5?', ['3/5', '3/10', '2/5', '1/5'], '3/5', {
    level: 'medium', sourcePage: 4, explanation: 'The bottoms are the same, so add the tops: 1 + 2 = 3. The answer is 3/5.',
  }),
  g4.mc('Ana ate 2/8 of a cake and Ben ate 3/8. How much of the cake is left?', ['3/8', '5/8', '1/8', '2/8'], '3/8', {
    level: 'hard', sourcePage: 4, explanation: 'They ate 2/8 + 3/8 = 5/8. The whole cake is 8/8, so 8/8 − 5/8 = 3/8 is left.',
  }),
  g4.mc('Which is the smallest fraction?', ['1/8', '1/2', '1/4', '1/3'], '1/8', {
    level: 'hard', sourcePage: 3, explanation: 'All tops are 1. When a whole is cut into more parts, each part is smaller, so 1/8 is the smallest.',
  }),

  // Matching pairs (Match Up)
  g4.pair('1/2', 'one half', { level: 'easy', sourcePage: 1 }),
  g4.pair('1/4', 'one fourth', { level: 'easy', sourcePage: 1 }),
  g4.pair('3/4', 'three fourths', { level: 'easy', sourcePage: 1 }),
  g4.pair('2/3', 'two thirds', { level: 'medium', sourcePage: 1 }),
  g4.pair('5/5', 'one whole', { level: 'medium', sourcePage: 2, explanation: 'When the top and bottom are the same, the fraction is one whole.' }),
  g4.pair('2/8', '1/4', { level: 'hard', sourcePage: 2, explanation: 'Divide the top and bottom of 2/8 by 2 to get 1/4.' }),

  // Fill in the blank (Fill the Blank)
  g4.blank('The top number of a fraction is the ___.', ['numerator', 'denominator', 'whole'], 'numerator', {
    level: 'easy', sourcePage: 1, explanation: 'The numerator tells how many equal parts we have.',
  }),
  g4.blank('A fraction shows parts of a ___.', ['whole', 'line', 'number'], 'whole', {
    level: 'easy', sourcePage: 1, explanation: 'A fraction names equal parts of one whole.',
  }),
  g4.blank('The parts of a fraction must be ___.', ['equal', 'big', 'round'], 'equal', {
    level: 'medium', sourcePage: 1, explanation: 'Fractions only work when all the parts are the same size.',
  }),
  g4.blank('Fractions that name the same amount, like 1/2 and 2/4, are called ___ fractions.', ['equivalent', 'improper', 'mixed'], 'equivalent', {
    level: 'medium', sourcePage: 2, explanation: '1/2 and 2/4 name the same amount, so they are equivalent fractions.',
  }),
  g4.blank('A whole number and a fraction together, like 1 1/2, is a ___ number.', ['mixed', 'proper', 'equivalent'], 'mixed', {
    level: 'hard', sourcePage: 5, explanation: '1 1/2 has a whole number (1) and a fraction (1/2), so it is a mixed number.',
  }),
  g4.blank('A fraction like 7/4, where the top is bigger than the bottom, is an ___ fraction.', ['improper', 'equivalent', 'unit'], 'improper', {
    level: 'hard', sourcePage: 5, explanation: 'When the top is bigger than the bottom, the fraction is more than one whole: an improper fraction.',
  }),

  // Drafts (not checked by the Teacher yet: no game uses them)
  g4.mc('What is 3/6 in simplest form?', ['1/2', '1/3', '3/6', '2/3'], '1/2', {
    level: 'medium', sourcePage: 2, status: 'draft', explanation: 'Divide the top and bottom of 3/6 by 3 to get 1/2.',
  }),
  g4.blank('A fraction with 1 on top, like 1/6, is a ___ fraction.', ['unit', 'mixed', 'improper'], 'unit', {
    level: 'easy', sourcePage: 1, status: 'draft', explanation: 'A unit fraction has 1 as its numerator.',
  }),
]

// ---------- Equivalent Fractions: what the fake "AI" writes for an upload ----------
// 6 Quiz Show, 6 Match Up pairs, 4 Fill the Blank. All drafts (to check).

const eq = deck('g4-equivalent-fractions', 'Equivalent Fractions', 'draft')

export const equivalentFractionsCards: QuestionCard[] = [
  eq.mc('Which fraction is the same as 1/2?', ['2/4', '1/3', '2/3', '3/4'], '2/4', {
    level: 'easy', sourcePage: 2, explanation: 'Two fourths is the same amount as one half.',
    quote: ['One half is the same amount as two fourths: 1/2 = 2/4.', '1/2 = 2/4'],
  }),
  eq.pair('2/4', '1/2', {
    level: 'easy', sourcePage: 2, explanation: 'Divide the top and bottom of 2/4 by 2 to get 1/2.',
    quote: ['Two fourths name the same amount as one half.', 'one half'],
  }),
  eq.blank('2/3 = ___/6', ['4', '3', '2'], '4', {
    level: 'medium', sourcePage: 4, explanation: 'Multiply the top and bottom of 2/3 by 2 to get 4/6.',
    quote: ['Multiply the top and bottom of 2/3 by 2 to get 4/6.', '4/6'],
  }),
  eq.mc('Which pair are equivalent fractions?', ['1/3 and 2/6', '1/3 and 1/6', '2/3 and 2/6', '1/2 and 1/3'], '1/3 and 2/6', {
    level: 'easy', sourcePage: 3, explanation: 'Multiply the top and bottom of 1/3 by 2 to get 2/6.',
    quote: ['Fractions like 1/3 and 2/6 are equivalent fractions.', '1/3 and 2/6'],
  }),
  eq.pair('3/9', '1/3', {
    level: 'easy', sourcePage: 1, explanation: 'Divide the top and bottom of 3/9 by 3 to get 1/3.',
    quote: ['3/9 and 1/3 name the same part of a whole.', '3/9 and 1/3'],
  }),
  eq.mc('Ana ate 2/8 of a pizza. Which fraction is the same amount?', ['1/4', '2/4', '1/8', '4/8'], '1/4', {
    level: 'medium', sourcePage: 2, explanation: 'Divide the top and bottom of 2/8 by 2 to get 1/4.',
    quote: ['You can also divide the top and bottom by the same number. 2/8 becomes 1/4.', 'divide the top and bottom by the same number'],
  }),
  eq.blank('To make an equivalent fraction, multiply the top and bottom by the ___ number.', ['same', 'bigger', 'smaller'], 'same', {
    level: 'easy', sourcePage: 2, explanation: 'Using the same number on top and bottom keeps the amount the same.',
    quote: ['Multiply the top and bottom by the same number to make an equivalent fraction.', 'same number'],
  }),
  eq.pair('4/10', '2/5', {
    level: 'medium', sourcePage: 6, explanation: 'Divide the top and bottom of 4/10 by 2 to get 2/5.',
    quote: ['4/10 and 2/5 are equivalent fractions.', '4/10 and 2/5'],
  }),
  eq.mc('Which is NOT equal to 2/5?', ['3/5', '4/10', '6/15', '8/20'], '3/5', {
    level: 'hard', sourcePage: 6, explanation: '4/10, 6/15 and 8/20 all equal 2/5. 3/5 has 3 parts, not 2, so it is bigger.',
    quote: ['2/5, 4/10 and 6/15 all name the same amount.', '4/10 and 6/15'],
  }),
  eq.pair('6/8', '3/4', {
    level: 'medium', sourcePage: 7, explanation: 'Divide the top and bottom of 6/8 by 2 to get 3/4.',
    quote: ['Six eighths and three fourths are equivalent.', 'three fourths'],
  }),
  eq.mc('Which fraction equals 3/4?', ['6/8', '3/8', '4/3', '6/4'], '6/8', {
    level: 'medium', sourcePage: 7, explanation: 'Multiply the top and bottom of 3/4 by 2 to get 6/8.',
    quote: ['Three fourths is the same as six eighths.', 'six eighths'],
  }),
  eq.pair('2/10', '1/5', {
    level: 'easy', sourcePage: 6, explanation: 'Divide the top and bottom of 2/10 by 2 to get 1/5.',
    quote: ['Two tenths is the same as one fifth.', 'one fifth'],
  }),
  eq.blank('Fractions that name the same amount are called ___ fractions.', ['equivalent', 'improper', 'mixed'], 'equivalent', {
    level: 'easy', sourcePage: 3, explanation: 'Fractions like 1/2 and 2/4 name the same amount, so they are equivalent fractions.',
    quote: ['Fractions that name the same amount, like 1/2 and 2/4, are called equivalent fractions.', 'equivalent fractions'],
  }),
  eq.mc('Which two fractions are equal?', ['2/6 and 1/3', '2/6 and 1/2', '1/4 and 2/4', '3/5 and 3/6'], '2/6 and 1/3', {
    level: 'hard', sourcePage: 8, explanation: 'Divide the top and bottom of 2/6 by 2 to get 1/3.',
    quote: ['Two sixths and one third name the same amount.', 'one third'],
  }),
  eq.pair('4/6', '2/3', {
    level: 'hard', sourcePage: 8, explanation: 'Divide the top and bottom of 4/6 by 2 to get 2/3.',
    quote: ['Four sixths and two thirds are equivalent.', 'two thirds'],
  }),
  eq.blank('1/3 = ___/9', ['3', '1', '6'], '3', {
    level: 'hard', sourcePage: 8, explanation: 'Multiply the top and bottom of 1/3 by 3 to get 3/9.',
    quote: ['Multiply the top and bottom of 1/3 by 3 to get 3/9.', '3/9'],
  }),
]

// ---------- Sample lesson "Fractions: Parts of a Whole" (12 to check) ----------
// Only 3 pairs, so Match Up needs 1 more.

const parts = deck('parts', 'Parts of a Whole', 'draft')

export const partsCards: QuestionCard[] = [
  parts.mc('A pizza is cut into 4 equal parts. One part is…', ['1/4', '1/2', '4/1', '1/3'], '1/4', {
    level: 'easy', sourcePage: 1, explanation: 'Each of the 4 equal parts is one fourth of the pizza.',
    quote: ['Each of the 4 equal parts is one fourth of the pizza.', 'one fourth'],
  }),
  parts.pair('half', '1/2', {
    level: 'easy', sourcePage: 1, explanation: 'Two equal parts are called halves. One of them is 1/2.',
    quote: ['Two equal parts are called halves.', 'halves'],
  }),
  parts.blank('The bottom number of a fraction is the ___.', ['denominator', 'numerator', 'whole'], 'denominator', {
    level: 'easy', sourcePage: 2, explanation: 'The denominator tells how many equal parts the whole has.',
    quote: ['The denominator tells how many equal parts the whole has.', 'denominator'],
  }),
  parts.blank('The top number of a fraction is the ___.', ['numerator', 'denominator', 'whole'], 'numerator', {
    level: 'easy', sourcePage: 2, explanation: 'The numerator tells how many parts we are talking about.',
    quote: ['The numerator tells how many parts we are talking about.', 'numerator'],
  }),
  parts.mc('Which shape shows 1/3 shaded?', ['1 of 3 equal parts', '1 of 4 equal parts', '3 of 3 parts', '2 of 3 parts'], '1 of 3 equal parts', {
    level: 'medium', sourcePage: 3, explanation: 'One of three equal parts is one third.',
    quote: ['One of three equal parts is one third.', 'one third'],
  }),
  parts.pair('3 of 8 parts', '3/8', {
    level: 'medium', sourcePage: 4, explanation: 'Three of eight equal parts is three eighths.',
    quote: ['Three of eight equal parts is three eighths.', 'three eighths'],
  }),
  parts.blank('Parts must be ___ to make a fraction.', ['equal', 'big', 'round'], 'equal', {
    level: 'medium', sourcePage: 4, explanation: 'Fractions only work when all the parts are equal.',
    quote: ['Fractions only work when all the parts are equal.', 'equal'],
  }),
  parts.mc('How many fourths make a whole?', ['4', '2', '1', '8'], '4', {
    level: 'easy', sourcePage: 5, explanation: 'Four fourths make one whole.',
    quote: ['Four fourths make one whole.', 'Four fourths'],
  }),
  parts.pair('2 of 5 parts', '2/5', {
    level: 'medium', sourcePage: 6, explanation: 'Two of five equal parts is two fifths.',
    quote: ['Two of five equal parts is two fifths.', 'two fifths'],
  }),
  parts.mc('Which fraction is one whole?', ['6/6', '1/6', '6/1', '0/6'], '6/6', {
    level: 'medium', sourcePage: 7, explanation: 'When the top and bottom are the same, the fraction is one whole.',
    quote: ['When the top and bottom are the same, the fraction is one whole.', 'one whole'],
  }),
  parts.blank('You ate 5 of 6 slices. You ate five ___.', ['sixths', 'fifths', 'halves'], 'sixths', {
    level: 'hard', sourcePage: 9, explanation: 'The pizza has 6 equal slices, so each slice is one sixth. Five slices are five sixths.',
    quote: ['Five of six slices is five sixths.', 'five sixths'],
  }),
  parts.mc('Which is the biggest part?', ['1/2', '1/3', '1/4', '1/8'], '1/2', {
    level: 'hard', sourcePage: 11, explanation: 'The fewer the parts, the bigger each part is. 2 parts is the fewest.',
    quote: ['The fewer the parts, the bigger each part is.', 'bigger each part'],
  }),
]

// ---------- Sample lesson "Mixed Numbers" (15 approved) ----------

const mixed = deck('mixed', 'Mixed Numbers', 'approved')
const mixedQuote: [string, string] = ['A mixed number is a whole number and a fraction together.', 'a whole number and a fraction']

export const mixedCards: QuestionCard[] = [
  mixed.mc('Write 1 and 2/5 as a fraction.', ['7/5', '3/5', '2/5', '12/5'], '7/5', {
    level: 'medium', sourcePage: 1, explanation: '1 whole is 5/5. 5/5 + 2/5 = 7/5.', quote: mixedQuote,
  }),
  mixed.mc('Write 2 and 1/4 as a fraction.', ['9/4', '3/4', '6/4', '21/4'], '9/4', {
    level: 'medium', sourcePage: 2, explanation: '2 wholes are 8/4. 8/4 + 1/4 = 9/4.', quote: mixedQuote,
  }),
  mixed.mc('Which is a mixed number?', ['3 1/2', '7/2', '1/2', '3'], '3 1/2', {
    level: 'easy', sourcePage: 1, explanation: '3 1/2 has a whole number and a fraction together.', quote: mixedQuote,
  }),
  mixed.mc('Write 7/3 as a mixed number.', ['2 1/3', '1 2/3', '3 1/3', '2 2/3'], '2 1/3', {
    level: 'hard', sourcePage: 3, explanation: '7/3 is 6/3 + 1/3. 6/3 is 2 wholes, so 7/3 = 2 1/3.', quote: mixedQuote,
  }),
  mixed.mc('Which is bigger than 1 whole?', ['5/4', '3/4', '1/4', '4/5'], '5/4', {
    level: 'easy', sourcePage: 2, explanation: 'The top of 5/4 is bigger than the bottom, so it is more than 1 whole.', quote: mixedQuote,
  }),
  mixed.mc('Write 1 and 3/8 as a fraction.', ['11/8', '4/8', '13/8', '3/8'], '11/8', {
    level: 'medium', sourcePage: 3, explanation: '1 whole is 8/8. 8/8 + 3/8 = 11/8.', quote: mixedQuote,
  }),
  mixed.mc('How many halves are in 2 1/2?', ['5', '4', '3', '2'], '5', {
    level: 'hard', sourcePage: 4, explanation: '2 wholes are 4 halves. Add 1 more half: 5 halves.', quote: mixedQuote,
  }),
  mixed.pair('1 1/2', '3/2', { level: 'easy', sourcePage: 4, explanation: '1 whole is 2/2. 2/2 + 1/2 = 3/2.', quote: mixedQuote }),
  mixed.pair('2 1/3', '7/3', { level: 'medium', sourcePage: 4, explanation: '2 wholes are 6/3. 6/3 + 1/3 = 7/3.', quote: mixedQuote }),
  mixed.pair('1 3/4', '7/4', { level: 'medium', sourcePage: 5, explanation: '1 whole is 4/4. 4/4 + 3/4 = 7/4.', quote: mixedQuote }),
  mixed.pair('3 1/2', '7/2', { level: 'hard', sourcePage: 5, explanation: '3 wholes are 6/2. 6/2 + 1/2 = 7/2.', quote: mixedQuote }),
  mixed.blank('A whole number and a fraction together is a ___ number.', ['mixed', 'proper', 'unit'], 'mixed', {
    level: 'easy', sourcePage: 1, explanation: 'A mixed number has a whole number and a fraction.', quote: mixedQuote,
  }),
  mixed.blank('In 2 3/4, the 2 is the ___ number.', ['whole', 'top', 'bottom'], 'whole', {
    level: 'easy', sourcePage: 1, explanation: 'In a mixed number, the number in front is the whole number.', quote: mixedQuote,
  }),
  mixed.blank('A fraction like 9/4, with the top bigger than the bottom, is an ___ fraction.', ['improper', 'equivalent', 'unit'], 'improper', {
    level: 'medium', sourcePage: 2, explanation: 'When the top is bigger than the bottom, it is an improper fraction.', quote: mixedQuote,
  }),
  mixed.blank('To change 1 1/2 to a fraction, ___ the whole by the bottom number, then add the top.', ['multiply', 'divide', 'subtract'], 'multiply', {
    level: 'hard', sourcePage: 4, explanation: '1 × 2 = 2, and 2 + 1 = 3, so 1 1/2 = 3/2.', quote: mixedQuote,
  }),
]

// ---------- Sample lesson "Comparing Fractions" (7 approved) ----------
// Only 2 pairs, so Match Up needs 2 more: it shows grey on All games.

const cmp = deck('comparing', 'Comparing Fractions', 'approved')

export const comparingCards: QuestionCard[] = [
  cmp.mc('Which is bigger?', ['2/3', '1/3', '0/3', '1/6'], '2/3', {
    level: 'easy', sourcePage: 1, explanation: 'Both are thirds, so the one with more parts, 2/3, is bigger.',
  }),
  cmp.mc('Which is smaller?', ['1/6', '1/2', '1/3', '1/4'], '1/6', {
    level: 'easy', sourcePage: 1, explanation: 'All tops are 1. The whole cut into the most parts has the smallest parts: 1/6.',
  }),
  cmp.mc('Which sign makes 3/8 ___ 5/8 true?', ['<', '>', '='], '<', {
    level: 'medium', sourcePage: 2, explanation: 'Both are eighths, and 3 is less than 5, so 3/8 < 5/8.',
  }),
  cmp.mc('Which is the same as 1 whole?', ['4/4', '1/4', '4/1', '3/4'], '4/4', {
    level: 'medium', sourcePage: 2, explanation: 'When the top and bottom are the same, the fraction is one whole.',
  }),
  cmp.pair('2/4', 'one half', { level: 'easy', sourcePage: 3 }),
  cmp.pair('3/9', 'one third', { level: 'medium', sourcePage: 3 }),
  cmp.blank('3/4 is ___ than 1/4.', ['bigger', 'smaller', 'equal'], 'bigger', {
    level: 'easy', sourcePage: 1, explanation: 'Three fourths has more of the same parts than one fourth.',
  }),
]

// Dev only: check every card when this file loads, so a typo shows up right away.
if (import.meta.env.DEV) {
  for (const card of [...fakeQuestionCards, ...equivalentFractionsCards, ...partsCards, ...mixedCards, ...comparingCards]) {
    const result = QuestionCardSchema.safeParse(card)
    if (!result.success) {
      const why = result.error.issues.map((i) => `${i.path.join('.') || 'card'}: ${i.message}`).join('; ')
      throw new Error(`Bad fake question card ${card.id}: ${why}`)
    }
  }
}
