import { companionRegistry, type CompanionId } from '../../../companions/registry'
import type { Look } from '../../../setup/customizeData'

/** Small timing helpers for the cutscene's clock (t in seconds). */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** 0..1 progress of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
/** Ease in and out. */
export const ease = (e: number) => (e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2)
export const easeOut = (e: number) => 1 - (1 - e) ** 3
/** Ease out with a little overshoot (pop-ins). */
export const backOut = (e: number) => 1 + 2.4 * (e - 1) ** 3 + 1.4 * (e - 1) ** 2
export const lerp = (a: number, b: number, e: number) => a + (b - a) * e
/** A shot's opacity: 0 -> 1 -> 0, with a short crossfade at each cut. */
export const shotAlpha = (t: number, a: number, b: number, fade = 0.25) => clamp(Math.min((t - a) / fade + 1, (b - t) / fade + 1))

/** How far a companion's feet are from the top of its square image (0..1). */
export const feetAt = (id: CompanionId) => companionRegistry[id].anchors.feet.y / 100

export interface Point {
  x: number
  y: number
}

/**
 * Where the boat is: its pivot (hull middle) in the parent's coordinates, its
 * tilt and its scale. The boat's own drawing is the 260 x 210 box from Scene.tsx.
 */
export interface BoatPose extends Point {
  rot: number
  scale: number
}

/** The boat's pivot, in its 260 x 210 box: the middle of the hull. */
export const BOAT_PIVOT: Point = { x: 130, y: 170 }

/** CSS transform for a boat layer (transform-origin 0 0, box at left 0 top 0). */
export const boatTransform = ({ x, y, rot, scale }: BoatPose) =>
  `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale}) translate(${-BOAT_PIVOT.x}px, ${-BOAT_PIVOT.y}px)`

/** A point in the boat's box -> the parent's coordinates. */
export function boatToWorld({ x, y, rot, scale }: BoatPose, local: Point): Point {
  const a = (rot * Math.PI) / 180
  const dx = (local.x - BOAT_PIVOT.x) * scale
  const dy = (local.y - BOAT_PIVOT.y) * scale
  return { x: x + dx * Math.cos(a) - dy * Math.sin(a), y: y + dx * Math.sin(a) + dy * Math.cos(a) }
}

// ---------- The riders ----------

export type Who = 'you' | 'buddy'

/** Who's riding: the Student's character, their buddy and their Customize look. */
export interface Cast {
  avatar: CompanionId
  buddy: CompanionId
  look: Look
}

/** The riders' seats, in the boat's 260 x 210 box: each one's square image (top-left + size). */
export const SEATS: Record<Who, { left: number; top: number; size: number }> = {
  you: { left: 34, top: 62, size: 112 },
  buddy: { left: 128, top: 74, size: 104 },
}

/** Where a rider's feet go in the boat's box (hidden behind the hull). */
export const seatFeet = (who: Who, id: CompanionId): Point => {
  const s = SEATS[who]
  return { x: s.left + s.size / 2, y: s.top + s.size * feetAt(id) }
}

/** The per-frame water motion of one boat (foam slide, reflection wobble). */
export function moveWater(t: number, foam?: SVGGElement | null, reflect?: SVGGElement | null) {
  if (foam) foam.style.transform = `translateX(${(Math.sin(t * 4.2) * 8 - 4).toFixed(2)}px)`
  if (reflect) {
    const w = Math.sin(t * 3.6)
    reflect.style.transform = `skewX(${(w * 4).toFixed(2)}deg) scaleY(${(0.96 + w * 0.04).toFixed(3)})`
  }
}
