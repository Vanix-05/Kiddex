import { describe, expect, it } from 'vitest'
import { cleanLook, ITEMS, lookBuddyExtras, lookYouExtras, type LookKey } from './customizeData'

const keys = Object.keys(ITEMS) as LookKey[]

describe('Customize Bridge: no locked items', () => {
  it('no item has a level', () => {
    for (const key of keys) for (const item of ITEMS[key]) expect(item).not.toHaveProperty('level')
  })

  it('the Bridge has no cap or crown', () => {
    for (const key of keys) {
      const ids = ITEMS[key].map((i) => i.id)
      const accessories = ITEMS[key].map((i) => i.accessory)
      expect(ids).not.toContain('cap')
      expect(ids).not.toContain('crown')
      expect(accessories).not.toContain('cap')
      expect(accessories).not.toContain('crown')
    }
  })

  it('Purple, Red and Gold can be picked', () => {
    expect(cleanLook({ hair: 'purple', shirt: 'red', buddyColor: 'gold' })).toEqual({ hair: 'purple', shirt: 'red', buddyColor: 'gold' })
    expect(cleanLook({ shirt: 'purple' })).toEqual({ shirt: 'purple' })
  })

  it('an old saved cap or crown shows as None, with no crash', () => {
    const old = { youExtra: 'cap', buddyExtra: 'crown', hair: 'black' }
    expect(cleanLook(old)).toEqual({ hair: 'black' })
    expect(lookYouExtras(old)).toEqual([])
    expect(lookBuddyExtras(old)).toEqual([])
  })
})
