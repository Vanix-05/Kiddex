/** Teacher login calls (backend/README.md, "Teacher login"). */
import { api } from './client'

export interface ServerTeacher {
  id: string
  name: string
  email: string
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
  /** Checks the saved token (after a page reload). */
  me: () => api<{ teacher: ServerTeacher }>('/api/auth/me'),
}
