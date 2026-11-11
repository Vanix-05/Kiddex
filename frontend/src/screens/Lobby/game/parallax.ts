/**
 * Light parallax. Far islands and clouds move slower than the room, and the
 * clouds drift; big leaves close to the camera move faster. All of it stands
 * still when Moving effects is on Less (or the OS asks for reduced motion).
 */
import { Container, Graphics } from 'pixi.js'
import { RD, RW } from './room'
import type { Scene } from './scene'

const FAR_LAG = 0.25
const NEAR_RUSH = 0.3

export interface Parallax {
  /** camX / camY: what the camera looks at, in world px. */
  update: (camX: number, camY: number, dt: number, still: boolean) => void
}

export function drawParallax(scene: Scene): Parallax {
  const { proj, layers, rnd } = scene
  const { P } = proj
  const [centreX, centreY] = P(RW / 2, RD / 2)

  const islands = new Container()
  for (const [x, y, s] of [
    [-12, 3, 0.9],
    [12, 29, 1.0],
    [8, -15, 0.8],
    [34, 10, 0.8],
  ]) {
    const g = drawFarIsland(s)
    g.position.set(...P(x, y))
    islands.addChild(g)
  }

  const clouds = new Container()
  const drift: { g: Graphics; speed: number }[] = []
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.5
    const g = drawCloud(0.8 + rnd() * 0.6)
    g.position.set(centreX + Math.cos(t) * 950, centreY + Math.sin(t) * 560 - 80)
    drift.push({ g, speed: 6 + rnd() * 6 })
    clouds.addChild(g)
  }
  layers.far.addChild(islands, clouds)

  // Big leaves at the island's front edge.
  const leaves = new Container()
  for (const [x, y, flip, s] of [
    [2, 22.5, 1, 0.9],
    [17, 23, -1, 0.85],
    [30, 13, -1, 0.8],
    [-9, 12, 1, 0.8],
  ]) {
    const g = drawLeaves(flip, s)
    const [X, Y] = P(x, y)
    g.position.set(X, Y + 60)
    leaves.addChild(g)
  }
  layers.near.addChild(leaves)

  // A cloud that drifts off one side comes back on the other.
  const WRAP = 1500

  return {
    update(camX, camY, dt, still) {
      const k = still ? 0 : 1
      const dx = (camX - centreX) * k
      const dy = (camY - centreY) * k
      layers.far.position.set(dx * FAR_LAG, dy * FAR_LAG)
      leaves.position.set(-dx * NEAR_RUSH, -dy * NEAR_RUSH)
      if (still) return
      for (const c of drift) {
        c.g.x += c.speed * dt
        if (c.g.x > centreX + WRAP) c.g.x -= WRAP * 2
      }
    },
  }
}

function drawFarIsland(s: number) {
  const g = new Graphics()
  g.ellipse(0, 6, 120 * s, 30 * s).fill({ color: 0xa6e0ef, alpha: 0.8 })
  g.ellipse(0, 0, 100 * s, 24 * s).fill(0xf3dca6)
  g.moveTo(-80 * s, 0)
    .quadraticCurveTo(-30 * s, -70 * s, 10 * s, -40 * s)
    .quadraticCurveTo(50 * s, -80 * s, 85 * s, 0)
    .fill(0x9fd38a)
  g.moveTo(30 * s, -50 * s)
    .lineTo(36 * s, -110 * s)
    .stroke({ width: 5 * s, color: 0xb98a5a })
  for (const a of [-2.4, -1.2, 0, 1.2, 2.4]) {
    g.ellipse(36 * s + Math.sin(a) * 22 * s, -110 * s + Math.cos(a) * 6 * s, 24 * s, 7 * s).fill(0x7fc46a)
  }
  g.alpha = 0.82
  return g
}

function drawCloud(s: number) {
  const g = new Graphics()
  for (const [a, b, r] of [
    [-40, 0, 34],
    [0, -14, 44],
    [42, 0, 32],
    [10, 8, 36],
  ]) {
    g.circle(a * s, b * s, r * s).fill({ color: 0xffffff, alpha: 0.9 })
  }
  return g
}

function drawLeaves(flip: number, s: number) {
  const g = new Graphics()
  for (const [a, len, color] of [
    [-1.0, 150, 0x4f9a46],
    [-0.4, 190, 0x5fae52],
    [0.25, 170, 0x4f9a46],
    [0.85, 140, 0x67b858],
  ]) {
    const dx = Math.sin(a) * len * s * flip
    const dy = -Math.cos(a) * len * s
    g.moveTo(0, 0)
      .quadraticCurveTo(dx * 0.5 - 30 * s, dy * 0.5, dx, dy)
      .quadraticCurveTo(dx * 0.5 + 30 * s, dy * 0.5 + 10 * s, 0, 0)
      .fill(color)
      .stroke({ width: 3, color: 0x2f6a2a })
  }
  g.alpha = 0.95
  return g
}
