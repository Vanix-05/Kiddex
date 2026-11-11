/**
 * Turns a traced rig into a flat picture for the Lobby.
 *
 * Live SVG rigs are too heavy to walk around the room (2 of them ran at
 * 21-25 fps on the school laptop), so each character is drawn once:
 *
 * 1. <Companion still /> is rendered into a hidden DOM node with the look.
 *    (Not renderToStaticMarkup: the rig sets its pose, blush and happy face
 *    in an effect, which never runs on the server renderer.)
 * 2. The posed <svg> is copied, cropped to the character and serialized.
 * 3. That becomes an image, drawn onto a canvas.
 *
 * The canvas is what Pixi turns into a texture; `url` is the same picture for
 * <img> (the Student card and the Buddy card). Pictures are cached by look.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Companion } from '../../companions/Companion'
import { companionRegistry, type CompanionId } from '../../companions/registry'
import type { RigLook } from '../../companions/TracedRig'

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
}

/** Rigs are drawn on a 5000 x 5000 board. */
const BOARD = 5000
const PAD = 70
/** Head-to-feet height of the picture, in px (the whole picture is a bit taller). */
const BODY_PX = 300
const MAX_CACHED = 16

const cache = new Map<string, Promise<CharacterPicture>>()

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A picture of a companion in a look. Cached, so asking again is free. */
export function characterPicture(id: CompanionId, look: RigLook = {}, mood: CharacterMood = 'calm'): Promise<CharacterPicture> {
  const { colors, extras, buddyColor } = look
  const key = JSON.stringify([id, colors?.skin, colors?.hair, colors?.shirt, extras, buddyColor, mood])
  let picture = cache.get(key)
  if (!picture) {
    picture = render(id, { colors, extras, buddyColor }, mood)
    cache.set(key, picture)
    // A failed picture is not kept, so the next visit tries again.
    picture.catch(() => cache.delete(key))
    if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!)
  }
  return picture
}

async function render(id: CompanionId, look: RigLook, mood: CharacterMood): Promise<CharacterPicture> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:500px;height:500px;visibility:hidden;pointer-events:none'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    root.render(createElement(Companion, { id, still: true, emotion: mood, ...look }))
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

    return {
      canvas,
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
