import { describe, expect, it } from 'vitest'
import type { RigPart, RigParts, TracedPath } from '../TracedRig'
import { buildKidParts } from './buildKidParts'
import { DEFAULT_LOOK, lookFiles, type KidLook } from './items'

/**
 * Fake pieces: each part of each piece is one shape whose path data names the
 * piece, so the merged order can be read back. Fills are far from every
 * recolor key, so nothing changes color.
 */
const PIECE_PARTS: Record<string, RigPart[]> = {
  base: ['head', 'body', 'armLeft', 'armRight', 'legLeft', 'legRight'],
  'face-girl': ['head'],
  'face-boy': ['head'],
  'hair-girl-pigtails-back': ['head'],
  'hair-girl-pigtails-front': ['head'],
  'hair-boy-classic-front': ['head'],
  'top-hoodie': ['body', 'armLeft', 'armRight', 'bodyFront'],
  'bottom-pants': ['body', 'legLeft', 'legRight'],
  'bottom-skirt': ['body'],
  'shoes-sneakers': ['legLeft', 'legRight'],
}
const isHair = (file: string) => file.startsWith('hair-')
function fakePiece(file: string): Partial<RigParts> {
  const parts: Partial<RigParts> = {}
  for (const part of PIECE_PARTS[file] ?? []) parts[part] = [[file, '#00FF00', isHair(file) ? 'hair' : 'base'] as TracedPath]
  return parts
}
const order = (parts: RigParts, part: RigPart) => (parts[part] ?? []).map(([d]) => d)

describe('buildKidParts', () => {
  const girl: KidLook = { ...DEFAULT_LOOK.girl, hair: 'pigtails', top: 'hoodie', bottom: 'pants', shoes: 'sneakers' }
  const parts = buildKidParts('girl', girl, fakePiece)

  it('puts the layers back to front', () => {
    expect(order(parts, 'head')).toEqual(['hair-girl-pigtails-back', 'base', 'face-girl', 'hair-girl-pigtails-front'])
    expect(order(parts, 'body')).toEqual(['base', 'bottom-pants', 'top-hoodie'])
    expect(order(parts, 'armLeft')).toEqual(['base', 'top-hoodie'])
    expect(order(parts, 'armRight')).toEqual(['base', 'top-hoodie'])
    expect(order(parts, 'legLeft')).toEqual(['base', 'bottom-pants', 'shoes-sneakers'])
    expect(order(parts, 'legRight')).toEqual(['base', 'bottom-pants', 'shoes-sneakers'])
    expect(order(parts, 'bodyFront')).toEqual(['top-hoodie'])
    expect(parts.belly).toEqual([])
  })

  it('draws Shorts with no layer (the base body has them)', () => {
    const shorts = buildKidParts('girl', { ...girl, bottom: 'shorts' }, fakePiece)
    expect(order(shorts, 'body')).toEqual(['base', 'top-hoodie'])
    expect(order(shorts, 'legLeft')).toEqual(['base', 'shoes-sneakers'])
  })

  it('gives Bald no hair shapes', () => {
    const bald = buildKidParts('boy', { ...DEFAULT_LOOK.boy, hair: 'bald' }, fakePiece)
    expect(order(bald, 'head')).toEqual(['base', 'face-boy'])
    expect(Object.values(bald).flat().some(([, , group]) => group === 'hair')).toBe(false)
    expect(lookFiles('boy', { ...DEFAULT_LOOK.boy, hair: 'bald' }).some(isHair)).toBe(false)
  })

  it('recolors each clothing layer with its own color', () => {
    const blue = (file: string): Partial<RigParts> =>
      Object.fromEntries(Object.entries(fakePiece(file)).map(([p, s]) => [p, s.map(([d, , g]) => [d, '#BAC8DA', g])]))
    const look = { ...girl, topColor: '#B9EAD2', bottomColor: '#F4877C', shoesColor: '#6F86C0' }
    const out = buildKidParts('girl', look, blue)
    const fill = (part: RigPart, file: string) => out[part]?.find(([d]) => d === file)?.[1]
    expect(fill('body', 'top-hoodie')).toBe('#B9EAD2')
    expect(fill('body', 'bottom-pants')).toBe('#F4877C')
    expect(fill('legLeft', 'shoes-sneakers')).toBe('#6F86C0')
  })

  it('throws if a piece is not loaded', () => {
    expect(() => buildKidParts('girl', girl, () => undefined)).toThrow(/not loaded/)
  })
})
