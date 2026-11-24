import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../teacher/api/client'
import { addPending, MAX_PENDING, PENDING_KEY, readPending, resendPending, type KeyStore } from './pendingRounds'
import type { RoundBody } from './studentGames'

/** A stand-in for localStorage. */
function memoryStore(): KeyStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const body = (id: string): RoundBody => ({
  clientRoundId: id,
  assignmentId: 'A1',
  game: 'quiz-show',
  startedAt: '2026-11-24T08:00:00.000Z',
  endedAt: '2026-11-24T08:05:00.000Z',
  helpsUsed: 0,
  answers: [{ questionId: 'q1', right: true, tries: 1, ms: 4000, helped: false }],
})

const ids = (store: KeyStore) => readPending(store).map((p) => p.body.clientRoundId)

describe('pending rounds (kiddex.pendingRounds)', () => {
  it('adds a round once, even if it is added again', () => {
    const store = memoryStore()
    addPending({ owner: 'me', body: body('r1') }, store)
    addPending({ owner: 'me', body: body('r1') }, store)
    expect(ids(store)).toEqual(['r1'])
  })

  it(`keeps at most ${MAX_PENDING}: the oldest is dropped`, () => {
    const store = memoryStore()
    for (let i = 1; i <= MAX_PENDING + 3; i++) addPending({ owner: 'me', body: body(`r${i}`) }, store)
    const kept = ids(store)
    expect(kept).toHaveLength(MAX_PENDING)
    expect(kept[0]).toBe('r4')
    expect(kept.at(-1)).toBe(`r${MAX_PENDING + 3}`)
  })

  it('resends them and removes each one that is saved', async () => {
    const store = memoryStore()
    addPending({ owner: 'me', body: body('r1') }, store)
    addPending({ owner: 'me', body: body('r2') }, store)
    const send = vi.fn(async () => ({}))
    expect(await resendPending('me', send, store)).toBe(2)
    expect(send).toHaveBeenCalledTimes(2)
    expect(ids(store)).toEqual([])
    expect(store.data.has(PENDING_KEY)).toBe(false)
  })

  it('drops a round that gets a 400 or 404 (it can never be saved)', async () => {
    const store = memoryStore()
    addPending({ owner: 'me', body: body('bad') }, store)
    addPending({ owner: 'me', body: body('gone') }, store)
    addPending({ owner: 'me', body: body('good') }, store)
    const send = vi.fn(async (b: RoundBody) => {
      if (b.clientRoundId === 'bad') throw new ApiError('BAD_ROUND', 'x', 400)
      if (b.clientRoundId === 'gone') throw new ApiError('GAME_NOT_FOUND', 'x', 404)
      return {}
    })
    expect(await resendPending('me', send, store)).toBe(1)
    expect(ids(store)).toEqual([])
  })

  it('keeps them when still offline, and stops trying for now', async () => {
    const store = memoryStore()
    addPending({ owner: 'me', body: body('r1') }, store)
    addPending({ owner: 'me', body: body('r2') }, store)
    const send = vi.fn(async () => {
      throw new ApiError('NETWORK', 'offline')
    })
    expect(await resendPending('me', send, store)).toBe(0)
    expect(send).toHaveBeenCalledOnce()
    expect(ids(store)).toEqual(['r1', 'r2'])
  })

  it('never sends a classmate’s rounds (another login on this computer)', async () => {
    const store = memoryStore()
    addPending({ owner: 'classmate', body: body('theirs') }, store)
    addPending({ owner: 'me', body: body('mine') }, store)
    const send = vi.fn(async () => ({}))
    await resendPending('me', send, store)
    expect(send).toHaveBeenCalledOnce()
    expect(ids(store)).toEqual(['theirs'])
  })

  it('broken or blocked storage just means nothing is kept', () => {
    const store = memoryStore()
    store.data.set(PENDING_KEY, '{not json')
    expect(readPending(store)).toEqual([])
    const blocked: KeyStore = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {},
    }
    expect(() => addPending({ owner: 'me', body: body('r1') }, blocked)).not.toThrow()
    expect(readPending(blocked)).toEqual([])
    expect(readPending(null)).toEqual([])
  })
})
