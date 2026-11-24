/**
 * Rounds that couldn't be saved yet (no internet, the server asleep…), kept in this
 * browser's localStorage (kiddex.pendingRounds) and sent again the next time the
 * games data loads. Sending one twice is safe: the backend ignores a clientRoundId
 * it already has.
 *
 * Each round remembers whose it is (`owner`, the logged-in Student), so a classmate
 * logging in on the same computer never sends someone else's round.
 * Every read and write is in try/catch: blocked storage just means nothing is kept.
 */
import { ApiError } from '../teacher/api/client'
import type { RoundBody } from './studentGames'

export const PENDING_KEY = 'kiddex.pendingRounds'
/** At most this many are kept; the oldest go first. */
export const MAX_PENDING = 20

export interface PendingRound {
  owner: string
  body: RoundBody
}

/** The bit of localStorage we use (a stand-in in the tests). */
export type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const browserStore = (): KeyStore | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const isPending = (p: unknown): p is PendingRound =>
  !!p &&
  typeof (p as PendingRound).owner === 'string' &&
  typeof (p as PendingRound).body?.clientRoundId === 'string' &&
  Array.isArray((p as PendingRound).body?.answers)

export function readPending(store: KeyStore | null = browserStore()): PendingRound[] {
  try {
    const raw = store?.getItem(PENDING_KEY)
    if (!raw) return []
    const list: unknown = JSON.parse(raw)
    return Array.isArray(list) ? list.filter(isPending) : []
  } catch {
    return []
  }
}

function writePending(list: PendingRound[], store: KeyStore | null) {
  try {
    if (!store) return
    if (list.length) store.setItem(PENDING_KEY, JSON.stringify(list))
    else store.removeItem(PENDING_KEY)
  } catch {
    // Storage full or blocked: the round just isn't kept.
  }
}

/** Keeps a round to send later (once; at most MAX_PENDING, the oldest dropped). */
export function addPending(round: PendingRound, store: KeyStore | null = browserStore()) {
  const list = readPending(store).filter((p) => p.body.clientRoundId !== round.body.clientRoundId)
  writePending([...list, round].slice(-MAX_PENDING), store)
}

export function removePending(clientRoundId: string, store: KeyStore | null = browserStore()) {
  writePending(
    readPending(store).filter((p) => p.body.clientRoundId !== clientRoundId),
    store,
  )
}

/** A 400 or 404 means it can never be saved (the game or a question is gone): don't keep it. */
export const neverSaves = (err: unknown) => err instanceof ApiError && (err.status === 400 || err.status === 404)

/**
 * Sends this Student's kept rounds again, one by one. A saved one is removed, and so
 * is one that can never be saved (400/404). Anything else (still offline) stays, and
 * the rest wait for next time. Answers how many were saved.
 */
export async function resendPending(
  owner: string,
  send: (body: RoundBody) => Promise<unknown>,
  store: KeyStore | null = browserStore(),
): Promise<number> {
  let saved = 0
  for (const round of readPending(store).filter((p) => p.owner === owner)) {
    try {
      await send(round.body)
      saved++
      removePending(round.body.clientRoundId, store)
    } catch (err) {
      if (!neverSaves(err)) break
      removePending(round.body.clientRoundId, store)
    }
  }
  return saved
}
