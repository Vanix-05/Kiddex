import { createContext, useContext } from 'react'
import type { Avatar } from '../setup/avatar'
import type { Look } from '../setup/customizeData'
import type { BuddyId } from '../setup/quizData'

export type Role = 'student' | 'teacher'

export const isRole = (r: unknown): r is Role => r === 'student' || r === 'teacher'

export interface User {
  username: string
  role: Role
}

export interface SessionState {
  user: User | null
  /** The logged-in student's companion (null = not picked yet). */
  companionId: string | null
  /** The logged-in student's own character (null = not picked yet). */
  avatar: Avatar | null
  /** What the student named their buddy (null = the buddy's default name). */
  buddyName: string | null
  /** The Customize Bridge picks (skin, hair, shirt, extras, buddy color). Empty = the art as drawn. */
  look: Look
  /** The Customize Bridge -> Rene Island cutscene has played (it plays once). */
  seenBridgeCutscene: boolean
  /** The bedroom intro clip before the setup storybook has played (it plays once). */
  seenIntroClip: boolean
  /** The loading video has played while the Lobby loaded (the first time the Lobby opens in a session). */
  seenLoadingVideo: boolean
}

/** What the student picked during first-time setup. */
export interface SetupResult {
  avatar: Avatar
  buddy: BuddyId
  /** Empty = the buddy's default name. */
  nickname: string
}

export interface SessionContextValue extends SessionState {
  logInTeacher: (email: string, password: string) => Promise<User>
  /** New Student flow (School ID + one-time code + new PIN code): logs them in
      with no buddy yet, so the first-time setup (quiz) comes next. Fake for now. */
  logInNewStudent: (schoolId: string) => void
  /** Saves the setup picks to the session (no backend yet). */
  finishSetup: (result: SetupResult) => void
  /** Customize Bridge: saves the look. */
  saveLook: (look: Look) => void
  /** Customize Bridge pencil: renames the buddy (empty = the buddy's default name). */
  renameBuddy: (name: string) => void
  /** Go to Lobby: the cutscene played (or was skipped), so next time it opens /lobby straight away. */
  markBridgeCutsceneSeen: () => void
  /** The bedroom intro clip started (or was skipped): a reload of /setup won't play it again. */
  markIntroClipSeen: () => void
  /** The Lobby's loading video started: later Lobby entries show "Opening your classroom…" instead. */
  markLoadingVideoSeen: () => void
  logOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
