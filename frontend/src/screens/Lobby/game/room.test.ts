import { describe, expect, it } from 'vitest'
import { isFree, SEATS, ZONE_IDS } from './room'

describe('the Star Shop corner (no bean bags)', () => {
  it('where the 3 bean bags stood is free to walk on', () => {
    for (const [x, y] of [
      [2.0, 9.8],
      [3.6, 11.9],
      [1.9, 12.2],
    ]) {
      expect(isFree(x, y)).toBe(true)
    }
  })

  it('every seat is a desk chair', () => {
    expect(SEATS.length).toBeGreaterThan(0)
    expect(SEATS.every((s) => s.kind === 'chair')).toBe(true)
  })

  it('the Buddy Corner zone is gone, the Star Shop stays', () => {
    expect(ZONE_IDS).not.toContain('nook')
    expect(ZONE_IDS).toContain('shop')
  })
})
