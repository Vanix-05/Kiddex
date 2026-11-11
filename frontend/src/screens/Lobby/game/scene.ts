/**
 * What the drawing modules share: the layers, the depth-sorted item list, a
 * seeded random (so the island looks the same every visit) and the box and
 * cylinder helpers.
 */
import { Container, Graphics } from 'pixi.js'
import type { DepthItem } from './depth'
import type { Projection } from './projection'

/** Dark brown outline on everything in the room. */
export const OUTLINE = 0x7a4a2c

/** Back to front. `back` holds standing things behind the back walls. */
export const LAYER_NAMES = ['sea', 'far', 'ground', 'back', 'floor', 'walls', 'objects', 'fx', 'near'] as const
export type LayerName = (typeof LAYER_NAMES)[number]
export type Layers = Record<LayerName, Container>

export function makeLayers(world: Container): Layers {
  const layers = {} as Layers
  for (const name of LAYER_NAMES) {
    layers[name] = new Container()
    world.addChild(layers[name])
  }
  layers.objects.sortableChildren = true
  layers.back.sortableChildren = true
  return layers
}

export interface Scene {
  proj: Projection
  layers: Layers
  /** Every depth-sorted thing. */
  items: DepthItem[]
  /** Adds a standing thing with its floor footprint (tiles). */
  add: (view: Container, x0: number, y0: number, x1?: number, y1?: number) => DepthItem
  /** Seeded random, 0..1. */
  rnd: () => number
}

export function makeScene(proj: Projection, layers: Layers): Scene {
  let seed = 7
  const items: DepthItem[] = []
  return {
    proj,
    layers,
    items,
    add(view, x0, y0, x1 = x0, y1 = y0) {
      const item: DepthItem = { view, x0, y0, x1, y1 }
      items.push(item)
      // Behind the back walls: on the layer under them.
      const behind = x1 < -0.3 || y1 < -0.3
      ;(behind ? layers.back : layers.objects).addChild(view)
      return item
    },
    rnd: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  }
}

/** Lighter (f > 0) or darker (f < 0) version of a color. */
export function shade(hex: number, f: number): number {
  let r = (hex >> 16) & 255
  let g = (hex >> 8) & 255
  let b = hex & 255
  if (f >= 0) {
    r += (255 - r) * f
    g += (255 - g) * f
    b += (255 - b) * f
  } else {
    r *= 1 + f
    g *= 1 + f
    b *= 1 + f
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}

/** Corner points as one flat list, for Graphics.poly. */
export const flat = (...points: readonly (readonly number[])[]) => points.flat()

interface BoxColors {
  top?: number
  left?: number
  right?: number
  stroke?: number
}

/** A box standing on the floor: x, y, w, d in tiles; z, h in px. */
export function box(
  g: Graphics,
  { P, diag }: Projection,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: number,
  o: BoxColors = {},
) {
  const top = o.top ?? shade(color, 0.14)
  const front = o.left ?? color
  const side = o.right ?? shade(color, -0.16)
  const stroke = { width: o.stroke ?? 2.2, color: OUTLINE, join: 'round' } as const
  g.poly(flat(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)))
    .fill(front)
    .stroke(stroke)
  if (diag) {
    g.poly(flat(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)))
      .fill(side)
      .stroke(stroke)
  }
  g.poly(flat(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)))
    .fill(top)
    .stroke(stroke)
}

/** A round table: centre in tiles, radius in tiles, z and h in px. */
export function cylinder(g: Graphics, { P, diag }: Projection, cx: number, cy: number, z: number, r: number, h: number, color: number) {
  const [X, Y] = P(cx, cy, z)
  const rx = r * (diag ? 48 : 46)
  const ry = r * (diag ? 24 : 29)
  const dark = shade(color, -0.12)
  const stroke = { width: 2.2, color: OUTLINE }
  g.ellipse(X, Y, rx, ry).fill(dark).stroke(stroke)
  g.rect(X - rx + 1.1, Y - h, rx * 2 - 2.2, h).fill(dark)
  g.moveTo(X - rx, Y - h).lineTo(X - rx, Y).moveTo(X + rx, Y - h).lineTo(X + rx, Y).stroke(stroke)
  g.ellipse(X, Y - h, rx, ry).fill(shade(color, 0.12)).stroke(stroke)
}

/** A circle lying on the floor (rugs). Chain .fill() / .stroke() on the result. */
export function floorCircle(g: Graphics, proj: Projection, cx: number, cy: number, r: number): Graphics {
  const [X, Y] = proj.P(cx, cy)
  const [rx, ry] = proj.floorEllipse(r)
  return g.ellipse(X, Y, rx, ry)
}
