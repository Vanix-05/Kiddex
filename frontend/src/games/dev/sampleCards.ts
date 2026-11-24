// DEV PAGES ONLY: never used by Student screens.
//
// Sample question cards for /dev/games, /dev/play, /dev/all-games and /dev/lobby
// (not in production builds). Students play their Teacher's real questions
// (GET /api/student/games). sampleCards.test.ts checks that nothing else imports this file.
// The card format is in src/content/questionCard.ts.

import { MIN_CARDS, QuestionCardSchema, TEMPLATE_FOR_TYPE, type QuestionCard } from '../../content/questionCard'
import type { Mission } from '../../screens/Lobby/lobbyData'
import { makeBoard, noMission, type PlayLesson } from '../studentData'
import type { GameEntry, Progress } from '../studentGames'
import type { GameId } from '../types'

type Extra = Pick<QuestionCard, 'level'> & Partial<Pick<QuestionCard, 'explanation' | 'sourcePage' | 'status'>>

/** Card makers for one lesson. Ids are `<lessonId>-c01`, `-c02`, … in order. */
function deck(lessonId: string, topic: string, status: QuestionCard['status']) {
  let n = 0
  const make = (type: QuestionCard['type'], prompt: string, choices: string[], answer: string, extra: Extra): QuestionCard => {
    const id = `${lessonId}-c${String(++n).padStart(2, '0')}`
    return { id, lessonId, subject: 'Math', topic, grade: 4, type, prompt, choices, answer, status, ...extra }
  }
  return {
    mc: (prompt: string, choices: string[], answer: string, extra: Extra) => make('multiple_choice', prompt, choices, answer, extra),
    pair: (left: string, right: string, extra: Extra) => make('matching_pair', left, [], right, extra),
    blank: (prompt: string, choices: string[], answer: string, extra: Extra) => make('fill_blank', prompt, choices, answer, extra),
  }
}

// ---------- For the mini games: 20 approved + 2 drafts ----------

const g4 = deck('g4-fractions', 'Fractions', 'approved')

export const fractionCards: QuestionCard[] = [
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

// ---------- Lesson "Mixed Numbers" (15 approved): a Student games lesson (All games) ----------

const mixed = deck('mixed', 'Mixed Numbers', 'approved')

export const mixedCards: QuestionCard[] = [
  mixed.mc('Write 1 and 2/5 as a fraction.', ['7/5', '3/5', '2/5', '12/5'], '7/5', {
    level: 'medium', sourcePage: 1, explanation: '1 whole is 5/5. 5/5 + 2/5 = 7/5.',
  }),
  mixed.mc('Write 2 and 1/4 as a fraction.', ['9/4', '3/4', '6/4', '21/4'], '9/4', {
    level: 'medium', sourcePage: 2, explanation: '2 wholes are 8/4. 8/4 + 1/4 = 9/4.',
  }),
  mixed.mc('Which is a mixed number?', ['3 1/2', '7/2', '1/2', '3'], '3 1/2', {
    level: 'easy', sourcePage: 1, explanation: '3 1/2 has a whole number and a fraction together.',
  }),
  mixed.mc('Write 7/3 as a mixed number.', ['2 1/3', '1 2/3', '3 1/3', '2 2/3'], '2 1/3', {
    level: 'hard', sourcePage: 3, explanation: '7/3 is 6/3 + 1/3. 6/3 is 2 wholes, so 7/3 = 2 1/3.',
  }),
  mixed.mc('Which is bigger than 1 whole?', ['5/4', '3/4', '1/4', '4/5'], '5/4', {
    level: 'easy', sourcePage: 2, explanation: 'The top of 5/4 is bigger than the bottom, so it is more than 1 whole.',
  }),
  mixed.mc('Write 1 and 3/8 as a fraction.', ['11/8', '4/8', '13/8', '3/8'], '11/8', {
    level: 'medium', sourcePage: 3, explanation: '1 whole is 8/8. 8/8 + 3/8 = 11/8.',
  }),
  mixed.mc('How many halves are in 2 1/2?', ['5', '4', '3', '2'], '5', {
    level: 'hard', sourcePage: 4, explanation: '2 wholes are 4 halves. Add 1 more half: 5 halves.',
  }),
  mixed.pair('1 1/2', '3/2', { level: 'easy', sourcePage: 4, explanation: '1 whole is 2/2. 2/2 + 1/2 = 3/2.' }),
  mixed.pair('2 1/3', '7/3', { level: 'medium', sourcePage: 4, explanation: '2 wholes are 6/3. 6/3 + 1/3 = 7/3.' }),
  mixed.pair('1 3/4', '7/4', { level: 'medium', sourcePage: 5, explanation: '1 whole is 4/4. 4/4 + 3/4 = 7/4.' }),
  mixed.pair('3 1/2', '7/2', { level: 'hard', sourcePage: 5, explanation: '3 wholes are 6/2. 6/2 + 1/2 = 7/2.' }),
  mixed.blank('A whole number and a fraction together is a ___ number.', ['mixed', 'proper', 'unit'], 'mixed', {
    level: 'easy', sourcePage: 1, explanation: 'A mixed number has a whole number and a fraction.',
  }),
  mixed.blank('In 2 3/4, the 2 is the ___ number.', ['whole', 'top', 'bottom'], 'whole', {
    level: 'easy', sourcePage: 1, explanation: 'In a mixed number, the number in front is the whole number.',
  }),
  mixed.blank('A fraction like 9/4, with the top bigger than the bottom, is an ___ fraction.', ['improper', 'equivalent', 'unit'], 'improper', {
    level: 'medium', sourcePage: 2, explanation: 'When the top is bigger than the bottom, it is an improper fraction.',
  }),
  mixed.blank('To change 1 1/2 to a fraction, ___ the whole by the bottom number, then add the top.', ['multiply', 'divide', 'subtract'], 'multiply', {
    level: 'hard', sourcePage: 4, explanation: '1 × 2 = 2, and 2 + 1 = 3, so 1 1/2 = 3/2.',
  }),
]

// ---------- The sample lessons the dev pages play with ----------

const GAME_ORDER: readonly GameId[] = ['quiz-show', 'match-up', 'fill-blank']

/** A sample lesson as the games see it (like one assignment). Nothing is saved: no assignmentId. */
function sampleLesson(id: string, name: string, added: string, cards: QuestionCard[]): PlayLesson {
  const approved = cards.filter((c) => c.status === 'approved')
  const games: GameEntry[] = GAME_ORDER.map((game) => {
    const have = approved.filter((c) => TEMPLATE_FOR_TYPE[c.type] === game).length
    const playable = have >= MIN_CARDS[game]
    return { id: game, playable, ...(playable ? {} : { reason: `Needs at least ${MIN_CARDS[game]} approved cards.` }), bestStars: 0, done: false }
  })
  return { id, assignmentId: null, name, lessonTitle: name, teacher: 'Ms. Cruz', subject: 'Math', assignedAt: added, games, cards: approved }
}

/** Newest first, like the backend sends them. */
export const SAMPLE_LESSONS: PlayLesson[] = [
  sampleLesson('g4-fractions', 'Fractions', '2026-11-10T00:00:00.000Z', fractionCards),
  sampleLesson('mixed', 'Mixed Numbers', '2026-11-03T00:00:00.000Z', mixedCards),
]

/** A sample Student's progress (the Lobby and Results on the dev pages). */
export const SAMPLE_PROGRESS: Progress = { xp: 1140, level: 4, xpIntoLevel: 240, xpGoal: 300, stars: 125, streakDays: 3 }

/** A sample mission with the Fractions lesson: ?mission=open (1 of 2 done), done, none. */
export function sampleMission(kind: string | null): Mission {
  if (kind === 'none') return noMission('Ms. Cruz', true)
  const done: GameId[] = kind === 'done' ? ['quiz-show', 'match-up'] : ['quiz-show']
  return {
    state: kind === 'done' ? 'complete' : 'open',
    assignmentId: null,
    lessonId: 'g4-fractions',
    name: 'Fractions Review',
    lessonTitle: 'Fractions',
    subject: 'Math',
    teacher: 'Ms. Cruz',
    dueDate: '2026-11-27',
    games: ['quiz-show', 'match-up'],
    done,
    bestStars: { 'quiz-show': 2, 'match-up': 3 },
    maxXp: 85,
    board: makeBoard(kind === 'ideas' ? fractionCards.filter((c) => c.type !== 'matching_pair') : fractionCards),
    hasLessons: true,
  }
}

// Check every card when this file loads, so a typo shows up right away.
for (const card of [...fractionCards, ...mixedCards]) {
  const result = QuestionCardSchema.safeParse(card)
  if (!result.success) {
    const why = result.error.issues.map((i) => `${i.path.join('.') || 'card'}: ${i.message}`).join('; ')
    throw new Error(`Bad sample question card ${card.id}: ${why}`)
  }
}
