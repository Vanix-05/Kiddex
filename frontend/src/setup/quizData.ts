/**
 * The storybook personality quiz (/setup).
 *
 * Edit freely:
 * - `question`: written large at the top of the book page.
 * - `ollie`: what Ollie the guide says while this page is open.
 * - `answers`: exactly 4. Each gives 1 point to every buddy in `buddies`;
 *   the buddy with the most points wins, ties are broken randomly (scoring.ts).
 */

export const buddyIds = ['otter', 'fox', 'kitty', 'axolotl', 'dog', 'monkey', 'raccoon', 'ram'] as const

export type BuddyId = (typeof buddyIds)[number]

export const isBuddyId = (id: unknown): id is BuddyId =>
  typeof id === 'string' && (buddyIds as readonly string[]).includes(id)

export interface QuizAnswer {
  text: string
  /** Each of these buddies gets 1 point when this answer is picked. */
  buddies: BuddyId[]
}

export interface QuizQuestion {
  question: string
  ollie: string
  answers: [QuizAnswer, QuizAnswer, QuizAnswer, QuizAnswer]
}

export const quizQuestions: QuizQuestion[] = [
  {
    question: 'How will you respond to someone mean to you?',
    ollie: 'Hoo-hoo! Pop the bubble that feels most like you!',
    answers: [
      { text: 'Tell a grown-up', buddies: ['dog', 'ram'] },
      { text: 'Stay calm and walk away', buddies: ['kitty', 'axolotl'] },
      { text: 'Talk to them kindly', buddies: ['otter', 'fox'] },
      { text: 'Crack a joke', buddies: ['monkey', 'raccoon'] },
    ],
  },
  {
    question: 'Your friend is sad. What do you do?',
    ollie: 'Hmm, interesting…',
    answers: [
      { text: 'Give them a big hug', buddies: ['dog', 'axolotl'] },
      { text: 'Make them laugh', buddies: ['monkey', 'otter'] },
      { text: 'Help fix the problem', buddies: ['fox', 'raccoon'] },
      { text: 'Sit quietly with them', buddies: ['kitty', 'ram'] },
    ],
  },
  {
    question: 'You found a mysterious door. What now?',
    ollie: 'Ooh, good one!',
    answers: [
      { text: 'Open it right away!', buddies: ['ram', 'monkey'] },
      { text: 'Look for clues first', buddies: ['fox', 'raccoon'] },
      { text: 'Bring a friend along', buddies: ['dog', 'otter'] },
      { text: 'Peek in slowly', buddies: ['kitty', 'axolotl'] },
    ],
  },
  {
    question: 'Your team is losing the game. You…',
    ollie: 'I’m learning so much about you!',
    answers: [
      { text: 'Cheer everyone on', buddies: ['dog', 'monkey'] },
      { text: 'Think of a new plan', buddies: ['fox', 'raccoon'] },
      { text: 'Try even harder', buddies: ['ram', 'otter'] },
      { text: 'Stay calm and keep going', buddies: ['kitty', 'axolotl'] },
    ],
  },
  {
    question: 'What makes you happiest?',
    ollie: 'Last page! Take your time…',
    answers: [
      { text: 'Being with friends', buddies: ['dog', 'otter'] },
      { text: 'Learning something new', buddies: ['fox', 'axolotl'] },
      { text: 'Going on adventures', buddies: ['ram', 'monkey'] },
      { text: 'A cozy quiet time', buddies: ['kitty', 'raccoon'] },
    ],
  },
]

/** What Ollie says after the last page, and when the gender page opens. */
export const ollieQuizDone = 'Hmm, I think I know your buddy… but first, who are you?'

/** What Ollie says once a Boy or Girl tile is picked on the gender page. */
export const ollieGenderPicked = 'Nice to meet you, hero!'

/** What Ollie says on the reveal page (/setup/reveal). */
export const ollieReveal = 'The book has spoken!'
