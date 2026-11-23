/**
 * Talks to the KIDDEX backend. Never holds an API key: the backend talks to the AI.
 *
 * In development VITE_API_URL is empty and Vite passes /api/... to the backend
 * (vite.config.ts). For the real website, VITE_API_URL is the backend's address.
 *
 * Every call sends the login token of whoever is logged in on this tab (a Teacher
 * or a Student; session/authToken.ts) as Authorization: Bearer .... If the backend
 * says the login ended (401 LOGIN_NEEDED), the token is forgotten and the
 * login-ended handler (set by SessionProvider) logs out and opens the right login
 * screen (Teacher Login with a notice, or the Student welcome card).
 */
import { clearToken, getToken } from '../../session/authToken'

/** The backend's address, without a trailing slash ('' = this same site). */
export const API_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const NETWORK_MESSAGE = 'We can’t reach KIDDEX right now. Please check your connection and try again.'
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.'

/** An error from the backend, with its own friendly message for the Teacher. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export const networkError = () => new ApiError('NETWORK', NETWORK_MESSAGE)

/** Reads `{ error: { code, message } }` from a failed answer (or makes a general one). */
export function errorFromBody(status: number, body: unknown): ApiError {
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN'
  const message = typeof error?.message === 'string' && error.message ? error.message : UNKNOWN_MESSAGE
  return new ApiError(code, message, status)
}

// ---------- Login ended ----------

let loginEndedHandler: (() => void) | null = null

/** SessionProvider sets this: log out and go to the right login screen. */
export function setLoginEndedHandler(handler: (() => void) | null) {
  loginEndedHandler = handler
}

/**
 * Call with every failed answer. On 401 LOGIN_NEEDED for the token we sent, forget
 * the token and tell the handler, once: later answers for that same token (other
 * calls that were already on their way) find it gone and do nothing, so this never loops.
 */
export function checkLoginEnded(error: ApiError, sentToken: string | null) {
  if (error.status !== 401 || error.code !== 'LOGIN_NEEDED') return
  if (!sentToken || getToken() !== sentToken) return
  clearToken()
  loginEndedHandler?.()
}

/** The friendly words of any error (an ApiError's own message, else a general one). */
export const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : UNKNOWN_MESSAGE)

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  signal?: AbortSignal
  /** Give up after this long (then: the "can't reach KIDDEX" error). Default: wait as long as the browser does. */
  timeoutMs?: number
  /**
   * Another login's token to send instead of the Teacher's (the Admin page passes
   * its own; null = send none). When set, the Teacher "login ended" handling is
   * skipped: the caller handles its own 401.
   */
  authToken?: string | null
}

/** Calls the backend and returns its JSON answer. Throws an ApiError on any failure. */
export async function api<T>(
  path: string,
  { method = 'GET', body, signal, timeoutMs, authToken }: ApiOptions = {},
): Promise<T> {
  const ownToken = authToken !== undefined
  const sentToken = ownToken ? authToken : getToken()
  const headers: Record<string, string> = sentToken ? { Authorization: `Bearer ${sentToken}` } : {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // Our own time limit, separate from the caller's signal (works on older phones too).
  const limit = new AbortController()
  const stopOnCaller = () => limit.abort()
  signal?.addEventListener('abort', stopOnCaller, { once: true })
  const timer = timeoutMs ? setTimeout(() => limit.abort(), timeoutMs) : undefined

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: signal || timeoutMs ? limit.signal : undefined,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw networkError()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stopOnCaller)
  }

  // 204 No Content (deletes).
  if (response.status === 204) return undefined as T

  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    // Not JSON (for example the dev proxy when the backend is not running).
  }
  if (!response.ok) {
    // The Vite proxy answers 500/502/504 without our JSON when the backend is down.
    if (json === null && response.status >= 500) throw networkError()
    const error = errorFromBody(response.status, json)
    if (!ownToken) checkLoginEnded(error, sentToken)
    throw error
  }
  return json as T
}
