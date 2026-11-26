import type { RigPart, RigParts, TracedPath } from '../TracedRig'
import { buildRecolor, recolorFill, type ColorKeys, type ColorTargets } from '../rig/recolor'
import { wardrobeColorKeys as K } from './colorKeys'
import { findBottom, findHair, findShoes, findTop, type Kid, type KidLook, type PieceFile } from './items'

/** The layers a kid is drawn from. */
export type Layer = 'hairBack' | 'base' | 'face' | 'hairFront' | 'bottom' | 'top' | 'shoes'

/** Each rig part's layers, back to front. */
export const PART_LAYERS: Record<RigPart, readonly Layer[]> = {
  head: ['hairBack', 'base', 'face', 'hairFront'],
  body: ['base', 'bottom', 'top'],
  belly: [],
  bodyFront: ['top'],
  armLeft: ['base', 'top'],
  armRight: ['base', 'top'],
  legLeft: ['base', 'bottom', 'shoes'],
  legRight: ['base', 'bottom', 'shoes'],
}

/** One layer: its piece, and the recolor it gets while merging. */
interface LayerSpec {
  file: PieceFile
  keys: ColorKeys
  targets: ColorTargets
}

/** Which piece (and colors) each layer is for this look. Missing = nothing in that layer (e.g. Bald, Shorts). */
export function kidLayers(kid: Kid, look: KidLook): Partial<Record<Layer, LayerSpec>> {
  const hair = findHair(look.hair)
  const cloth = (file: PieceFile | undefined, color: string): LayerSpec | undefined =>
    file ? { file, keys: { cloth: K.cloth }, targets: { cloth: color } } : undefined
  // Hair, and the bits of skin some hair pieces have between their strands.
  const hairLayer = (file: PieceFile | undefined): LayerSpec | undefined =>
    file ? { file, keys: { hair: K.hair, skin: K.skin }, targets: { hair: look.hairColor, skin: look.skin } } : undefined
  // Shorts are the bald body's own: they take the bottom color.
  const shorts = !findBottom(look.bottom)?.file
  return {
    hairBack: hairLayer(hair?.back),
    base: {
      file: 'base',
      keys: shorts ? { skin: K.skin, shorts: K.shorts } : { skin: K.skin },
      targets: shorts ? { skin: look.skin, shorts: look.bottomColor } : { skin: look.skin },
    },
    face: { file: `face-${kid}`, keys: { skin: K.skin }, targets: { skin: look.skin } },
    hairFront: hairLayer(hair?.front),
    bottom: cloth(findBottom(look.bottom)?.file, look.bottomColor),
    top: cloth(findTop(look.top)?.file, look.topColor),
    shoes: cloth(findShoes(look.shoes)?.file, look.shoesColor),
  }
}

/** The face's eyes: the chosen eye color (the rings stay as drawn). */
function recolorEyes(paths: readonly TracedPath[], eyeColor: string | undefined): readonly TracedPath[] {
  if (!eyeColor) return paths
  const keys = { eyes: K.eyes }
  return paths.map((p) => (p[2] === 'eyes' ? [p[0], recolorFill(p[1], 'head', keys, { eyes: eyeColor }) ?? p[1], p[2]] : p))
}

/**
 * Merges a look's pieces into one RigParts, back to front (see PART_LAYERS),
 * recoloring each layer as it goes, so TracedRig gets ready-colored shapes.
 * `piece` returns a downloaded piece's parts. Throws if one isn't loaded yet.
 */
export function buildKidParts(kid: Kid, look: KidLook, piece: (file: PieceFile) => Partial<RigParts> | undefined): RigParts {
  const layers = kidLayers(kid, look)
  const colored = new Map<Layer, Partial<RigParts>>()
  for (const [layer, spec] of Object.entries(layers) as [Layer, LayerSpec | undefined][]) {
    if (!spec) continue
    const parts = piece(spec.file)
    if (!parts) throw new Error(`wardrobe piece "${spec.file}" is not loaded`)
    const recolor = buildRecolor(parts as RigParts, spec.keys, spec.targets)
    const out: Partial<RigParts> = {}
    for (const [part, paths] of Object.entries(parts) as [RigPart, readonly TracedPath[]][]) {
      const map = recolor[part]
      let next: readonly TracedPath[] = map ? paths.map((p) => (map.has(p[1]) ? [p[0], map.get(p[1])!, p[2]] : p)) : paths
      if (layer === 'face') next = recolorEyes(next, look.eyeColor)
      out[part] = next
    }
    colored.set(layer, out)
  }
  const result = {} as RigParts
  for (const [part, order] of Object.entries(PART_LAYERS) as [RigPart, readonly Layer[]][]) {
    result[part] = order.flatMap((layer) => colored.get(layer)?.[part] ?? [])
  }
  return result
}

const cache = new Map<string, RigParts>()
const CACHE_SIZE = 24

/** buildKidParts, memoized by kid + look (the pieces never change once loaded). */
export function kidParts(kid: Kid, look: KidLook, piece: (file: PieceFile) => Partial<RigParts> | undefined): RigParts {
  const key = kid + JSON.stringify(look, Object.keys(look).sort())
  let parts = cache.get(key)
  if (!parts) {
    parts = buildKidParts(kid, look, piece)
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!)
    cache.set(key, parts)
  }
  return parts
}
