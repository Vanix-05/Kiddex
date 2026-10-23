import { createContext, useContext } from 'react'

export type Role = 'learner' | 'educator'

export interface User {
  username: string
  role: Role
}

export interface SessionState {
  user: User | null
  /** The companion picked on the Choose Your Companion screen. */
  companionId: string | null
}

export interface SessionContextValue extends SessionState {
  logIn: (username: string, password: string) => Promise<User>
  logOut: () => void
  setCompanion: (id: string) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
