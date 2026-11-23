/**
 * Student login and the Student's own data (backend/README.md, "Student login").
 * School ID + PIN code are two credentials, like a username and a password.
 * Screens don't call these directly: they use the session (SessionProvider).
 */
import { api } from '../teacher/api/client'

/** What the backend sends about the logged-in Student (never a code or a hash). */
export interface StudentProfile {
  /** "2026-0144" */
  schoolId: string
  section: { grade: number; name: string }
  avatar: string | null
  buddy: string | null
  buddyName: string | null
  look: unknown
  seenIntroClip: boolean
  seenBridgeCutscene: boolean
}

/** What PATCH /api/student/me takes (any of them). */
export interface StudentPatch {
  look?: Record<string, string>
  buddyName?: string | null
  seenIntroClip?: boolean
  seenBridgeCutscene?: boolean
}

/** The free server can take about 50 seconds to wake up, so the login waits up to 75 (like Teacher Login). */
const LOGIN_TIMEOUT_MS = 75_000

/** The login addresses send no token (an old one on this tab must not matter). */
const loginCall = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body, timeoutMs: LOGIN_TIMEOUT_MS, authToken: null })

type LoggedIn = { token: string; student: StudentProfile }

export const studentApi = {
  /** New Student book: right School ID + one-time code? Does not log in. */
  checkCode: (schoolId: string, code: string) => loginCall<{ ok: true }>('/api/auth/student/check-code', { schoolId, code }),
  /** New Student: saves the new PIN code; the one-time code stops working. */
  firstLogin: (schoolId: string, code: string, pin: string) =>
    loginCall<LoggedIn>('/api/auth/student/first-login', { schoolId, code, pin }),
  /** Returning Student. */
  logIn: (schoolId: string, pin: string) => loginCall<LoggedIn>('/api/auth/student/login', { schoolId, pin }),
  /** Checks the saved login after a page reload. */
  me: () => api<{ student: StudentProfile }>('/api/student/me'),
  /** The end of the first-time setup. */
  setup: (body: { avatar: string; buddy: string; buddyName: string | null }) =>
    api<{ student: StudentProfile }>('/api/student/setup', { method: 'PUT', body }),
  /** Customize Bridge, the rename pencil and the two "seen" flags. */
  patch: (body: StudentPatch) => api<{ student: StudentProfile }>('/api/student/me', { method: 'PATCH', body }),
}
