import { useLocation } from 'react-router-dom'
import { isBuddyId, type BuddyId } from '../../setup/quizData'

export type Avatar = 'boy' | 'girl'

/** Router state passed between setup pages. Only results, never the quiz answers. */
export interface SetupState {
  matchedBuddy: BuddyId
  /** Picked on the gender page. */
  avatar?: Avatar
}

/** State for opening the quiz from the gender page's "← Back". */
export interface QuizResumeState {
  resumeLastQuestion: true
}

const isAvatar = (value: unknown): value is Avatar => value === 'boy' || value === 'girl'

/**
 * The setup results so far. matchedBuddy is null if the page was opened
 * directly (without taking the quiz).
 */
export function useSetupState(): { matchedBuddy: BuddyId | null; avatar: Avatar | null } {
  const { state } = useLocation()
  const s = (state ?? {}) as Partial<SetupState>
  return {
    matchedBuddy: isBuddyId(s.matchedBuddy) ? s.matchedBuddy : null,
    avatar: isAvatar(s.avatar) ? s.avatar : null,
  }
}
