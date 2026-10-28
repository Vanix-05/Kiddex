import { buddyIds, type BuddyId, type QuizAnswer } from './quizData'

/**
 * Plain rules, no AI: every picked answer gives 1 point to each of its buddies.
 * The highest total wins; a tie is broken randomly.
 */
export function pickBuddy(picked: QuizAnswer[], random: () => number = Math.random): BuddyId {
  const scores = new Map<BuddyId, number>(buddyIds.map((id) => [id, 0]))
  for (const answer of picked) {
    for (const buddy of answer.buddies) scores.set(buddy, (scores.get(buddy) ?? 0) + 1)
  }
  const best = Math.max(...scores.values())
  const tied = buddyIds.filter((id) => scores.get(id) === best)
  return tied[Math.floor(random() * tied.length)]
}
