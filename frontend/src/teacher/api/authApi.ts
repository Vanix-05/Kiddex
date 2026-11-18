/** Teacher login calls (backend/README.md, "Teacher login"). */
import { api } from './client'

export interface ServerTeacher {
  id: string
  name: string
  email: string
}

export const authApi = {
  /** Right email + password: a login token (8 hours) and the Teacher. */
  logIn: (email: string, password: string) =>
    api<{ token: string; teacher: ServerTeacher }>('/api/auth/teacher/login', { method: 'POST', body: { email, password } }),
  /** Checks the saved token (after a page reload). */
  me: () => api<{ teacher: ServerTeacher }>('/api/auth/me'),
}
