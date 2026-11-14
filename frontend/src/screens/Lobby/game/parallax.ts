/**
 * Light parallax. Far islands and clouds move slower than the room, and the
 * clouds drift. All of it stands
 * still when Moving effects is on Less (or the OS asks for reduced motion).
 */
import { Container, Graphics } from 'pixi.js'
import { RD, RW } from './room'
import type { Scene } from './scene'

const FAR_LAG = 0.25

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
    [-13, 3, 0.9],
    [12, 30, 1.0],
    [-16, -9, 0.8],
    [-6, 27, 0.75],
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

  // A cloud that drifts off one side comes back on the other.
  const WRAP = 1500

  return {
    update(camX, camY, dt, still) {
      const k = still ? 0 : 1
      const dx = (camX - centreX) * k
      const dy = (camY - centreY) * k
      layers.far.position.set(dx * FAR_LAG, dy * FAR_LAG)
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
