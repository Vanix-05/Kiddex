/**
 * Talks to the KIDDEX backend. Never holds an API key: the backend talks to the AI.
 *
 * In development VITE_API_URL is empty and Vite passes /api/... to the backend
 * (vite.config.ts). For the real website, VITE_API_URL is the backend's address.
 */

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

/** The friendly words of any error (an ApiError's own message, else a general one). */
export const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : UNKNOWN_MESSAGE)

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  signal?: AbortSignal
}

/** Calls the backend and returns its JSON answer. Throws an ApiError on any failure. */
export async function api<T>(path: string, { method = 'GET', body, signal }: ApiOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw networkError()
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
    throw errorFromBody(response.status, json)
  }
  return json as T
}
