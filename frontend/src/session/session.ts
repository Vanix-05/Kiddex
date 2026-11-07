import { createContext, useContext } from 'react'
import type { Avatar } from '../setup/avatar'
import type { Look } from '../setup/customizeData'
import type { BuddyId } from '../setup/quizData'

export type Role = 'learner' | 'educator'

export interface User {
  username: string
  role: Role
}

export interface SessionState {
  user: User | null
  /** The logged-in learner's companion (null = not picked yet). */
  companionId: string | null
  /** The logged-in learner's own character (null = not picked yet). */
  avatar: Avatar | null
  /** What the learner named their buddy (null = the buddy's default name). */
  buddyName: string | null
  /** The Customize Bridge picks (skin, hair, shirt, extras, buddy color). Empty = the art as drawn. */
  look: Look
  /** Learner login in progress: the class code they typed... */
  classCode: string | null
  /** ...and the learner tile they tapped on "Who are you?". */
  learnerId: string | null
}

/** What the learner picked during first-time setup. */
export interface SetupResult {
  avatar: Avatar
  buddy: BuddyId
  /** Empty = the buddy's default name. */
  nickname: string
}

export interface SessionContextValue extends SessionState {
  logInEducator: (email: string, password: string) => Promise<User>
  /** Saves the class code. Returns false if no class has that code. */
  enterClassCode: (code: string) => boolean
  pickLearner: (learnerId: string) => void
  logInLearner: (pin: string) => Promise<User>
  /** New Student flow (School ID + one-time code + new PIN code): logs them in
      with no buddy yet, so the first-time setup (quiz) comes next. Fake for now. */
  logInNewStudent: (schoolId: string) => void
  /** Saves the setup picks to the learner (mock for now) and the session. */
  finishSetup: (result: SetupResult) => void
  /** Customize Bridge: saves the look. */
  saveLook: (look: Look) => void
  /** Customize Bridge pencil: renames the buddy (empty = the buddy's default name). */
  renameBuddy: (name: string) => void
  logOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
