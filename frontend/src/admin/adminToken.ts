/**
 * The admin's login token (from POST /api/admin/login), for the Admin page only.
 *
 * Its own sessionStorage key, separate from the Teacher token, so the two logins
 * never mix. Closing the tab logs the admin out. Storage can be blocked, so every
 * read and write is wrapped and a copy is kept in memory (then the login works
 * until a reload).
 */
const ADMIN_TOKEN_KEY = 'kiddex.adminToken'

let memoryToken: string | null = null

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || null
  } catch {
    return memoryToken
  }
}

export function setAdminToken(token: string): void {
  memoryToken = token
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  } catch {
    // Ignore: the memory copy is used until the page is reloaded.
  }
}

export function clearAdminToken(): void {
  memoryToken = null
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    // Ignore: nothing more we can do.
  }
}
