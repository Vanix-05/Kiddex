import type { RigPart, RigParts } from '../TracedRig'

/** The avatar's recolorable groups. */
export type ColorGroup = 'skin' | 'hair' | 'shirt'

/** New colors for the groups (hex). Undefined = keep the art's color. */
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

export type ColorKeys = Partial<Record<ColorGroup, ColorKey>>

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
 * moves (new = target + (fill - key)). The target's shade is
 * target x (key shade / key main), per channel.
 */
function recolorFill(fill: string, part: RigPart, keys: ColorKeys, targets: RigColors): string | null {
  const c = toRgb(fill)
  let best: { group: ColorGroup; shade: boolean; d: number } | null = null
  for (const [group, key] of Object.entries(keys) as [ColorGroup, ColorKey][]) {
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
  const key = keys[best.group]!
  const main = toRgb(key.main)
  const t = toRgb(target)
  const from = best.shade ? toRgb(key.shade) : main
  const to = best.shade ? (t.map((v, i) => (v * toRgb(key.shade)[i]) / Math.max(1, main[i])) as RGB) : t
  return toHex(c.map((v, i) => to[i] + (v - from[i])) as RGB)
}

/** Builds the old fill -> new fill maps for every part (once per look, not per frame). */
export function buildRecolor(parts: RigParts, keys: ColorKeys, targets: RigColors): RecolorMap {
  const out: RecolorMap = {}
  if (!Object.values(targets).some(Boolean)) return out
  for (const [part, shapes] of Object.entries(parts) as [RigPart, RigParts[RigPart]][]) {
    const map = new Map<string, string>()
    for (const [, fill] of shapes) {
      if (map.has(fill)) continue
      const next = recolorFill(fill, part, keys, targets)
      if (next) map.set(fill, next)
    }
    if (map.size) out[part] = map
  }
  return out
}

/** One color (e.g. the blink eyelid) recolored as if it were a head fill. */
export const recolorOne = (color: string, keys: ColorKeys, targets: RigColors) =>
  recolorFill(color, 'head', keys, targets) ?? color

/**
 * A color hue-rotated like SVG feColorMatrix type="hueRotate" in sRGB (and
 * CSS hue-rotate()), so the eyelid matches the filtered buddy.
 */
export function hueRotate(color: string, degrees: number): string {
  if (!degrees) return color
  const a = (degrees * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const m = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ]
  const [r, g, b] = toRgb(color)
  return toHex([m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b])
}
