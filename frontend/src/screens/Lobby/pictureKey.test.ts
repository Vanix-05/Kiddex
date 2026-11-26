import { describe, expect, it } from 'vitest'
import { kidLook } from '../../setup/customizeData'
import { kidPictureKey } from './pictureKey'

describe('kid picture cache key', () => {
  const base = kidLook({}, 'boy')
  const key = (look: Parameters<typeof kidLook>[0], mood = 'calm', extras: Parameters<typeof kidPictureKey>[2] = []) =>
    kidPictureKey('boy', kidLook(look, 'boy'), extras, mood)

  it('is the same for the same look', () => {
    expect(kidPictureKey('boy', base, [], 'calm')).toBe(key({}))
  })

  it('changes when only the hair style, top or eye style changes', () => {
    const plain = key({})
    expect(key({ hairStyle: 'curly' })).not.toBe(plain)
    expect(key({ top: 'hoodie' })).not.toBe(plain)
    expect(key({ eyes: 'lashes' })).not.toBe(plain)
  })

  it('changes with any color, extras, mood or kid', () => {
    const plain = key({})
    expect(key({ shoesColor: 'red' })).not.toBe(plain)
    expect(key({ eyeColor: 'blue' })).not.toBe(plain)
    expect(key({}, 'happy')).not.toBe(plain)
    expect(key({}, 'calm', ['glasses'])).not.toBe(plain)
    expect(kidPictureKey('girl', base, [], 'calm')).not.toBe(plain)
  })
})
