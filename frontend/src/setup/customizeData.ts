/**
 * Customize Bridge items (/customize): what the Student can change on their
 * own character (You) and on their buddy. Edit freely: the tray shows the
 * items in this order. Every item here is free: nothing is locked.
 */

/**
 * Only a fallback for screens with no logged-in Student (dev pages). A Student's real
 * section comes from the backend: useSession().section.
 */
export const SECTION = 'Grade 4 – Sampaguita'

import type { Avatar } from './avatar'
import type { EyeStyle, KidLook } from '../companions/wardrobe/items'

/**
 * A drawn accessory (see companions/rig/Accessories.tsx). Cap and crown stay here
 * and in Accessories.tsx, but are not on the Bridge: they come back on the real
 * Customize page.
 */
export type AccessoryId = 'glasses' | 'starClip' | 'flowerYellow' | 'scarf' | 'bow' | 'flowerPink' | 'cap' | 'crown'

export interface CustomizeItem {
  id: string
  /** Shown under the tile. Skin swatches have none (their aria label says "Skin 1", ...). */
  label: string
  /** Round color swatch on the tile. */
  swatch?: string
  /** Emoji on the tile (extras). */
  icon?: string
  /** Extras: what it draws on the character (null = none). */
  accessory?: AccessoryId | null
  /** Only for this kid (hair styles, skirt, cargo). Unset = both. */
  kid?: Avatar
}

/**
 * The Student's picks. Each value is an item id; empty = the kid's default.
 * `hair` is the hair color and `shirt` the top color (their names are older
 * than the wardrobe: saved looks use them).
 */
export interface Look {
  skin?: string
  hair?: string
  shirt?: string
  hairStyle?: string
  eyes?: string
  eyeColor?: string
  top?: string
  bottom?: string
  bottomColor?: string
  shoes?: string
  shoesColor?: string
  youExtra?: string
  buddyColor?: string
  buddyExtra?: string
}
export type LookKey = keyof Look

// ---------- You ----------

// TODO: swap for the designer's skin palette (8 boy skin PNGs)
const skin: CustomizeItem[] = ['#fff0e8', '#ffecdd', '#f8dcc4', '#eec2a0', '#cf9a74', '#a46d4e', '#74483a'].map(
  (swatch, i) => ({ id: `skin${i + 1}`, label: '', swatch }),
)

/** Hair color: two rows of 5 on the tray. */
const hair: CustomizeItem[] = [
  { id: 'brown', label: 'Brown', swatch: '#9e766e' },
  { id: 'black', label: 'Black', swatch: '#3d3034' },
  { id: 'ginger', label: 'Ginger', swatch: '#d7834e' },
  { id: 'platinum', label: 'Platinum', swatch: '#ede0c4' },
  { id: 'purple', label: 'Purple', swatch: '#9c86cf' },
  { id: 'dark', label: 'Dark', swatch: '#6a4636' },
  { id: 'auburn', label: 'Auburn', swatch: '#a5513a' },
  { id: 'blond', label: 'Blond', swatch: '#e3c07a' },
  { id: 'pink', label: 'Pink', swatch: '#f2a3b8' },
  { id: 'blue', label: 'Blue', swatch: '#7f9ee0' },
]

/** Clothes colors (top, bottom and shoes share them): two rows of 7 on the tray. */
const shirt: CustomizeItem[] = [
  { id: 'yellow', label: 'Yellow', swatch: '#ffdba3' },
  { id: 'red', label: 'Red', swatch: '#f4877c' },
  { id: 'rose', label: 'Rose', swatch: '#f4a9b8' },
  { id: 'blue', label: 'Blue', swatch: '#a9d2f5' },
  { id: 'teal', label: 'Teal', swatch: '#8fd3d0' },
  { id: 'green', label: 'Green', swatch: '#a8d58a' },
  { id: 'grey', label: 'Grey', swatch: '#c9c4c0' },
  { id: 'peach', label: 'Peach', swatch: '#ffc59a' },
  { id: 'pink', label: 'Pink', swatch: '#ffc4cf' },
  { id: 'purple', label: 'Purple', swatch: '#d6c5f2' },
  { id: 'navy', label: 'Navy', swatch: '#7d8fc9' },
  { id: 'mint', label: 'Mint', swatch: '#b9ead2' },
  { id: 'white', label: 'White', swatch: '#fbf7ee' },
  { id: 'charcoal', label: 'Charcoal', swatch: '#5b5466' },
]

/** Hair styles: each kid has their own. Bald has no hair (and no hair color). */
const hairStyle: CustomizeItem[] = [
  { id: 'bob', label: 'Bob', kid: 'girl' },
  { id: 'soft', label: 'Soft', kid: 'girl' },
  { id: 'bangs', label: 'Bangs', kid: 'girl' },
  { id: 'pigtails', label: 'Pigtails', kid: 'girl' },
  { id: 'bald', label: 'Bald', kid: 'boy' },
  { id: 'classic', label: 'Classic', kid: 'boy' },
  { id: 'sideswept', label: 'Side-swept', kid: 'boy' },
  { id: 'curly', label: 'Curly', kid: 'boy' },
  { id: 'curtain', label: 'Curtain', kid: 'boy' },
]

/** Eye styles: Round is the eyes as drawn. */
const eyes: CustomizeItem[] = [
  { id: 'round', label: 'Round' },
  { id: 'sparkly', label: 'Sparkly' },
  { id: 'lashes', label: 'Lashes' },
]

const eyeColor: CustomizeItem[] = [
  { id: 'brown', label: 'Brown', swatch: '#51332c' },
  { id: 'black', label: 'Black', swatch: '#2e2430' },
  { id: 'blue', label: 'Blue', swatch: '#2a4f7f' },
  { id: 'green', label: 'Green', swatch: '#2f5a45' },
  { id: 'amber', label: 'Amber', swatch: '#6b4a26' },
  { id: 'grey', label: 'Grey', swatch: '#4a5160' },
  { id: 'violet', label: 'Violet', swatch: '#4a3566' },
]

const top: CustomizeItem[] = [
  { id: 'polo', label: 'Polo' },
  { id: 'blouse', label: 'Blouse' },
  { id: 'layered', label: 'Layered' },
  { id: 'hoodie', label: 'Hoodie' },
]

/** Bottoms. Shorts are the body's own shorts (they take the bottom color too). */
const bottom: CustomizeItem[] = [
  { id: 'skirt', label: 'Skirt', kid: 'girl' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'pants', label: 'Pants' },
  { id: 'cargo', label: 'Cargo', kid: 'boy' },
]

const shoes: CustomizeItem[] = [
  { id: 'maryjanes', label: 'Mary Janes' },
  { id: 'school', label: 'School' },
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'sandals', label: 'Sandals' },
]

const youExtra: CustomizeItem[] = [
  { id: 'none', label: 'None', accessory: null },
  { id: 'glasses', label: 'Glasses', icon: '👓', accessory: 'glasses' },
  { id: 'starClip', label: 'Star clip', icon: '⭐', accessory: 'starClip' },
  { id: 'flower', label: 'Flower', icon: '🌼', accessory: 'flowerYellow' },
]

// ---------- Buddy ----------

// Each buddy has its own tuned palette for these (companions/<id>/buddyColors.ts).
// Keep the ids: saved looks use them.
const buddyColor: CustomizeItem[] = [
  { id: 'original', label: 'Original' },
  { id: 'pink', label: 'Pink' },
  { id: 'blue', label: 'Blue' },
  { id: 'mint', label: 'Mint' },
  { id: 'purple', label: 'Purple' },
  { id: 'gold', label: 'Gold' },
]

const buddyExtra: CustomizeItem[] = [
  { id: 'none', label: 'None', accessory: null },
  { id: 'scarf', label: 'Scarf', icon: '🧣', accessory: 'scarf' },
  { id: 'bow', label: 'Bow', icon: '🎀', accessory: 'bow' },
  { id: 'flower', label: 'Flower', icon: '🌸', accessory: 'flowerPink' },
]

export const ITEMS: Record<LookKey, CustomizeItem[]> = {
  skin,
  hair,
  shirt,
  hairStyle,
  eyes,
  eyeColor,
  top,
  bottom,
  // The bottom and shoes share the top's colors.
  bottomColor: shirt,
  shoes,
  shoesColor: shirt,
  youExtra,
  buddyColor,
  buddyExtra,
}

/** Look keys that share another key's items (the backend's copy checks them against it). */
export const SHARED_ITEMS: Partial<Record<LookKey, LookKey>> = { bottomColor: 'shirt', shoesColor: 'shirt' }

/** The items this kid can pick for a key, in tray order. */
export function itemsFor(key: LookKey, kid: Avatar): CustomizeItem[] {
  const list = ITEMS[key].filter((i) => !i.kid || i.kid === kid)
  // The boy's bottoms start with his everyday pants.
  if (key === 'bottom' && kid === 'boy') return ['pants', 'shorts', 'cargo'].map((id) => list.find((i) => i.id === id)!)
  return list
}

// ---------- Tabs ----------

export type Side = 'you' | 'buddy'

/** A tray tab. The You side's Hair, Eyes and Clothes tabs each show a style and its colors. */
export type TabId = 'skin' | 'hair' | 'eyes' | 'clothes' | 'youExtra' | 'buddyColor' | 'buddyExtra'

export interface CustomizeTab {
  key: TabId
  icon: string
  label: string
}

/** Folder tabs above the tray. The first one opens when you switch sides. */
export const TABS: Record<Side, CustomizeTab[]> = {
  you: [
    { key: 'skin', icon: '✋', label: 'Skin' },
    { key: 'hair', icon: '💇', label: 'Hair' },
    { key: 'eyes', icon: '👀', label: 'Eyes' },
    { key: 'clothes', icon: '👕', label: 'Clothes' },
    { key: 'youExtra', icon: '✨', label: 'Extra' },
  ],
  buddy: [
    { key: 'buddyColor', icon: '🎨', label: 'Color' },
    { key: 'buddyExtra', icon: '✨', label: 'Extra' },
  ],
}

// ---------- Look helpers ----------

/** The item with this id, or undefined (e.g. an old saved "cap" or "crown": shown as None / as drawn). */
export const findItem = (key: LookKey, id: string | undefined) => (id ? ITEMS[key].find((i) => i.id === id) : undefined)

/** Only for the old boy/girl rigs (the Bridge's loading fallback): the Student is drawn with kidLook + KidRig. */
export function lookColors(look: Look) {
  return {
    skin: findItem('skin', look.skin)?.swatch,
    hair: findItem('hair', look.hair)?.swatch,
    shirt: findItem('shirt', look.shirt)?.swatch,
  }
}

export const lookYouExtras = (look: Look): AccessoryId[] => {
  const a = findItem('youExtra', look.youExtra)?.accessory
  return a ? [a] : []
}

export const lookBuddyExtras = (look: Look): AccessoryId[] => {
  const a = findItem('buddyExtra', look.buddyExtra)?.accessory
  return a ? [a] : []
}

/** The buddy's color id for the rig (undefined = the buddy as drawn). */
export const lookBuddyColor = (look: Look) => findItem('buddyColor', look.buddyColor)?.id

// ---------- The kid's wardrobe look ----------

/** The keys with a per-kid default (everything KidRig draws except the skin). */
export type WardrobeKey = 'hairStyle' | 'hair' | 'eyes' | 'eyeColor' | 'top' | 'shirt' | 'bottom' | 'bottomColor' | 'shoes' | 'shoesColor'

/** Each kid's look before they pick anything: like the kids before the wardrobe. */
export const DEFAULT_PICKS: Record<Avatar, Record<WardrobeKey, string>> = {
  girl: {
    hairStyle: 'bob',
    hair: 'brown',
    eyes: 'round',
    eyeColor: 'brown',
    top: 'blouse',
    shirt: 'yellow',
    bottom: 'skirt',
    bottomColor: 'purple',
    shoes: 'maryjanes',
    shoesColor: 'charcoal',
  },
  boy: {
    hairStyle: 'classic',
    hair: 'black',
    eyes: 'round',
    eyeColor: 'brown',
    top: 'polo',
    shirt: 'white',
    bottom: 'pants',
    bottomColor: 'purple',
    shoes: 'school',
    shoesColor: 'charcoal',
  },
}

/**
 * The look's pick for a key if this kid can wear it; otherwise (missing, unknown,
 * or the other kid's, e.g. a boy with "bob") this kid's default.
 */
export function pickFor(look: Look, key: WardrobeKey, kid: Avatar): string {
  const id = look[key]
  return id && itemsFor(key, kid).some((i) => i.id === id) ? id : DEFAULT_PICKS[kid][key]
}

const swatchOf = (key: LookKey, id: string) => findItem(key, id)?.swatch ?? ''

/**
 * A saved look as KidRig draws it (the Bridge now; the Lobby and cutscene in wb-3).
 * Old looks (only skin, hair and shirt) keep their colors and get the default pieces.
 */
export function kidLook(look: Look, kid: Avatar): KidLook {
  const pick = (key: WardrobeKey) => pickFor(look, key, kid)
  return {
    hair: pick('hairStyle'),
    hairColor: swatchOf('hair', pick('hair')),
    top: pick('top'),
    topColor: swatchOf('shirt', pick('shirt')),
    bottom: pick('bottom'),
    bottomColor: swatchOf('bottomColor', pick('bottomColor')),
    shoes: pick('shoes'),
    shoesColor: swatchOf('shoesColor', pick('shoesColor')),
    skin: findItem('skin', look.skin)?.swatch,
    eyeColor: swatchOf('eyeColor', pick('eyeColor')),
    eyes: pick('eyes') as EyeStyle,
  }
}

/** A saved look with only known item ids (e.g. from sessionStorage); unknown ones (cap, crown) are dropped. */
export function cleanLook(raw: unknown): Look {
  const out: Look = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of Object.keys(ITEMS) as LookKey[]) {
    const id = (raw as Record<string, unknown>)[key]
    const item = typeof id === 'string' ? findItem(key, id) : undefined
    if (item) out[key] = item.id
  }
  return out
}
