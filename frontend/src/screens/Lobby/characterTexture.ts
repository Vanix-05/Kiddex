/**
 * Turns a traced rig into a flat picture for the Lobby.
 *
 * Live SVG rigs are too heavy to walk around the room (2 of them ran at
 * 21-25 fps on the school laptop), so each character is drawn once:
 *
 * 1. <Companion still /> (a buddy) or <KidRig still /> (the Student's kid, whose
 *    pieces are downloaded first) is rendered into a hidden DOM node with the look.
 *    (Not renderToStaticMarkup: the rig sets its pose, blush and happy face
 *    in an effect, which never runs on the server renderer.)
 * 2. The posed <svg> is copied, cropped to the character and serialized.
 * 3. That becomes an image, drawn onto a canvas.
 *
 * The canvas is what Pixi turns into a texture; `url` is the same picture for
 * <img> (the Student card and the Buddy card). Pictures are cached by look.
 */
import { createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Companion } from '../../companions/Companion'
import { companionRegistry, type CompanionId } from '../../companions/registry'
import type { RigLook } from '../../companions/TracedRig'
import { KidRig } from '../../companions/wardrobe/KidRig'
import { kidPivots } from '../../companions/wardrobe/kidPivots'
import type { RigPivots } from '../../companions/TracedRig'
import { loadKidPieces, type KidLook } from '../../companions/wardrobe/items'
import type { Avatar } from '../../setup/avatar'
import type { AccessoryId } from '../../setup/customizeData'
import { kidPictureKey } from './pictureKey'

export type CharacterMood = 'calm' | 'happy'

export interface CharacterPicture {
  canvas: HTMLCanvasElement
  /** The same picture as a PNG data URL. */
  url: string
  /** Where the feet are, 0..1 of the picture (the sprite's anchor). */
  anchorX: number
  anchorY: number
  /** Top of the head to the feet, in picture px. Hats and ears reach above it. */
  bodyPx: number
  /**
   * The kid only: the same picture cut into layers, so the Lobby can move the
   * legs and arms on a walk. Drawn back to front: legs, core, arms, front.
   */
  limbs?: Limbs
}

/** One layer, trimmed to what is drawn in it. Places are in picture px. */
export interface LimbLayer {
  canvas: HTMLCanvasElement
  /** Where the layer's top-left corner is in the whole picture. */
  x: number
  y: number
  /** The joint it turns around (hip or shoulder); for core and front, unused. */
  pivotX: number
  pivotY: number
}

export interface Limbs {
  legLeft: LimbLayer
  legRight: LimbLayer
  /** Body and extras below the head. */
  core: LimbLayer
  /** Head, hair and face (slides toward the walking side, so the kid looks that way). */
  head: LimbLayer
  armLeft: LimbLayer
  armRight: LimbLayer
  /** The torso drawn over the arms (some tops), or null. */
  front: LimbLayer | null
}

/** Rigs are drawn on a 5000 x 5000 board. */
const BOARD = 5000
const PAD = 70
/** Head-to-feet height of the picture, in px (the whole picture is a bit taller). */
const BODY_PX = 300
const MAX_CACHED = 16

const cache = new Map<string, Promise<CharacterPicture>>()

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The picture for a key, drawn once. A failed one is not kept, so the next visit tries again. */
function cached(key: string, draw: () => Promise<CharacterPicture>): Promise<CharacterPicture> {
  let picture = cache.get(key)
  if (!picture) {
    picture = draw()
    cache.set(key, picture)
    picture.catch(() => cache.delete(key))
    if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!)
  }
  return picture
}

/** A picture of a companion (the buddies) in a look. Cached, so asking again is free. */
export function characterPicture(id: CompanionId, look: RigLook = {}, mood: CharacterMood = 'calm'): Promise<CharacterPicture> {
  const { colors, extras, buddyColor } = look
  const key = JSON.stringify([id, colors?.skin, colors?.hair, colors?.shirt, extras, buddyColor, mood])
  return cached(key, () => render(id, createElement(Companion, { id, still: true, emotion: mood, colors, extras, buddyColor })))
}

/**
 * A picture of the Student's kid (or a classmate's) in their wardrobe look. The
 * pieces are downloaded first, so it is never a half-loaded kid. Both kids share
 * one body, so the girl's anchors fit both. Cached by the whole look.
 */
export function kidCharacterPicture(kid: Avatar, look: KidLook, extras: AccessoryId[], mood: CharacterMood = 'calm'): Promise<CharacterPicture> {
  return cached(kidPictureKey(kid, look, extras, mood), async () => {
    await loadKidPieces(kid, look)
    return render('girl', createElement(KidRig, { kid, look, still: true, emotion: mood, extras }), kidPivots)
  })
}

/** Draws a rig element still, crops it to the character and makes it a picture. `id`: whose anchors (feet, head top). */
async function render(id: CompanionId, element: ReactElement, split?: RigPivots): Promise<CharacterPicture> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:500px;height:500px;visibility:hidden;pointer-events:none'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    root.render(element)
    // The rig writes its pose in an effect: wait for it.
    let svg: SVGSVGElement | null = null
    for (let i = 0; i < 100; i++) {
      await wait(i ? 16 : 0)
      svg = host.querySelector('svg')
      if (svg?.querySelector('[data-rig="root"]')?.hasAttribute('transform')) break
    }
    if (!svg) throw new Error(`No rig for ${id}`)

    // Work on a copy: React owns the original.
    const copy = svg.cloneNode(true) as SVGSVGElement
    // Hidden face parts (other emotions' mouths, the sleepy z's) are dropped.
    for (const el of copy.querySelectorAll('[opacity]')) {
      if (Number(el.getAttribute('opacity')) < 0.01) el.remove()
    }
    copy.removeAttribute('class')
    host.appendChild(copy)
    const box = copy.getBBox()
    copy.remove()

    const x = Math.max(0, box.x - PAD)
    const y = Math.max(0, box.y - PAD)
    const w = Math.min(BOARD, box.x + box.width + PAD) - x
    const h = Math.min(BOARD, box.y + box.height + PAD) - y
    if (!(w > 0 && h > 0)) throw new Error(`Empty rig for ${id}`)

    const { anchors } = companionRegistry[id]
    const feetX = (anchors.feet.x / 100) * BOARD
    const feetY = (anchors.feet.y / 100) * BOARD
    const bodyUnits = feetY - (anchors.headTop.y / 100) * BOARD
    const scale = BODY_PX / bodyUnits
    const width = Math.ceil(w * scale)
    const height = Math.ceil(h * scale)

    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copy.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
    copy.setAttribute('width', String(width))
    copy.setAttribute('height', String(height))
    const image = await loadSvg(new XMLSerializer().serializeToString(copy))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D canvas')
    ctx.drawImage(image, 0, 0, width, height)

    const limbs = split ? await cutLimbs(copy, split, x, y, scale, width, height) : undefined

    return {
      canvas,
      limbs,
      url: canvas.toDataURL('image/png'),
      anchorX: (feetX - x) / w,
      anchorY: (feetY - y) / h,
      bodyPx: BODY_PX,
    }
  } finally {
    root.unmount()
    host.remove()
  }
}

async function loadSvg(markup: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

type LayerName = 'legLeft' | 'legRight' | 'head' | 'armLeft' | 'armRight' | 'front'

/** The groups each layer is made of, in a copy of the posed svg. */
function layerGroups(svg: SVGSVGElement): Record<LayerName, Element | null> {
  const squash = svg.querySelector('[data-rig="squash"]')
  const direct = (name: string) => squash?.querySelectorAll(`:scope > [data-rig="${name}"]`) ?? []
  return {
    legLeft: direct('legLeft')[0] ?? null,
    legRight: direct('legRight')[0] ?? null,
    head: direct('head')[0] ?? null,
    armLeft: direct('armLeft')[0] ?? null,
    armRight: direct('armRight')[0] ?? null,
    // The second body group, over the arms (KidRig's bodyFront).
    front: direct('body')[1] ?? null,
  }
}

/**
 * Cuts the posed kid into layers: each leg, each arm, the torso over the arms,
 * and the rest (core). Every layer is drawn at the picture's size, then trimmed.
 */
async function cutLimbs(
  svg: SVGSVGElement,
  pivots: RigPivots,
  x: number,
  y: number,
  scale: number,
  width: number,
  height: number,
): Promise<Limbs> {
  const draw = async (keep: LayerName | 'core', pivot: readonly [number, number] | null): Promise<LimbLayer | null> => {
    const copy = svg.cloneNode(true) as SVGSVGElement
    const groups = layerGroups(copy)
    if (keep === 'core') {
      for (const g of Object.values(groups)) g?.remove()
    } else {
      const target = groups[keep]
      if (!target) return null
      copy.setAttribute('style', 'visibility:hidden')
      target.setAttribute('style', 'visibility:visible')
    }
    const image = await loadSvg(new XMLSerializer().serializeToString(copy))
    const full = document.createElement('canvas')
    full.width = width
    full.height = height
    const ctx = full.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('No 2D canvas')
    ctx.drawImage(image, 0, 0, width, height)
    // The core and head stay whole (the happy face swaps the head in place).
    if (keep === 'core' || keep === 'head') return { canvas: full, x: 0, y: 0, pivotX: 0, pivotY: 0 }
    // Trim to the drawn pixels (most of each layer is empty).
    const data = ctx.getImageData(0, 0, width, height).data
    let x0 = width
    let y0 = height
    let x1 = -1
    let y1 = -1
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (data[(j * width + i) * 4 + 3] > 0) {
          if (i < x0) x0 = i
          if (i > x1) x1 = i
          if (j < y0) y0 = j
          if (j > y1) y1 = j
        }
      }
    }
    if (x1 < 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = x1 - x0 + 1
    canvas.height = y1 - y0 + 1
    canvas.getContext('2d')?.drawImage(full, -x0, -y0)
    const [px, py] = pivot ?? [0, 0]
    return { canvas, x: x0, y: y0, pivotX: (px - x) * scale, pivotY: (py - y) * scale }
  }
  const [legLeft, legRight, core, head, armLeft, armRight, front] = await Promise.all([
    draw('legLeft', pivots.hipLeft),
    draw('legRight', pivots.hipRight),
    draw('core', null),
    draw('head', pivots.neck),
    draw('armLeft', pivots.shoulderLeft),
    draw('armRight', pivots.shoulderRight),
    draw('front', null),
  ])
  if (!legLeft || !legRight || !core || !head || !armLeft || !armRight) throw new Error('Kid layers missing')
  return { legLeft, legRight, core, head, armLeft, armRight, front }
}
