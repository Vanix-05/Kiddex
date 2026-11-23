/** Teacher login and own-password calls (backend/README.md, "Teacher login"). */
import { api } from './client'

export interface ServerTeacher {
  id: string
  name: string
  email: string
}

/** The Teacher's password state, for the key button's dot and the sticky note. */
export interface PasswordFlags {
  /** Still the one the admin made (new account or Reset password). */
  temporary: boolean
  /** The Teacher closed the "still temporary" sticky note. */
  noteHidden: boolean
}

export interface Me {
  teacher: ServerTeacher
  password: PasswordFlags
}

/**
 * The free backend server sleeps when not used and the first call can take
 * about 50 seconds while it wakes up, so the login waits up to 75 seconds.
 */
const LOGIN_TIMEOUT_MS = 75_000

export const authApi = {
  /** Right email + password: a login token (8 hours) and the Teacher. */
  logIn: (email: string, password: string) =>
    api<{ token: string; teacher: ServerTeacher }>('/api/auth/teacher/login', {
      method: 'POST',
      body: { email, password },
      timeoutMs: LOGIN_TIMEOUT_MS,
    }),
  /** Checks the saved token (after a page reload), with the password flags. */
  me: () => api<Me>('/api/auth/me'),
  /**
   * The Teacher picks their own password. Answers a NEW token for this tab:
   * every other computer logged in as this Teacher is logged out.
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ token: string }>('/api/auth/teacher/password', { method: 'POST', body: { currentPassword, newPassword } }),
  /** The sticky note's X. */
  hidePasswordNote: () => api<{ ok: true }>('/api/auth/teacher/password-note', { method: 'PATCH', body: { hidden: true } }),
}
