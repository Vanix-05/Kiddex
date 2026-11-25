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
}

/** The Student's picks. Each value is an item id; empty = the art as drawn. */
export interface Look {
  skin?: string
  hair?: string
  shirt?: string
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

const hair: CustomizeItem[] = [
  { id: 'brown', label: 'Brown', swatch: '#9e766e' },
  { id: 'black', label: 'Black', swatch: '#3d3034' },
  { id: 'dark', label: 'Dark', swatch: '#6a4636' },
  { id: 'ginger', label: 'Ginger', swatch: '#d7834e' },
  { id: 'blond', label: 'Blond', swatch: '#e3c07a' },
  { id: 'purple', label: 'Purple', swatch: '#9c86cf' },
]

const shirt: CustomizeItem[] = [
  { id: 'yellow', label: 'Yellow', swatch: '#ffdba3' },
  { id: 'blue', label: 'Blue', swatch: '#a9d2f5' },
  { id: 'mint', label: 'Mint', swatch: '#b9ead2' },
  { id: 'pink', label: 'Pink', swatch: '#ffc4cf' },
  { id: 'purple', label: 'Purple', swatch: '#d6c5f2' },
  { id: 'red', label: 'Red', swatch: '#f4877c' },
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

export const ITEMS: Record<LookKey, CustomizeItem[]> = { skin, hair, shirt, youExtra, buddyColor, buddyExtra }

// ---------- Tabs ----------

export type Side = 'you' | 'buddy'

export interface CustomizeTab {
  key: LookKey
  icon: string
  label: string
}

/** Folder tabs above the tray. The first one opens when you switch sides. */
export const TABS: Record<Side, CustomizeTab[]> = {
  you: [
    { key: 'skin', icon: '✋', label: 'Skin' },
    { key: 'hair', icon: '💇', label: 'Hair' },
    { key: 'shirt', icon: '👕', label: 'Shirt' },
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

/** Avatar recolor targets for the rig (undefined = the art's own color). */
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
