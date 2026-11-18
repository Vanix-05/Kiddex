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

const blocked = () => {
  throw new Error('blocked')
}
const brokenStorage = { getItem: blocked, setItem: blocked, removeItem: blocked }

// Fresh copies each time (they keep a memory copy of the token).
async function load() {
  vi.resetModules()
  return { admin: await import('./adminToken'), teacher: await import('../session/authToken') }
}

describe('adminToken', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('with working storage', () => {
    beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()))

    it('saves, reads and clears the admin token', async () => {
      const { admin } = await load()
      expect(admin.getAdminToken()).toBeNull()
      admin.setAdminToken('adm.in.token')
      expect(admin.getAdminToken()).toBe('adm.in.token')
      expect(sessionStorage.getItem('kiddex.adminToken')).toBe('adm.in.token')
      admin.clearAdminToken()
      expect(admin.getAdminToken()).toBeNull()
    })

    it('never mixes with the Teacher token', async () => {
      const { admin, teacher } = await load()
      teacher.setToken('teach.er.token')
      admin.setAdminToken('adm.in.token')
      expect(teacher.getToken()).toBe('teach.er.token')
      admin.clearAdminToken()
      expect(teacher.getToken()).toBe('teach.er.token')
      teacher.clearToken()
      expect(admin.getAdminToken()).toBeNull()
    })
  })

  describe('when storage throws', () => {
    beforeEach(() => vi.stubGlobal('sessionStorage', brokenStorage))

    it('does not crash and keeps the token in memory until cleared', async () => {
      const { admin } = await load()
      expect(admin.getAdminToken()).toBeNull()
      expect(() => admin.setAdminToken('adm.in.token')).not.toThrow()
      expect(admin.getAdminToken()).toBe('adm.in.token')
      expect(() => admin.clearAdminToken()).not.toThrow()
      expect(admin.getAdminToken()).toBeNull()
    })
  })
})
