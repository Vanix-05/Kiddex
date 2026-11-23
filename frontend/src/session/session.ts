import { createContext, useContext } from 'react'
import type { Avatar } from '../setup/avatar'
import type { Look } from '../setup/customizeData'
import type { BuddyId } from '../setup/quizData'

export type Role = 'student' | 'teacher'

/** Shown above the Teacher Login form when the backend ended the login. */
export const LOGIN_ENDED_NOTICE = 'Your login ended. Please log in again.'

/** What Teacher Login may get in its location state. */
export interface TeacherLoginState {
  notice?: string
}

export const isRole =(r: unknown): r is Role => r === 'student' || r === 'teacher'

export interface User {
  /** A Teacher's email, or a Student's School ID. */
  username: string
  role: Role
  /** A Teacher's name from the backend, e.g. "Mr. Gucci". */
  name?: string
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
  /** The loading video has played while the Lobby loaded (the first time the Lobby opens in a session). Screen only. */
  seenLoadingVideo: boolean
  /** A Student's class section, e.g. "Grade 4 – Sampaguita" (null for a Teacher). */
  section: string | null
}

/** What the student picked during first-time setup. */
export interface SetupResult {
  avatar: Avatar
  buddy: BuddyId
  /** Empty = the buddy's default name. */
  nickname: string
}

/** After a Student login: has the Student picked their buddy (setup done)? */
export interface StudentLoggedIn {
  hasBuddy: boolean
}

export interface SessionContextValue extends SessionState {
  /** Real login (backend). Throws an Error with a friendly message on failure. */
  logInTeacher: (email: string, password: string) => Promise<User>
  /** New Student book, before the PIN code page: right School ID + one-time code?
      Throws an ApiError (401 WRONG_LOGIN, 429 TOO_MANY_TRIES, NETWORK…). Does not log in. */
  checkStudentCode: (schoolId: string, code: string) => Promise<void>
  /** New Student (School ID + one-time code + new PIN code): saves the PIN code and logs
      them in, usually with no buddy yet, so the first-time setup comes next. Throws an ApiError. */
  logInNewStudent: (schoolId: string, code: string, pin: string) => Promise<StudentLoggedIn>
  /** Returning Student (School ID + PIN code): logs them in with their kid, buddy and look.
      Throws an ApiError. */
  logInReturningStudent: (schoolId: string, pin: string) => Promise<StudentLoggedIn>
  /** Saves the setup picks (PUT /api/student/setup), then puts them in the session.
      Throws an ApiError if it can't be saved (nothing changes then). */
  finishSetup: (result: SetupResult) => Promise<void>
  /** Customize Bridge: saves the look (on screen now, on the server in the background). */
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
