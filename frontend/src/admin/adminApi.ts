/**
 * The Admin page's calls (backend/README.md, "Admin page"). They go through the
 * shared api() in teacher/api/client.ts, with the ADMIN token instead of the
 * Teacher's. When the backend ends the admin login (401 LOGIN_NEEDED), the admin
 * token is forgotten and the handler (set by the Teachers page) opens Admin
 * Login with a notice, once per token, so it can't loop.
 */
import { api, ApiError } from '../teacher/api/client'
import { clearAdminToken, getAdminToken } from './adminToken'

export interface AdminTeacher {
  id: string
  name: string
  email: string
  active: boolean
  /** ISO time, or null if the Teacher never logged in. */
  lastLoginAt: string | null
  createdAt: string
  lessonCount: number
}

/** After Add Teacher or Reset password. The password is only ever sent this once. */
export interface TeacherWithPassword {
  teacher: AdminTeacher
  temporaryPassword: string
}

/** The free backend can take about 50 seconds to wake up: the login waits up to 75. */
const LOGIN_TIMEOUT_MS = 75_000

let loginEndedHandler: (() => void) | null = null

/** The Teachers page sets this: go to Admin Login with "Your login ended…". */
export function setAdminLoginEndedHandler(handler: (() => void) | null) {
  loginEndedHandler = handler
}

type CallOptions = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown }

async function adminCall<T>(path: string, options: CallOptions = {}): Promise<T> {
  const sentToken = getAdminToken()
  try {
    return await api<T>(path, { ...options, authToken: sentToken })
  } catch (err) {
    // Only for the token we sent, and only once: later answers find it gone.
    if (err instanceof ApiError && err.status === 401 && err.code === 'LOGIN_NEEDED' && sentToken && getAdminToken() === sentToken) {
      clearAdminToken()
      loginEndedHandler?.()
    }
    throw err
  }
}

const enc = encodeURIComponent

export const adminApi = {
  logIn: (email: string, password: string) =>
    api<{ token: string; admin: { id: string; name: string; email: string } }>('/api/admin/login', {
      method: 'POST',
      body: { email, password },
      timeoutMs: LOGIN_TIMEOUT_MS,
      authToken: null,
    }),
  teachers: () => adminCall<AdminTeacher[]>('/api/admin/teachers'),
  addTeacher: (name: string, email: string) =>
    adminCall<TeacherWithPassword>('/api/admin/teachers', { method: 'POST', body: { name, email } }),
  resetPassword: (id: string) =>
    adminCall<TeacherWithPassword>(`/api/admin/teachers/${enc(id)}/reset-password`, { method: 'POST' }),
  setActive: (id: string, active: boolean) =>
    adminCall<{ teacher: AdminTeacher }>(`/api/admin/teachers/${enc(id)}`, { method: 'PATCH', body: { active } }),
}
