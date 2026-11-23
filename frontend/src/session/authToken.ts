/**
 * The login token of whoever is logged in on this tab: a Teacher (POST
 * /api/auth/teacher/login) or a Student (POST /api/auth/student/login or
 * first-login). Only one at a time; teacher/api/client.ts sends it with every call.
 *
 * Kept in sessionStorage, so closing the tab logs out: what we want on shared
 * school computers. Storage can be blocked (private mode, settings),
 * so every read and write is wrapped, and a copy is kept in memory: then the
 * login still works, just not after a reload.
 */
const TOKEN_KEY = 'kiddex.loginToken'

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
