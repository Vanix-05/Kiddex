import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** A tiny stand-in for sessionStorage (tests run without a browser). */
function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

/** sessionStorage that throws on every use (blocked storage, private mode). */
const brokenStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

// A fresh copy of the module each time (it keeps a memory copy of the token).
const loadAuthToken = async () => {
  vi.resetModules()
  return import('./authToken')
}

describe('authToken', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('with working storage', () => {
    beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()))

    it('starts with no token', async () => {
      const { getToken } = await loadAuthToken()
      expect(getToken()).toBeNull()
    })

    it('saves, reads and clears the token', async () => {
      const { getToken, setToken, clearToken } = await loadAuthToken()
      setToken('abc.def.ghi')
      expect(getToken()).toBe('abc.def.ghi')
      expect(sessionStorage.getItem('kiddex.loginToken')).toBe('abc.def.ghi')
      clearToken()
      expect(getToken()).toBeNull()
    })
  })

  describe('when storage throws', () => {
    beforeEach(() => vi.stubGlobal('sessionStorage', brokenStorage))

    it('does not crash and keeps the token in memory until cleared', async () => {
      const { getToken, setToken, clearToken } = await loadAuthToken()
      expect(() => getToken()).not.toThrow()
      expect(getToken()).toBeNull()
      expect(() => setToken('abc.def.ghi')).not.toThrow()
      expect(getToken()).toBe('abc.def.ghi')
      expect(() => clearToken()).not.toThrow()
      expect(getToken()).toBeNull()
    })
  })
})
