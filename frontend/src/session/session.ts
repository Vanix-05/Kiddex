import { createContext, useContext } from 'react'

export type Role = 'learner' | 'educator'

export interface User {
  username: string
  role: Role
}

export interface SessionState {
  user: User | null
  /** The logged-in learner's companion (null = not picked yet). */
  companionId: string | null
  /** Learner login in progress: the class code they typed... */
  classCode: string | null
  /** ...and the learner tile they tapped on "Who are you?". */
  learnerId: string | null
}

export interface SessionContextValue extends SessionState {
  logInEducator: (email: string, password: string) => Promise<User>
  /** Saves the class code. Returns false if no class has that code. */
  enterClassCode: (code: string) => boolean
  pickLearner: (learnerId: string) => void
  logInLearner: (pin: string) => Promise<User>
  logOut: () => void
  setCompanion: (id: string) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
