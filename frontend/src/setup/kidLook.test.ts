import { describe, expect, it } from 'vitest'
import { DEFAULT_PICKS, findItem, ITEMS, kidLook, type LookKey } from './customizeData'

const swatch = (key: LookKey, id: string) => findItem(key, id)!.swatch!

describe('kidLook', () => {
  it('an empty look is each kid’s default (like the kids before the wardrobe)', () => {
    expect(kidLook({}, 'girl')).toEqual({
      hair: 'bob',
      hairColor: swatch('hair', 'brown'),
      top: 'blouse',
      topColor: swatch('shirt', 'yellow'),
      bottom: 'skirt',
      bottomColor: swatch('shirt', 'purple'),
      shoes: 'maryjanes',
      shoesColor: swatch('shirt', 'charcoal'),
      skin: undefined,
      eyeColor: swatch('eyeColor', 'brown'),
      eyes: 'round',
    })
    const boy = kidLook({}, 'boy')
    expect([boy.hair, boy.top, boy.bottom, boy.shoes]).toEqual(['classic', 'polo', 'pants', 'school'])
    expect([boy.hairColor, boy.topColor]).toEqual([swatch('hair', 'black'), swatch('shirt', 'white')])
  })

  it('the other kid’s pieces fall back to this kid’s defaults', () => {
    const boy = kidLook({ hairStyle: 'bob', bottom: 'skirt', top: 'hoodie' }, 'boy')
    expect(boy.hair).toBe(DEFAULT_PICKS.boy.hairStyle)
    expect(boy.bottom).toBe(DEFAULT_PICKS.boy.bottom)
    expect(boy.top).toBe('hoodie') // both kids wear hoodies
    const girl = kidLook({ hairStyle: 'bald', bottom: 'cargo' }, 'girl')
    expect([girl.hair, girl.bottom]).toEqual(['bob', 'skirt'])
  })

  it('unknown ids fall back too', () => {
    const k = kidLook({ hairStyle: 'mohawk', shirt: 'gold', eyes: 'laser' }, 'girl')
    expect([k.hair, k.topColor, k.eyes]).toEqual(['bob', swatch('shirt', 'yellow'), 'round'])
  })

  it('an old look (only skin, hair and shirt) keeps its colors and gets the default pieces', () => {
    const k = kidLook({ skin: 'skin6', hair: 'ginger', shirt: 'mint' }, 'boy')
    expect(k.skin).toBe(swatch('skin', 'skin6'))
    expect(k.hairColor).toBe(swatch('hair', 'ginger'))
    expect(k.topColor).toBe(swatch('shirt', 'mint'))
    expect([k.hair, k.top, k.bottom, k.shoes]).toEqual(['classic', 'polo', 'pants', 'school'])
  })

  it('bottom and shoes take their own colors from the clothes palette', () => {
    const k = kidLook({ bottomColor: 'navy', shoesColor: 'red' }, 'girl')
    expect([k.bottomColor, k.shoesColor]).toEqual([swatch('shirt', 'navy'), swatch('shirt', 'red')])
  })
})

// The backend keeps a copy of every look key and id (backend/src/content/studentSetup.ts).
// Found with Vite's glob, so nothing is checked when the backend folder isn't next to this one.
const backend = import.meta.glob<{ LOOK_ITEMS: Record<string, readonly string[]> }>('../../../backend/src/content/studentSetup.ts')
const loadBackend = Object.values(backend)[0]
describe.skipIf(!loadBackend)('the backend allows every look', () => {
  it('every frontend look key and id is in LOOK_ITEMS', async () => {
    const { LOOK_ITEMS } = await loadBackend!()
    for (const key of Object.keys(ITEMS) as LookKey[]) {
      expect(LOOK_ITEMS[key], key).toBeDefined()
      expect([...LOOK_ITEMS[key]], key).toEqual(ITEMS[key].map((i) => i.id))
    }
  })
})
