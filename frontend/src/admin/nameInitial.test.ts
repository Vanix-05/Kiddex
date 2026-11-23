import { describe, expect, it } from 'vitest'
import { nameInitial } from './nameInitial'

describe('nameInitial', () => {
  it('skips titles', () => {
    expect(nameInitial('Mr. Gucci')).toBe('G')
    expect(nameInitial('Ms. Santos')).toBe('S')
    expect(nameInitial('Mrs Reyes')).toBe('R')
    expect(nameInitial('Dr. Lim')).toBe('L')
    expect(nameInitial('Sir Carlo')).toBe('C')
    expect(nameInitial("Ma'am Ana")).toBe('A')
    expect(nameInitial('Ma’am Bea')).toBe('B')
  })

  it('keeps names with more than one word', () => {
    expect(nameInitial('Ms. Dela Cruz')).toBe('D')
    expect(nameInitial('ana santos')).toBe('A')
  })

  it('uses the title when the name is only a title', () => {
    expect(nameInitial('Sir')).toBe('S')
  })

  it('handles accents and empty names', () => {
    expect(nameInitial('Ms. Ñuñez')).toBe('Ñ')
    expect(nameInitial('   ')).toBe('')
  })
})
