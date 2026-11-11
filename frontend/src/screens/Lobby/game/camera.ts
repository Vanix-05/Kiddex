/**
 * The camera: follows the Student smoothly, clamped to the island. Close shows
 * about half the room; Far shows all of it.
 */
import type { Container } from 'pixi.js'
import type { Projection } from './projection'
import { RD, RW } from './room'

export type Zoom = 'close' | 'far'

export class Camera {
  /** What the camera looks at, in world px. */
  x = 0
  y = 0
  scale = 1
  mode: Zoom = 'close'
  private width = 1
  private height = 1
  private bounds = { x0: 0, y0: 0, x1: 0, y1: 0 }
  private proj: Projection
  private world: Container

  constructor(world: Container, proj: Projection) {
    this.world = world
    this.proj = proj
    this.setProjection(proj)
  }

  setProjection(proj: Projection) {
    this.proj = proj
    // The island's corners, plus room above for the palms.
    const corners = [proj.P(-6, 21), proj.P(28, -7), proj.P(-6, -6), proj.P(28, 21)]
    const xs = corners.map((p) => p[0])
    const ys = corners.map((p) => p[1])
    this.bounds = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys) - 160, y1: Math.max(...ys) }
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
  }

  /** The scale that fits each view on this screen. */
  private targetScale(): number {
    const { width: W, height: H } = this
    const diag = this.proj.diag
    if (this.mode === 'far') return diag ? Math.min(W / 2050, H / 1240) : Math.min(W / 1720, H / 1020)
    const z = diag ? Math.min(W / 1280, H / 800) : Math.min(W / 1300, H / 810)
    // Phones in landscape: a little closer, so the kid isn't tiny.
    return H < 520 ? z * 1.2 : z
  }

  /** `snap`: jump there (first frame, angle change, reduced motion). */
  update(dt: number, followX: number, followY: number, snap: boolean) {
    const { proj, bounds } = this
    const target = this.targetScale()
    this.scale = snap ? target : this.scale + (target - this.scale) * Math.min(1, dt * 5)

    let [tx, ty] = this.mode === 'far' ? proj.P(RW / 2, RD / 2, 50) : proj.P(followX, followY, 40)
    const halfW = this.width / 2 / this.scale
    const halfH = this.height / 2 / this.scale
    // When the view is wider than the island, min/max would cross: centre instead.
    tx = bounds.x1 - bounds.x0 > halfW * 2 ? Math.max(bounds.x0 + halfW, Math.min(bounds.x1 - halfW, tx)) : (bounds.x0 + bounds.x1) / 2
    ty = bounds.y1 - bounds.y0 > halfH * 2 ? Math.max(bounds.y0 + halfH, Math.min(bounds.y1 - halfH, ty)) : (bounds.y0 + bounds.y1) / 2

    const k = snap ? 1 : Math.min(1, dt * 4.5)
    this.x += (tx - this.x) * k
    this.y += (ty - this.y) * k
    this.world.scale.set(this.scale)
    this.world.position.set(this.width / 2 - this.x * this.scale, this.height / 2 - this.y * this.scale)
  }

  /** World px -> screen px. */
  toScreen(X: number, Y: number): [number, number] {
    return [X * this.scale + this.world.x, Y * this.scale + this.world.y]
  }

  /** Screen px -> the floor tile under it. */
  toFloor(sx: number, sy: number) {
    return this.proj.toFloor((sx - this.world.x) / this.scale, (sy - this.world.y) / this.scale)
  }
}
