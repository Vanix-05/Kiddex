import type { RigPart, RigParts } from '../TracedRig'

/** The avatar's recolorable groups. */
export type ColorGroup = 'skin' | 'hair' | 'shirt'

/** New avatar colors for the groups (hex). Undefined = keep the art's color. */
export type RigColors = Partial<Record<ColorGroup, string>>

/**
 * One group's key colors, picked from `node scripts/list-fills.mjs <id>`.
 * Every fill near a key (within `max`) belongs to the group.
 */
export interface ColorKey {
  main: string
  shade: string
  /** Max RGB distance to a key (default 28). Lower it where other colors are close. */
  max?: number
  /** Only these parts (default: all). E.g. hair only on the head. */
  parts?: RigPart[]
  /** Fills that are never part of the group even if close (e.g. white socks). */
  keep?: string[]
}

/**
 * Group name -> its key colors. The avatars use skin, hair and shirt; each
 * buddy names its own body colors (fur, belly, dark accents...).
 */
export type ColorKeys = Record<string, ColorKey>

/** A group's new color: one color (its shade follows the key's), or both main and shade. */
export type ColorTarget = string | { main: string; shade: string }

/** Group name -> new color. A group that isn't here keeps the art's color. */
export type ColorTargets = Partial<Record<string, ColorTarget>>

/** The buddy colors that recolor (customizeData's buddyColor ids; "original" is the art as drawn). */
export const BUDDY_COLORS = ['pink', 'blue', 'mint', 'purple', 'gold'] as const
export type BuddyColorId = (typeof BUDDY_COLORS)[number]
export const isBuddyColorId = (id: unknown): id is BuddyColorId => BUDDY_COLORS.includes(id as BuddyColorId)

/** A buddy's tuned palette for each color: group name -> new color. */
export type BuddyPalettes = Record<BuddyColorId, ColorTargets>

/** Traced sub-groups that are never recolored: they keep the art's eyes, nose and mouth. */
export const KEEP_GROUPS: ReadonlySet<string> = new Set(['eyes', 'nose', 'mouth'])

/** part -> (old fill -> new fill). Only changed fills are in the maps. */
export type RecolorMap = Partial<Record<RigPart, Map<string, string>>>

const DEFAULT_MAX = 28

type RGB = [number, number, number]
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) =>
  '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * The new color for one fill, or null if it isn't near any key. Each fill goes
 * to its nearest key; the shading is kept by moving it as much as its key
 * moves (new = target + (fill - key)). With a one-color target, the target's
 * shade is target x (key shade / key main), per channel.
 */
function recolorFill(fill: string, part: RigPart, keys: ColorKeys, targets: ColorTargets): string | null {
  const c = toRgb(fill)
  let best: { group: string; shade: boolean; d: number } | null = null
  for (const [group, key] of Object.entries(keys)) {
    if (key.parts && !key.parts.includes(part)) continue
    if (key.keep?.some((k) => k.toUpperCase() === fill.toUpperCase())) continue
    for (const shade of [false, true]) {
      const d = dist(c, toRgb(shade ? key.shade : key.main))
      if (d <= (key.max ?? DEFAULT_MAX) && (!best || d < best.d)) best = { group, shade, d }
    }
  }
  if (!best) return null
  const target = targets[best.group]
  if (!target) return null // nearest group isn't being changed
  const key = keys[best.group]
  const main = toRgb(key.main)
  const from = best.shade ? toRgb(key.shade) : main
  let to: RGB
  if (typeof target === 'string') {
    const t = toRgb(target)
    to = best.shade ? (t.map((v, i) => (v * toRgb(key.shade)[i]) / Math.max(1, main[i])) as RGB) : t
  } else {
    to = toRgb(best.shade ? target.shade : target.main)
  }
  return toHex(c.map((v, i) => to[i] + (v - from[i])) as RGB)
}

/** Builds the old fill -> new fill maps for every part (once per look, not per frame). */
export function buildRecolor(parts: RigParts, keys: ColorKeys, targets: ColorTargets): RecolorMap {
  const out: RecolorMap = {}
  if (!Object.values(targets).some(Boolean)) return out
  for (const [part, shapes] of Object.entries(parts) as [RigPart, RigParts[RigPart]][]) {
    const map = new Map<string, string>()
    for (const [, fill, group] of shapes) {
      if (map.has(fill) || KEEP_GROUPS.has(group)) continue
      const next = recolorFill(fill, part, keys, targets)
      if (next) map.set(fill, next)
    }
    if (map.size) out[part] = map
  }
  return out
}

/** One color (e.g. the blink eyelid) recolored as if it were a head fill. */
export const recolorOne = (color: string, keys: ColorKeys, targets: ColorTargets) =>
  recolorFill(color, 'head', keys, targets) ?? color

/** True for a dark color (relative luminance under `below`), e.g. the two darkest skins. */
export function isDark(color: string, below = 0.25): boolean {
  const lin = toRgb(color).map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] < below
}
