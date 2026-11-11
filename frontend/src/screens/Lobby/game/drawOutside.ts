/**
 * Rene Island around the classroom: grass, beach, the sea with waves, palms,
 * bushes, rocks, a signpost and a small boat. Nobody can walk here yet; the
 * walls and the railing keep everyone in the room.
 */
import { Container, Graphics, Text } from 'pixi.js'
import { RD, RW } from './room'
import { OUTLINE, type Scene } from './scene'

const CX = RW / 2
const CY = RD / 2

export interface Outside {
  /** The static island ground: safe to cache as one texture. */
  ground: Graphics
  /** Moves a little every frame (skipped with Moving effects on Less). */
  animate: (t: number, dt: number) => void
}

const PALMS: readonly [x: number, y: number, size: number][] = [
  [-2.6, 3.5, 1],
  [-3.2, 9.2, 1.1],
  [3, 17.6, 1],
  [13.5, 18.4, 1.15],
  [25.6, 9.5, 1.05],
  [26.4, 3, 0.95],
  [8, -3.4, 0.9],
  [17, -3.1, 1],
]
const BUSHES: readonly [number, number][] = [
  [-1.6, 6.5],
  [-1.8, 12.8],
  [6.5, 16],
  [18.5, 16.2],
  [24, 12.4],
  [23.6, 6.6],
  [3, -2.2],
  [12.5, -2.5],
  [-1.4, 0.4],
]
const ROCKS: readonly [number, number][] = [
  [1.5, 16.5],
  [10, 16.7],
  [21, 15.3],
  [24.4, 14.5],
  [-3.3, 6.6],
]
/** From the door, around the right corner. */
const STEPPING_STONES: readonly [number, number][] = [
  [20.4, -1.3],
  [21.6, -1.9],
  [22.9, -1.6],
  [24.0, -0.8],
  [24.7, 0.4],
  [25.2, 1.8],
]

export function drawOutside(scene: Scene): Outside {
  const { proj, layers, rnd } = scene
  const { P } = proj

  /** A wobbly island outline around the room's centre. */
  const blob = (rx: number, ry: number, wobble: number) => {
    const points: number[] = []
    const n = 90
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2
      const k = 1 + wobble * (Math.sin(3 * t + 1) * 0.55 + Math.sin(7 * t + 2) * 0.3 + Math.sin(11 * t) * 0.15)
      points.push(...P(CX + Math.cos(t) * rx * k, CY + Math.sin(t) * ry * k))
    }
    return points
  }

  // Shallow water, sand, grass.
  const ground = new Graphics()
  ground.poly(blob(23.5, 19, 0.06)).fill(0xa6e0ef)
  ground.poly(blob(21, 16.5, 0.06)).fill(0xf6dfaa)
  ground.poly(blob(19.3, 14.8, 0.07)).fill(0xa7d77e)
  ground.poly(blob(18.6, 14.1, 0.07)).fill(0xb5df88)
  for (let i = 0; i < 260; i++) {
    const x = -7 + rnd() * 36
    const y = -7 + rnd() * 28
    if (x > -0.6 && x < RW + 0.6 && y > -0.6 && y < RD + 0.6) continue
    const dx = (x - CX) / 18
    const dy = (y - CY) / 13.5
    if (dx * dx + dy * dy > 0.92) continue
    const [X, Y] = P(x, y)
    ground
      .moveTo(X - 5, Y)
      .lineTo(X - 2, Y - 8)
      .lineTo(X, Y - 2)
      .lineTo(X + 3, Y - 9)
      .lineTo(X + 5, Y)
      .stroke({ width: 2, color: 0x86c46a, join: 'round', cap: 'round' })
  }
  for (let i = 0; i < 120; i++) {
    const t = rnd() * Math.PI * 2
    const r = 1.0 + rnd() * 0.05
    const [X, Y] = P(CX + Math.cos(t) * 20.2 * r, CY + Math.sin(t) * 15.7 * r)
    ground.circle(X, Y, 1.6 + rnd() * 1.6).fill({ color: 0xe5c584, alpha: 0.9 })
  }
  STEPPING_STONES.forEach(([x, y], i) => {
    const [X, Y] = P(x, y)
    ground.ellipse(X, Y, 20 - i * 0.5, 9).fill(0xd8d0c2).stroke({ width: 2, color: 0x9d8f7c })
  })
  layers.ground.addChild(ground)

  // Foam line where the sand meets the water: it fades in and out.
  const foam = new Graphics().poly(blob(21.3, 16.8, 0.06)).stroke({ width: 7, color: 0xffffff, alpha: 0.75 })
  layers.ground.addChild(foam)

  // Little waves on the sea.
  const waves: { g: Graphics; phase: number; baseX: number }[] = []
  const waveLayer = new Container()
  for (let i = 0; i < 70; i++) {
    const t = rnd() * Math.PI * 2
    const r = 1.18 + rnd() * 0.9
    const [X, Y] = P(CX + Math.cos(t) * 21 * r, CY + Math.sin(t) * 17 * r)
    const g = new Graphics()
      .moveTo(-12, 0)
      .quadraticCurveTo(-6, -6, 0, 0)
      .quadraticCurveTo(6, -6, 12, 0)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.7, cap: 'round' })
    g.position.set(X, Y)
    waves.push({ g, phase: rnd() * 6, baseX: X })
    waveLayer.addChild(g)
  }
  layers.sea.addChild(waveLayer)

  // A small sailboat.
  const boat = new Graphics()
  boat.poly([-34, 0, 34, 0, 24, 16, -24, 16]).fill(0xf0a050).stroke({ width: 2.5, color: OUTLINE })
  boat.poly([-2, -6, -2, -70, -32, -6]).fill(0xfff3d6).stroke({ width: 2.5, color: OUTLINE })
  boat.poly([3, -6, 3, -78, 30, -6]).fill(0xffffff).stroke({ width: 2.5, color: OUTLINE })
  for (const x of [-12, 0, 12]) boat.circle(x, 8, 3).fill(0xffffff).stroke({ width: 2, color: OUTLINE })
  const [boatX, boatY] = P(-9, 20)
  boat.position.set(boatX, boatY)
  layers.sea.addChild(boat)

  // Palms, bushes, rocks and the signpost are depth-sorted with everything else.
  const fronds: { g: Graphics; sway: number }[] = []
  for (const [x, y, size] of PALMS) {
    const palm = drawPalm(size)
    palm.view.position.set(...P(x, y))
    fronds.push({ g: palm.fronds, sway: rnd() * 6 })
    scene.add(palm.view, x, y)
  }
  for (const [x, y] of BUSHES) {
    const g = drawBush()
    g.position.set(...P(x, y))
    scene.add(g, x, y)
  }
  for (const [x, y] of ROCKS) {
    const g = drawRock()
    g.position.set(...P(x, y))
    scene.add(g, x, y)
  }
  const sign = drawSignpost()
  sign.position.set(...P(25.6, 2.6))
  scene.add(sign, 25.6, 2.6)

  return {
    ground,
    animate(t, dt) {
      for (const w of waves) {
        w.phase += dt
        w.g.x = w.baseX + Math.sin(w.phase * 0.8) * 8
        w.g.alpha = 0.4 + Math.sin(w.phase * 1.3) * 0.3
      }
      foam.alpha = 0.55 + Math.sin(t * 1.4) * 0.35
      for (const f of fronds) f.g.rotation = Math.sin(t * 1.1 + f.sway) * 0.035
      boat.y = boatY + Math.sin(t * 1.6) * 3
      boat.rotation = Math.sin(t * 1.2) * 0.03
    },
  }
}

function drawPalm(s: number) {
  const view = new Container()
  const trunk = new Graphics()
  trunk.ellipse(0, 0, 34 * s, 13 * s).fill({ color: 0x3d6b2a, alpha: 0.18 })
  const spine: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    spine.push([Math.sin(t * 2.2) * 16 * s, -t * 150 * s])
  }
  for (let i = 0; i < 8; i++) {
    const [a, b] = spine[i]
    const [c, d] = spine[i + 1]
    const w = (9 - i * 0.5) * s
    trunk
      .poly([a - w, b, a + w, b, c + w - 0.6, d, c - w + 0.6, d])
      .fill(i % 2 ? 0xb07a4a : 0xc08a56)
      .stroke({ width: 2, color: OUTLINE, join: 'round' })
  }
  const fronds = new Graphics()
  ;[-2.6, -1.9, -1.1, -0.35, 0.35, 1.1, 1.9, 2.6].forEach((a, i) => {
    const len = (70 + (i % 2) * 14) * s
    const dx = Math.sin(a) * len
    const dy = -Math.cos(a) * len * 0.55 + Math.abs(a) * 18 * s
    fronds
      .moveTo(0, 0)
      .quadraticCurveTo(dx * 0.5, dy * 0.5 - 28 * s, dx, dy)
      .quadraticCurveTo(dx * 0.45, dy * 0.5 - 6 * s, 0, 0)
      .fill(i % 2 ? 0x6fbf5c : 0x82cf6a)
      .stroke({ width: 2, color: 0x3f7a35, join: 'round' })
  })
  for (const [a, b] of [
    [-7, 6],
    [6, 7],
    [0, 10],
  ]) {
    fronds.circle(a * s, b * s, 6 * s).fill(0x9a6a3a).stroke({ width: 2, color: OUTLINE })
  }
  fronds.position.set(...spine[8])
  view.addChild(trunk, fronds)
  return { view, fronds }
}

function drawBush() {
  const g = new Graphics()
  g.ellipse(0, 0, 40, 14).fill({ color: 0x3d6b2a, alpha: 0.16 })
  for (const [a, b, r] of [
    [-20, -12, 18],
    [18, -12, 17],
    [0, -22, 22],
    [-6, -10, 18],
    [10, -8, 16],
  ]) {
    g.circle(a, b, r).fill(0x6fbf5c).stroke({ width: 2, color: 0x3f7a35 })
  }
  for (const [a, b, r] of [
    [-8, -30, 7],
    [12, -22, 6],
  ]) {
    g.circle(a, b, r).fill({ color: 0xa6e08a, alpha: 0.9 })
  }
  for (const [a, b] of [
    [-16, -18],
    [6, -30],
    [20, -10],
  ]) {
    g.circle(a, b, 4).fill(0xffd34d)
    g.circle(a, b, 1.6).fill(0xf08a5d)
  }
  return g
}

function drawRock() {
  const g = new Graphics()
  g.ellipse(0, -6, 22, 13).fill(0xc9c1b3).stroke({ width: 2, color: 0x8b7f6c })
  g.ellipse(-5, -11, 10, 5).fill(0xe2dccf)
  return g
}

function drawSignpost() {
  const view = new Container()
  const g = new Graphics()
  g.rect(-4, -96, 8, 96).fill(0xb07a4a).stroke({ width: 2, color: OUTLINE })
  g.poly([-46, -92, 40, -92, 54, -78, 40, -64, -46, -64]).fill(0xf0a050).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  g.poly([-50, -58, 36, -58, 50, -44, 36, -30, -50, -30]).fill(0x7dbf7a).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  view.addChild(g)
  const label = (text: string, x: number, y: number) => {
    const t = new Text({ text, style: { fontFamily: 'Fredoka', fontWeight: '700', fontSize: 15, fill: 0xffffff }, resolution: 2 })
    t.anchor.set(0.5)
    t.position.set(x, y)
    view.addChild(t)
  }
  label('Campfire', 0, -78)
  label('Island', -4, -44)
  return view
}
