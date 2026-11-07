/**
 * Customize Bridge items (/customize): what the Student can change on their
 * own character (You) and on their buddy. Edit freely: the tray shows the
 * items in this order. `level` = locked until the Student reaches that level.
 */

/** The Student's class section, shown on Rene Island's sign and the Lobby. FAKE until the backend sends it. */
export const SECTION = 'Grade 4 – Sampaguita'

/** A drawn accessory (see companions/rig/Accessories.tsx). */
export type AccessoryId = 'glasses' | 'starClip' | 'flowerYellow' | 'scarf' | 'bow' | 'flowerPink' | 'cap' | 'crown'

export interface CustomizeItem {
  id: string
  /** Shown under the tile. Skin swatches have none (their aria label says "Skin 1", ...). */
  label: string
  /** Round color swatch on the tile. */
  swatch?: string
  /** Emoji on the tile (extras). */
  icon?: string
  /** Locked until this level. */
  level?: number
  /** Extras: what it draws on the character (null = none). */
  accessory?: AccessoryId | null
  /** Buddy color: hue-rotate angle in degrees (0 = the buddy's own colors). */
  hue?: number
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
  { id: 'purple', label: 'Purple', swatch: '#9c86cf', level: 3 },
]

const shirt: CustomizeItem[] = [
  { id: 'yellow', label: 'Yellow', swatch: '#ffdba3' },
  { id: 'blue', label: 'Blue', swatch: '#a9d2f5' },
  { id: 'mint', label: 'Mint', swatch: '#b9ead2' },
  { id: 'pink', label: 'Pink', swatch: '#ffc4cf' },
  { id: 'purple', label: 'Purple', swatch: '#d6c5f2', level: 3 },
  { id: 'red', label: 'Red', swatch: '#f4877c', level: 5 },
]

const youExtra: CustomizeItem[] = [
  { id: 'none', label: 'None', accessory: null },
  { id: 'glasses', label: 'Glasses', icon: '👓', accessory: 'glasses' },
  { id: 'starClip', label: 'Star clip', icon: '⭐', accessory: 'starClip' },
  { id: 'flower', label: 'Flower', icon: '🌼', accessory: 'flowerYellow' },
  { id: 'cap', label: 'Cap', icon: '🧢', accessory: 'cap', level: 3 },
  { id: 'crown', label: 'Crown', icon: '👑', accessory: 'crown', level: 5 },
]

// ---------- Buddy ----------

// Hue angles tuned on the fox (orange), checked on the other buddies.
const buddyColor: CustomizeItem[] = [
  { id: 'original', label: 'Original', hue: 0 },
  { id: 'pink', label: 'Pink', hue: -40 },
  { id: 'blue', label: 'Blue', hue: 180 },
  { id: 'mint', label: 'Mint', hue: 110 },
  { id: 'purple', label: 'Purple', hue: 245 },
  { id: 'gold', label: 'Gold', hue: 22, level: 5 },
]

const buddyExtra: CustomizeItem[] = [
  { id: 'none', label: 'None', accessory: null },
  { id: 'scarf', label: 'Scarf', icon: '🧣', accessory: 'scarf' },
  { id: 'bow', label: 'Bow', icon: '🎀', accessory: 'bow' },
  { id: 'flower', label: 'Flower', icon: '🌸', accessory: 'flowerPink' },
  { id: 'cap', label: 'Cap', icon: '🧢', accessory: 'cap', level: 3 },
  { id: 'crown', label: 'Crown', icon: '👑', accessory: 'crown', level: 5 },
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

// ---------- XP and levels ----------

// FAKE until rewards are built (backend owns XP)
export const FAKE_XP = 40
/** XP needed to reach each level. */
export const LEVEL_XP: Record<number, number> = { 1: 0, 2: 50, 3: 100, 4: 200, 5: 300 }

export function levelFromXp(xp: number): number {
  let level = 1
  for (const [lv, need] of Object.entries(LEVEL_XP)) if (xp >= need) level = Math.max(level, Number(lv))
  return level
}

export const isLocked = (item: CustomizeItem, xp = FAKE_XP) => (item.level ?? 0) > levelFromXp(xp)

/**
 * The next locked item in a tab, how much XP is still needed, and the progress
 * bar (0..1) from the current level's XP to that item's level. null = nothing locked.
 */
export function nextUnlock(items: CustomizeItem[], xp = FAKE_XP) {
  const locked = items.filter((i) => isLocked(i, xp)).sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0]
  if (!locked) return null
  const need = LEVEL_XP[locked.level ?? 1] ?? 0
  const from = LEVEL_XP[levelFromXp(xp)] ?? 0
  return { item: locked, xpNeeded: Math.max(0, need - xp), progress: need > from ? (xp - from) / (need - from) : 1 }
}

// ---------- Look helpers ----------

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

export const lookHue = (look: Look) => findItem('buddyColor', look.buddyColor)?.hue ?? 0

/** A saved look with only known, unlocked item ids (e.g. from sessionStorage). */
export function cleanLook(raw: unknown): Look {
  const out: Look = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of Object.keys(ITEMS) as LookKey[]) {
    const id = (raw as Record<string, unknown>)[key]
    const item = typeof id === 'string' ? findItem(key, id) : undefined
    if (item && !isLocked(item)) out[key] = item.id
  }
  return out
}
