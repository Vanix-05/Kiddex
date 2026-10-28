import type { QuizAnswer } from './quizData'

/**
 * The quiz picks before the last question, kept ONLY in memory (never saved,
 * gone on reload), so "← Back" on the gender page can reopen the last
 * question. Cleared when the quiz starts over and when the reveal is reached.
 */
let earlierPicks: QuizAnswer[] = []

export const quizMemory = {
  remember: (picks: QuizAnswer[]) => {
    earlierPicks = [...picks]
  },
  recall: (): QuizAnswer[] => [...earlierPicks],
  forget: () => {
    earlierPicks = []
  },
}
