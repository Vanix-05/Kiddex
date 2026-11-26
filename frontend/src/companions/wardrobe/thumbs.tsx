import { useMemo } from 'react'
import type { RigPart, RigParts, TracedPath } from '../TracedRig'
import { buildRecolor, recolorFill, type ColorKeys, type ColorTargets } from '../rig/recolor'
import { EyeLashes, EyeSparkle } from '../rig/StyleLayers'
import { wardrobeColorKeys as K } from './colorKeys'
import { findBottom, findHair, findShoes, findTop, loadedPiece, type EyeStyle, type Kid, type PieceFile } from './items'
import { usePiecesLoaded } from './usePiecesLoaded'

/**
 * Small still pictures of wardrobe pieces for the Customize Bridge's style tiles:
 * each piece's own traced shapes in the Student's color, cropped to the piece.
 * No PNGs, and no rig: just one small SVG.
 */

// ---- Path bounds ---------------------------------------------------------------

/** [x0, y0, x1, y1] of a traced path (its points and control points: a little generous). */
function pathBox(d: string): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  let x = 0, y = 0, sx = 0, sy = 0
  const add = (px: number, py: number) => {
    if (px < b[0]) b[0] = px
    if (py < b[1]) b[1] = py
    if (px > b[2]) b[2] = px
    if (py > b[3]) b[3] = py
  }
  for (const [, cmd, args] of d.matchAll(/([MmLlCcHhVvZz])([^MmLlCcHhVvZz]*)/g)) {
    const n = (args.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number)
    const rel = cmd === cmd.toLowerCase()
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
        for (let i = 0; i + 1 < n.length; i += 2) {
          x = rel ? x + n[i] : n[i]
          y = rel ? y + n[i + 1] : n[i + 1]
          if (i === 0 && cmd.toUpperCase() === 'M') [sx, sy] = [x, y]
          add(x, y)
        }
        break
      case 'C':
        for (let i = 0; i + 5 < n.length; i += 6) {
          const ox = rel ? x : 0, oy = rel ? y : 0
          add(ox + n[i], oy + n[i + 1])
          add(ox + n[i + 2], oy + n[i + 3])
          x = ox + n[i + 4]
          y = oy + n[i + 5]
          add(x, y)
        }
        break
      case 'H':
        for (const v of n) add((x = rel ? x + v : v), y)
        break
      case 'V':
        for (const v of n) add(x, (y = rel ? y + v : v))
        break
      default:
        x = sx
        y = sy
    }
  }
  return b
}

const boxCache = new WeakMap<readonly TracedPath[], [number, number, number, number]>()
function shapesBox(shapes: readonly TracedPath[]) {
  let b = boxCache.get(shapes)
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity]
    for (const [d] of shapes) {
      const p = pathBox(d)
      b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[2]), Math.max(b[3], p[3])]
    }
    boxCache.set(shapes, b)
  }
  return b
}

// ---- Drawing -------------------------------------------------------------------

/** Rig parts drawn back to front, like TracedRig. */
const ORDER: RigPart[] = ['legLeft', 'legRight', 'body', 'head', 'armLeft', 'armRight', 'bodyFront']

/** One layer's shapes in draw order, recolored. */
function layer(file: PieceFile, keys: ColorKeys, targets: ColorTargets, only?: RigPart[]): TracedPath[] {
  const parts = loadedPiece(file)
  if (!parts) return []
  const recolor = buildRecolor(parts as RigParts, keys, targets)
  return ORDER.filter((p) => !only || only.includes(p)).flatMap((p) => {
    const map = recolor[p]
    return (parts[p] ?? []).map((s): TracedPath => (map?.has(s[1]) ? [s[0], map.get(s[1])!, s[2]] : s))
  })
}

function Picture({ shapes, box, pad = 0.08, className }: { shapes: readonly TracedPath[]; box?: number[]; pad?: number; className?: string }) {
  const [x0, y0, x1, y1] = box ?? shapesBox(shapes)
  const w = x1 - x0, h = y1 - y0, p = Math.max(w, h) * pad
  return (
    <svg className={className} viewBox={`${x0 - p} ${y0 - p} ${w + 2 * p} ${h + 2 * p}`} aria-hidden="true" focusable="false">
      {shapes.map(([d, fill], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  )
}

export type ClothSlot = 'top' | 'bottom' | 'shoes'

/** A top, bottom or pair of shoes in a color. Shorts are the bald body's own (cropped to them). */
export function ClothThumb({ slot, id, color, className }: { slot: ClothSlot; id: string; color: string; className?: string }) {
  const item = slot === 'top' ? findTop(id) : slot === 'bottom' ? findBottom(id) : findShoes(id)
  const file = item?.file ?? 'base'
  const ready = usePiecesLoaded([file])
  const shapes = useMemo(() => {
    if (!ready) return []
    if (item?.file) return layer(file, { cloth: K.cloth }, { cloth: color })
    return layer('base', { shorts: K.shorts }, { shorts: color }, ['body', 'legLeft', 'legRight'])
  }, [ready, file, item, color])
  if (!ready) return <span className={className} />
  // Shorts: the base's shorts, between the waist and the hems.
  return <Picture className={className} shapes={shapes} box={item?.file ? undefined : [2050, 3520, 2950, 4300]} pad={0.04} />
}

/** A kid's head wearing a hairstyle (Bald: the bare head), in the Student's hair and skin colors. */
export function HairThumb({ kid, id, hairColor, skin, className }: { kid: Kid; id: string; hairColor: string; skin?: string; className?: string }) {
  const hair = findHair(id)
  const files = [hair?.back, 'base', `face-${kid}`, hair?.front].filter((f): f is PieceFile => !!f)
  const ready = usePiecesLoaded(files)
  const shapes = useMemo(() => {
    if (!ready) return []
    const skinOnly = { keys: { skin: K.skin }, targets: { skin } }
    const hairLayer = (f?: PieceFile) =>
      f ? layer(f, { hair: K.hair, skin: K.skin }, { hair: hairColor, skin }, ['head']) : []
    return [
      ...hairLayer(hair?.back),
      ...layer('base', skinOnly.keys, skinOnly.targets, ['head']),
      ...layer(`face-${kid}`, skinOnly.keys, skinOnly.targets, ['head']),
      ...hairLayer(hair?.front),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, kid, id, hairColor, skin])
  if (!ready) return <span className={className} />
  return <Picture className={className} shapes={shapes} box={[1150, 250, 3850, 2950]} pad={0} />
}

/** The face's left eye, as drawn (Round) or with Sparkly / Lashes, in an eye color. */
const EYE = { cx: 2000, cy: 1792, rx: 154, ry: 314 }
export function EyeThumb({ kid, style, color, className }: { kid: Kid; style: EyeStyle; color: string; className?: string }) {
  const file = `face-${kid}`
  const ready = usePiecesLoaded([file])
  const shapes = useMemo(() => {
    const parts = ready ? loadedPiece(file) : undefined
    if (!parts?.head) return []
    const keys = { eyes: K.eyes }
    return parts.head
      .filter(([d, , g]) => g === 'eyes' && Number(/^M\s*(-?[\d.]+)/.exec(d)?.[1]) < 2500)
      .map(([d, fill, g]): TracedPath => [d, recolorFill(fill, 'head', keys, { eyes: color }) ?? fill, g])
  }, [ready, file, color])
  if (!ready) return <span className={className} />
  return (
    <svg className={className} viewBox="1640 1300 720 900" aria-hidden="true" focusable="false">
      {shapes.map(([d, fill], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
      {/* The rig's shine, plus the style. */}
      <circle cx={EYE.cx - EYE.rx * 0.3} cy={EYE.cy - EYE.ry * 0.42} r={EYE.rx * 0.34} fill="#fff" />
      {style === 'sparkly' && <EyeSparkle {...EYE} />}
      {style === 'lashes' && <EyeLashes side="left" {...EYE} ink="#7B5062" />}
    </svg>
  )
}
