/**
 * The Teacher's login token (from POST /api/auth/teacher/login).
 *
 * Kept in sessionStorage, so closing the tab logs the Teacher out: what we want
 * on shared school computers. Storage can be blocked (private mode, settings),
 * so every read and write is wrapped, and a copy is kept in memory: then the
 * login still works, just not after a reload.
 */
const TOKEN_KEY = 'kiddex.teacherToken'

let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null
  } catch {
    return memoryToken
  }
}

export function setToken(token: string): void {
  memoryToken = token
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore: the memory copy is used until the page is reloaded.
  }
}

export function clearToken(): void {
  memoryToken = null
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore: nothing more we can do.
  }
}
