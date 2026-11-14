/**
 * Rene Island around the classroom. The classroom is one corner of a big
 * island: the sea and beach are on the left and at the front, and on the
 * door side the land goes on past the screen (paths, trees, the edge of a
 * house and the Campfire tent). Outside the door is the school's front yard:
 * a stone path that forks at a signpost, a flagpole, a wishing well, the
 * school garden, a mango tree with a bench, a notice board and lamp posts.
 *
 * Nobody can walk here yet; the walls and the railing keep everyone in the
 * room. All of it is scenery.
 */
import { Container, Graphics, Text } from 'pixi.js'
import { islandBounds } from './camera'
import type { Projection } from './projection'
import { RD, RW } from './room'
import { box, cylinder, OUTLINE, shade, type Scene } from './scene'

export interface Outside {
  /** The static island ground: safe to cache as one texture. */
  ground: Graphics
  /** Moves a little every frame (skipped with Moving effects on Less). */
  animate: (t: number, dt: number) => void
}

type Pt = readonly [number, number]

// ---------- The shore ----------
// Sea where x < shoreX(y) (the left side) and where y > SHORE_Y (the front),
// joined by a round corner. Everywhere else is land, on past the screen.

const SHORE_Y = 17.5
const CORNER = { x: -0.5, y: 13.5, r: 4 }
/** The left shore bends away behind the room, so there is more land up there. */
const shoreX = (y: number) => CORNER.x - CORNER.r - 0.35 * Math.max(0, -y - 2)

/** How far (tiles) a point is past the shore into the sea; < 0 = on land. */
function seaDepth(x: number, y: number): number {
  if (x < CORNER.x && y > CORNER.y) return Math.hypot(x - CORNER.x, y - CORNER.y) - CORNER.r
  return Math.max(shoreX(y) - x, y - SHORE_Y)
}

/** The shore line pushed `d` tiles out to sea, with a gentle wobble. */
function shoreLine(d: number, wobble = 0.35): Pt[] {
  const raw: [number, number][] = []
  for (let y = -40; y < CORNER.y; y += 0.5) raw.push([shoreX(y), y])
  for (let a = 0; a <= 16; a++) {
    const t = Math.PI - (a / 16) * (Math.PI / 2)
    raw.push([CORNER.x + Math.cos(t) * CORNER.r, CORNER.y + Math.sin(t) * CORNER.r])
  }
  for (let x = CORNER.x + 0.5; x <= 60; x += 0.5) raw.push([x, SHORE_Y])
  // Push each point out along the normal (towards the sea).
  let s = 0
  return raw.map(([x, y], i) => {
    const [ax, ay] = raw[Math.max(0, i - 1)]
    const [bx, by] = raw[Math.min(raw.length - 1, i + 1)]
    if (i > 0) s += Math.hypot(x - ax, y - ay)
    const tx = bx - ax
    const ty = by - ay
    const len = Math.hypot(tx, ty) || 1
    // Walking along the shore, the sea is on the right: normal = (-ty, tx).
    const k = d + wobble * (Math.sin(s * 0.9 + 1) * 0.6 + Math.sin(s * 2.3) * 0.4)
    return [x + (-ty / len) * k, y + (tx / len) * k] as const
  })
}

// ---------- The front yard (tiles) ----------

const DOOR: Pt = [20.25, -0.1]
const PLAZA = { x: 14.6, y: -6.4, r: 1.5 }
/** Door -> plaza, then three ways out. */
const PATHS: readonly Pt[][] = [
  [DOOR, [20.1, -2.4], [18.6, -4], [16.2, -5.6]],
  // To the Campfire (up the screen, to the tent at the top).
  [[13.2, -7.6], [10.4, -9.8], [6.4, -11], [2.4, -10.8], [0, -9.6]],
  // To the beach (along behind the back wall, down to the sand).
  [[13, -5.6], [8.4, -4.7], [3, -4.3], [-2, -4.1], [-6.4, -4]],
  // On into the island (off the right side).
  [[15.8, -7.8], [17.2, -10], [19.4, -11.6], [23, -12.4], [27, -12.6]],
]

const TREES: readonly [x: number, y: number, size: number][] = [
  [5, -6.3, 1.2], // the mango tree, with the bench under it
  [19.6, -7.4, 1],
  [9.5, -13.8, 1],
  [-5, -12.5, 0.95],
  [12.4, -14.8, 1.05],
  [26.2, -1.8, 1],
  [26.8, 5.5, 1.05],
  [25.5, 11.4, 0.95],
  [29.5, 2, 1.1],
  [0.8, -17, 1],
]
const PALMS: readonly [x: number, y: number, size: number][] = [
  [-2.6, 3.5, 1],
  [-3.2, 9.2, 1.1],
  [3, 16.2, 1],
  [13.5, 16.6, 1.15],
  [-4.6, -2.6, 0.95],
  [24.5, 16.4, 1],
]
const BUSHES: readonly Pt[] = [
  [-1.6, 6.5],
  [-1.8, 12.8],
  [6.5, 15.6],
  [18.5, 15.8],
  [23.6, 6.6],
  [24.2, 2],
  [-1.4, 0.4],
  [16, -3.8],
  [-2.6, -6.8],
  [18.6, -9.6],
  [22.4, -3.4],
]
const ROCKS: readonly Pt[] = [
  [1.5, 17.2],
  [10, 17.4],
  [21, 17],
  [-4.8, 6.6],
  [-5.8, -1],
]
/** Spiky plants planted at the grass edge (they used to float in front). */
const PLANTS: readonly [x: number, y: number, size: number][] = [
  [-1.4, 15.2, 1],
  [9.2, 15.9, 0.9],
  [16.4, 16.2, 1.05],
  [23.4, 13.6, 0.95],
  [-3.4, 1.8, 0.85],
]
const LAMPS: readonly Pt[] = [
  [18.2, -4.9],
  [12, -4.4],
  [7, -3.7],
  [9.6, -10.6],
  [16.9, -8.9],
]
const WELL: Pt = [9.4, -7.4]
const GARDEN = { x: -0.8, y: -9.2, w: 3.8, d: 2.3 }
const BENCH: Pt = [5.9, -5.4]
const SIGN: Pt = [13.1, -6.7]
const NOTICE: Pt = [19.4, -3.9]
const HOUSE = { x: 13.2, y: -14, w: 3.4, d: 2.6 }
const TENT: Pt = [-1.6, -9.4]

export function drawOutside(scene: Scene): Outside {
  const { proj, layers, rnd } = scene
  const { P } = proj

  // Everything is drawn only as far as the camera can ever look, so the cached
  // ground texture stays a sensible size.
  const b = islandBounds(proj)
  const M = 260
  const R = { x0: b.x0 - M, y0: b.y0 - M, x1: b.x1 + M, y1: b.y1 + M }
  const clampPt = ([X, Y]: [number, number]) => [Math.max(R.x0, Math.min(R.x1, X)), Math.max(R.y0, Math.min(R.y1, Y))]
  const inView = ([X, Y]: [number, number]) => X > R.x0 && X < R.x1 && Y > R.y0 && Y < R.y1
  /** The land, with the shore pushed `d` tiles out to sea. */
  const land = (d: number) => [...shoreLine(d), [60, -40] as const].flatMap(([x, y]) => clampPt(P(x, y)))

  const ground = new Graphics()
  ground.poly(land(2.5)).fill(0xa6e0ef) // shallow water
  ground.poly(land(0.9)).fill(0xf6dfaa) // sand
  ground.poly(land(-0.2)).fill(0xa7d77e) // grass
  ground.poly(land(-1.1)).fill(0xb5df88)

  // Sand speckles along the beach.
  for (let i = 0; i < 260; i++) {
    const [x, y] = [-12 + rnd() * 60, -24 + rnd() * 46]
    const depth = seaDepth(x, y)
    if (depth < 0 || depth > 0.8) continue
    const p = P(x, y)
    if (inView(p)) ground.circle(p[0], p[1], 1.6 + rnd() * 1.6).fill({ color: 0xe5c584, alpha: 0.9 })
  }

  drawPaths(ground, proj)
  drawGarden(ground, proj, rnd)

  // Grass tufts, kept off the room, the paths and the garden.
  const onPath = (x: number, y: number) =>
    PATHS.some((path) => path.some((p, i) => i > 0 && segDist(x, y, path[i - 1], p) < 0.9)) ||
    Math.hypot(x - PLAZA.x, y - PLAZA.y) < PLAZA.r + 0.6
  for (let i = 0; i < 420; i++) {
    const x = -8 + rnd() * 42
    const y = -22 + rnd() * 40
    if (x > -0.6 && x < RW + 0.6 && y > -0.6 && y < RD + 0.6) continue
    if (seaDepth(x, y) > -1.2 || onPath(x, y)) continue
    if (x > GARDEN.x - 0.4 && x < GARDEN.x + GARDEN.w + 0.4 && y > GARDEN.y - 0.4 && y < GARDEN.y + GARDEN.d + 0.6) continue
    const [X, Y] = P(x, y)
    if (!inView([X, Y])) continue
    ground
      .moveTo(X - 5, Y)
      .lineTo(X - 2, Y - 8)
      .lineTo(X, Y - 2)
      .lineTo(X + 3, Y - 9)
      .lineTo(X + 5, Y)
      .stroke({ width: 2, color: 0x86c46a, join: 'round', cap: 'round' })
  }
  layers.ground.addChild(ground)

  // Foam line where the sand meets the water: it fades in and out.
  const foamPts = shoreLine(1.05)
    .map(([x, y]) => P(x, y))
    .filter(inView)
    .flat()
  const foam = new Graphics().poly(foamPts, false).stroke({ width: 7, color: 0xffffff, alpha: 0.75, cap: 'round', join: 'round' })
  layers.ground.addChild(foam)

  // Little waves on the sea.
  const waves: { g: Graphics; phase: number; baseX: number }[] = []
  const waveLayer = new Container()
  for (let tries = 0; waves.length < 70 && tries < 4000; tries++) {
    const x = -30 + rnd() * 80
    const y = -30 + rnd() * 70
    if (seaDepth(x, y) < 3) continue
    const [X, Y] = P(x, y)
    if (!inView([X, Y])) continue
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
  const [boatX, boatY] = P(-9, 22)
  boat.position.set(boatX, boatY)
  layers.sea.addChild(boat)

  // ---- Standing things, depth-sorted with everything else ----
  const put = (view: Container, x: number, y: number, x1 = x, y1 = y) => {
    view.position.set(...P(x, y))
    scene.add(view, x, y, x1, y1)
  }
  const sway: { g: Container; phase: number; amount: number }[] = []

  for (const [x, y, size] of PALMS) {
    const palm = drawPalm(size)
    put(palm.view, x, y)
    sway.push({ g: palm.fronds, phase: rnd() * 6, amount: 0.035 })
  }
  for (const [x, y, size] of TREES) {
    const tree = drawTree(size, x === TREES[0][0])
    put(tree.view, x, y)
    sway.push({ g: tree.crown, phase: rnd() * 6, amount: 0.012 })
  }
  for (const [x, y] of BUSHES) put(drawBush(), x, y)
  for (const [x, y] of ROCKS) put(drawRock(), x, y)
  for (const [x, y, s] of PLANTS) {
    const plant = drawPlant(s)
    put(plant.view, x, y)
    sway.push({ g: plant.leaves, phase: rnd() * 6, amount: 0.03 })
  }
  for (const [x, y] of LAMPS) put(drawLamp(), x, y)

  // The flagpole stands in the middle of the plaza.
  const flag = drawFlagpole()
  put(flag.view, PLAZA.x, PLAZA.y)

  put(drawWell(proj, WELL), WELL[0] - 0.7, WELL[1] - 0.7, WELL[0] + 0.7, WELL[1] + 0.7)
  put(drawBench(), BENCH[0], BENCH[1])
  put(drawSignpost(), SIGN[0], SIGN[1])
  put(drawNoticeBoard(), NOTICE[0], NOTICE[1])
  put(drawGardenFence(proj), GARDEN.x, GARDEN.y + GARDEN.d, GARDEN.x + GARDEN.w, GARDEN.y + GARDEN.d)

  // Neighbours at the edge of the picture: a house and the Campfire tent.
  const house = new Container()
  house.addChild(drawHouse(proj))
  scene.add(house, HOUSE.x, HOUSE.y, HOUSE.x + HOUSE.w, HOUSE.y + HOUSE.d)
  const tent = drawTent()
  put(tent.view, TENT[0], TENT[1])

  // Butterflies over the garden and the flowers.
  const butterflies: { g: Container; home: [number, number]; phase: number; wings: Graphics }[] = []
  for (const [x, y, color] of [
    [GARDEN.x + 1.5, GARDEN.y + 1, 0xffb3d1],
    [GARDEN.x + 3, GARDEN.y + 0.4, 0xfff08a],
    [PLAZA.x - 1.6, PLAZA.y - 1.8, 0xb9e3ff],
  ] as const) {
    const wings = new Graphics()
    wings.ellipse(-4, -2, 4.5, 3.5).fill(color).stroke({ width: 1.2, color: OUTLINE })
    wings.ellipse(4, -2, 4.5, 3.5).fill(color).stroke({ width: 1.2, color: OUTLINE })
    const g = new Container()
    g.addChild(wings, new Graphics().rect(-0.8, -5, 1.6, 7).fill(OUTLINE))
    const home = P(x, y, 40)
    g.position.set(...home)
    layers.fx.addChild(g)
    butterflies.push({ g, home, phase: rnd() * 6, wings })
  }

  return {
    ground,
    animate(t, dt) {
      for (const w of waves) {
        w.phase += dt
        w.g.x = w.baseX + Math.sin(w.phase * 0.8) * 8
        w.g.alpha = 0.4 + Math.sin(w.phase * 1.3) * 0.3
      }
      foam.alpha = 0.55 + Math.sin(t * 1.4) * 0.35
      for (const s of sway) s.g.rotation = Math.sin(t * 1.1 + s.phase) * s.amount
      boat.y = boatY + Math.sin(t * 1.6) * 3
      boat.rotation = Math.sin(t * 1.2) * 0.03
      flag.cloth.skew.y = Math.sin(t * 3.2) * 0.06
      flag.cloth.scale.x = 1 + Math.sin(t * 2.1) * 0.04
      tent.smoke.forEach((puff, i) => {
        const p = (t * 0.35 + i / tent.smoke.length) % 1
        puff.position.set(Math.sin(p * 5 + i) * 8 + p * 18, -p * 110)
        puff.alpha = 0.55 * (1 - p)
        puff.scale.set(0.6 + p * 0.9)
      })
      for (const f of butterflies) {
        const a = t * 0.7 + f.phase
        f.g.position.set(f.home[0] + Math.sin(a) * 46, f.home[1] + Math.sin(a * 1.7) * 16)
        f.wings.scale.y = 0.35 + Math.abs(Math.sin(t * 14 + f.phase)) * 0.65
      }
    },
  }
}

/** Distance (tiles) from a point to a path segment. */
function segDist(x: number, y: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
}

/** A dirt band with cobbles, along each path, and the round plaza. */
function drawPaths(g: Graphics, proj: Projection) {
  const { P, floorEllipse } = proj
  const stamp = (x: number, y: number, r: number, color: number) => {
    const [X, Y] = P(x, y)
    const [rx, ry] = floorEllipse(r)
    g.ellipse(X, Y, rx, ry).fill(color)
  }
  const along = (path: readonly Pt[], step: number, fn: (x: number, y: number, nx: number, ny: number, k: number) => void) => {
    let k = 0
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1]
      const [bx, by] = path[i]
      const len = Math.hypot(bx - ax, by - ay)
      for (let s = 0; s < len; s += step) {
        const t = s / len
        fn(ax + (bx - ax) * t, ay + (by - ay) * t, -(by - ay) / len, (bx - ax) / len, k++)
      }
    }
  }
  // Dark edge, then dirt, so the path looks pressed into the grass.
  for (const [r, color] of [
    [0.78, 0x9cc874],
    [0.66, 0xe6cf9c],
  ] as const) {
    for (const path of PATHS) along(path, 0.2, (x, y) => stamp(x, y, r, color))
    stamp(PLAZA.x, PLAZA.y, PLAZA.r + r - 0.66, color)
  }
  const cobble = (x: number, y: number, r: number) => {
    const [X, Y] = P(x, y)
    const [rx, ry] = floorEllipse(r)
    g.ellipse(X, Y, rx, ry).fill(0xded6c6).stroke({ width: 1.6, color: 0xa99b86 })
  }
  for (const path of PATHS) {
    along(path, 0.5, (x, y, nx, ny, k) => {
      const side = k % 2 ? 0.22 : -0.22
      cobble(x + nx * side, y + ny * side, 0.23 + (k % 3) * 0.02)
    })
  }
  // Plaza: a ring of cobbles around the flagpole's grass circle.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    cobble(PLAZA.x + Math.cos(a) * (PLAZA.r - 0.35), PLAZA.y + Math.sin(a) * (PLAZA.r - 0.35), 0.24)
  }
  const [X, Y] = P(PLAZA.x, PLAZA.y)
  const [rx, ry] = floorEllipse(0.75)
  g.ellipse(X, Y, rx, ry).fill(0x9fd17a).stroke({ width: 2, color: 0x7aae5e })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const [fx, fy] = P(PLAZA.x + Math.cos(a) * 0.5, PLAZA.y + Math.sin(a) * 0.5)
    g.circle(fx, fy, 3.2).fill(i % 2 ? 0xffd34d : 0xff9fb8)
  }
}

/** The school garden: soil beds with rows of sprouts and sampaguita bushes. */
function drawGarden(g: Graphics, proj: Projection, rnd: () => number) {
  const { P } = proj
  const { x, y, w, d } = GARDEN
  const quad = (x0: number, y0: number, x1: number, y1: number) => [...P(x0, y0), ...P(x1, y0), ...P(x1, y1), ...P(x0, y1)]
  g.poly(quad(x - 0.15, y - 0.15, x + w + 0.15, y + d + 0.15)).fill(0x8a5a3a)
  g.poly(quad(x, y, x + w, y + d)).fill(0x9c6a45)
  // Rows of sprouts on the left; two white-flowered sampaguita bushes on the right.
  for (let row = 0; row < 3; row++) {
    const ry = y + 0.45 + row * 0.75
    g.poly(quad(x + 0.15, ry - 0.12, x + w * 0.58, ry + 0.12)).fill(0x7c4e30)
    for (let cx = x + 0.35; cx < x + w * 0.58; cx += 0.42) {
      const [X, Y] = P(cx, ry)
      g.moveTo(X, Y)
        .quadraticCurveTo(X - 7, Y - 8, X - 9, Y - 3)
        .quadraticCurveTo(X - 4, Y - 3, X, Y)
        .quadraticCurveTo(X + 7, Y - 9, X + 9, Y - 4)
        .quadraticCurveTo(X + 4, Y - 2, X, Y)
        .fill(row === 1 ? 0x6cbf52 : 0x82cf6a)
        .stroke({ width: 1.4, color: 0x3f7a35 })
    }
  }
  for (const [bx, by] of [
    [x + w * 0.8, y + 0.7],
    [x + w * 0.78, y + 1.75],
  ]) {
    const [X, Y] = P(bx, by)
    for (const [a, c, r] of [
      [-12, -8, 13],
      [10, -8, 12],
      [0, -16, 14],
    ]) {
      g.circle(X + a, Y + c, r).fill(0x5fae52).stroke({ width: 1.6, color: 0x3f7a35 })
    }
    for (let i = 0; i < 7; i++) {
      const fx = X - 16 + rnd() * 32
      const fy = Y - 24 + rnd() * 18
      star(g, fx, fy, 4.2)
    }
  }
}

/** A tiny white five-petal flower (sampaguita). */
function star(g: Graphics, x: number, y: number, r: number) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.55).fill(0xffffff)
  }
  g.circle(x, y, r * 0.35).fill(0xffe28a)
}

function drawGardenFence(proj: Projection) {
  const g = new Graphics()
  const { P } = proj
  const y = GARDEN.y + GARDEN.d + 0.15
  const x0 = GARDEN.x - 0.15
  const x1 = GARDEN.x + GARDEN.w + 0.15
  const [ox, oy] = P(x0, y)
  const pt = (x: number, z: number): [number, number] => {
    const [X, Y] = P(x, y, z)
    return [X - ox, Y - oy]
  }
  g.moveTo(...pt(x0, 12)).lineTo(...pt(x1, 12)).moveTo(...pt(x0, 22)).lineTo(...pt(x1, 22)).stroke({ width: 4, color: OUTLINE })
  g.moveTo(...pt(x0, 12)).lineTo(...pt(x1, 12)).moveTo(...pt(x0, 22)).lineTo(...pt(x1, 22)).stroke({ width: 2, color: 0xfff3dc })
  for (let x = x0; x <= x1 + 0.01; x += 0.5) {
    const [X, Y] = pt(x, 0)
    g.poly([X - 3, Y, X + 3, Y, X + 3, Y - 26, X, Y - 31, X - 3, Y - 26]).fill(0xfff3dc).stroke({ width: 1.8, color: OUTLINE, join: 'round' })
  }
  return g
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

/** A round leafy tree; the mango tree gets a few mangoes. */
function drawTree(s: number, mangoes: boolean) {
  const view = new Container()
  const trunk = new Graphics()
  trunk.ellipse(0, 0, 50 * s, 18 * s).fill({ color: 0x3d6b2a, alpha: 0.2 })
  trunk
    .poly([-10 * s, 0, 10 * s, 0, 7 * s, -70 * s, 16 * s, -96 * s, 4 * s, -84 * s, 0, -100 * s, -5 * s, -82 * s, -16 * s, -94 * s, -7 * s, -70 * s])
    .fill(0x9a6a3a)
    .stroke({ width: 2, color: OUTLINE, join: 'round' })
  const crown = new Graphics()
  for (const [a, b, r, c] of [
    [-34, -10, 34, 0x5aa74e],
    [34, -8, 32, 0x5aa74e],
    [0, -34, 40, 0x62b356],
    [-22, 8, 30, 0x6fbf5c],
    [22, 10, 30, 0x6fbf5c],
    [0, 2, 34, 0x78c662],
  ] as const) {
    crown.circle(a * s, b * s, r * s).fill(c).stroke({ width: 2, color: 0x3f7a35 })
  }
  for (const [a, b, r] of [
    [-10, -44, 12],
    [20, -18, 9],
    [-28, -4, 8],
  ]) {
    crown.circle(a * s, b * s, r * s).fill({ color: 0xa6e08a, alpha: 0.85 })
  }
  if (mangoes) {
    for (const [a, b] of [
      [-18, 22],
      [14, 26],
      [30, 8],
      [-36, 6],
    ]) {
      crown.ellipse(a * s, b * s, 5 * s, 7 * s).fill(0xffc23d).stroke({ width: 1.6, color: OUTLINE })
    }
  }
  crown.position.set(0, -100 * s)
  view.addChild(trunk, crown)
  return { view, crown }
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

/** A spiky plant growing out of a little soil mound, with its shadow. */
function drawPlant(s: number) {
  const view = new Container()
  const base = new Graphics()
  base.ellipse(4 * s, 2 * s, 46 * s, 14 * s).fill({ color: 0x3d6b2a, alpha: 0.2 })
  base.ellipse(0, 0, 30 * s, 10 * s).fill(0x9c6a45).stroke({ width: 2, color: OUTLINE })
  const leaves = new Graphics()
  for (const [a, len, color] of [
    [-1.15, 70, 0x4f9a46],
    [1.15, 66, 0x4f9a46],
    [-0.7, 92, 0x5fae52],
    [0.65, 88, 0x5fae52],
    [-0.25, 104, 0x67b858],
    [0.2, 98, 0x6fbf5c],
  ] as const) {
    const dx = Math.sin(a) * len * s
    const dy = -Math.cos(a) * len * s
    leaves
      .moveTo(-6 * s, 0)
      .quadraticCurveTo(dx * 0.4 - 8 * s, dy * 0.55, dx, dy)
      .quadraticCurveTo(dx * 0.45 + 10 * s, dy * 0.5, 6 * s, 0)
      .fill(color)
      .stroke({ width: 2, color: 0x2f6a2a, join: 'round' })
  }
  // The leaves sway from their base, which stays put in the soil.
  leaves.position.set(0, -2 * s)
  view.addChild(base, leaves)
  return { view, leaves }
}

function drawLamp() {
  const g = new Graphics()
  g.ellipse(0, 0, 14, 5).fill({ color: 0x3d6b2a, alpha: 0.2 })
  g.rect(-3, -104, 6, 104).fill(0x5b6b74).stroke({ width: 1.8, color: 0x34404a })
  g.ellipse(0, -2, 8, 3.5).fill(0x5b6b74).stroke({ width: 1.8, color: 0x34404a })
  g.circle(0, -116, 18).fill({ color: 0xfff1b8, alpha: 0.35 })
  g.poly([-10, -104, 10, -104, 8, -124, -8, -124]).fill(0xfff1b8).stroke({ width: 2, color: 0x34404a, join: 'round' })
  g.poly([-13, -124, 13, -124, 0, -134]).fill(0x5b6b74).stroke({ width: 2, color: 0x34404a, join: 'round' })
  return g
}

/** The flagpole: a white pole and the Philippine flag, gently waving. */
function drawFlagpole() {
  const view = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, 18, 7).fill(0xd8d0c2).stroke({ width: 2, color: 0x9d8f7c })
  g.rect(-3, -230, 6, 230).fill(0xf6f2ea).stroke({ width: 1.8, color: 0x8f877a })
  g.circle(0, -234, 6).fill(0xffd34d).stroke({ width: 1.8, color: OUTLINE })
  const cloth = new Graphics()
  const W = 88
  const H = 46
  cloth.rect(0, 0, W, H / 2).fill(0x2f5fb3)
  cloth.rect(0, H / 2, W, H / 2).fill(0xd63a3a)
  cloth.poly([0, 0, H * 0.87, H / 2, 0, H]).fill(0xffffff)
  const sx = H * 0.3
  const sy = H / 2
  cloth.circle(sx, sy, 5).fill(0xf6c445)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    cloth
      .moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6)
      .lineTo(sx + Math.cos(a) * 9, sy + Math.sin(a) * 9)
      .stroke({ width: 1.6, color: 0xf6c445 })
  }
  for (const [a, b] of [
    [3.5, 4],
    [3.5, H - 4],
    [H * 0.78, H / 2],
  ]) {
    cloth.circle(a, b, 1.8).fill(0xf6c445)
  }
  cloth.rect(0, 0, W, H).stroke({ width: 1.8, color: OUTLINE })
  cloth.position.set(3, -226)
  view.addChild(g, cloth)
  return { view, cloth }
}

/** A stone wishing well with a little roof and a bucket. */
function drawWell(proj: Projection, [x, y]: Pt) {
  const g = new Graphics()
  const [ox, oy] = proj.P(x, y)
  g.ellipse(0, 4, 62, 24).fill({ color: 0x3d6b2a, alpha: 0.2 })
  // cylinder() draws in world px: draw at the well's spot, then shift back.
  const stones = new Graphics()
  cylinder(stones, proj, x, y, 0, 0.62, 34, 0xc9c1b3)
  stones.position.set(-ox, -oy)
  const top = new Graphics()
  const [rx, ry] = proj.floorEllipse(0.5)
  top.ellipse(0, -34, rx, ry).fill(0x4a7fb0).stroke({ width: 2, color: OUTLINE })
  top.ellipse(-8, -37, rx * 0.4, ry * 0.3).fill({ color: 0xffffff, alpha: 0.5 })
  // Brick lines on the stone.
  for (const z of [12, 24]) top.moveTo(-28, -z).lineTo(28, -z).stroke({ width: 1.4, color: 0x9d8f7c, alpha: 0.7 })
  // Posts, roller, roof.
  for (const px of [-30, 30]) top.rect(px - 3, -96, 6, 66).fill(0x9a6a3a).stroke({ width: 1.8, color: OUTLINE })
  top.rect(-30, -78, 60, 6).fill(0xb07a4a).stroke({ width: 1.6, color: OUTLINE })
  top.moveTo(6, -72).lineTo(6, -52).stroke({ width: 1.6, color: OUTLINE })
  top.poly([0, -52, 12, -52, 10, -40, 2, -40]).fill(0x8aa0b0).stroke({ width: 1.6, color: OUTLINE, join: 'round' })
  top.poly([-46, -92, 46, -92, 22, -122, -22, -122]).fill(0xd2694a).stroke({ width: 2.2, color: OUTLINE, join: 'round' })
  top.poly([-22, -122, 22, -122, 0, -132]).fill(0xe07a58).stroke({ width: 2.2, color: OUTLINE, join: 'round' })
  const view = new Container()
  view.addChild(g, stones, top)
  return view
}

function drawBench() {
  const g = new Graphics()
  g.ellipse(0, 2, 44, 12).fill({ color: 0x3d6b2a, alpha: 0.18 })
  for (const x of [-30, 30]) g.rect(x - 3, -24, 6, 24).fill(0x8a5a3a).stroke({ width: 1.8, color: OUTLINE })
  g.poly([-40, -24, 40, -24, 36, -32, -36, -32]).fill(0xc08a56).stroke({ width: 2, color: OUTLINE, join: 'round' })
  g.rect(-38, -54, 76, 8).fill(0xc08a56).stroke({ width: 2, color: OUTLINE })
  g.rect(-38, -44, 76, 7).fill(0xb07a4a).stroke({ width: 2, color: OUTLINE })
  for (const x of [-30, 30]) g.rect(x - 2.5, -54, 5, 24).fill(0x8a5a3a).stroke({ width: 1.6, color: OUTLINE })
  return g
}

function drawSignpost() {
  const view = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, 18, 6).fill({ color: 0x3d6b2a, alpha: 0.2 })
  g.rect(-4, -110, 8, 110).fill(0xb07a4a).stroke({ width: 2, color: OUTLINE })
  // Campfire: up the path; Beach: to the left; the classroom: back to the door.
  g.poly([-50, -106, 40, -106, 54, -92, 40, -78, -50, -78]).fill(0xf0a050).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  g.poly([50, -72, -40, -72, -54, -58, -40, -44, 50, -44]).fill(0x7dbfdc).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  g.poly([-46, -38, 40, -38, 54, -24, 40, -10, -46, -10]).fill(0x7dbf7a).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  view.addChild(g)
  const label = (text: string, x: number, y: number) => {
    const t = new Text({ text, style: { fontFamily: 'Fredoka', fontWeight: '700', fontSize: 15, fill: 0xffffff }, resolution: 2 })
    t.anchor.set(0.5)
    t.position.set(x, y)
    view.addChild(t)
  }
  label('Campfire', -2, -92)
  label('Beach', 4, -58)
  label('Classroom', -2, -24)
  return view
}

function drawNoticeBoard() {
  const g = new Graphics()
  g.ellipse(0, 0, 40, 10).fill({ color: 0x3d6b2a, alpha: 0.18 })
  for (const x of [-34, 34]) g.rect(x - 3, -88, 6, 88).fill(0x9a6a3a).stroke({ width: 1.8, color: OUTLINE })
  g.rect(-42, -92, 84, 58).fill(0xc9935e).stroke({ width: 2.2, color: OUTLINE })
  g.rect(-37, -87, 74, 48).fill(0xe8c79a)
  for (const [x, y, w, h, c] of [
    [-32, -84, 22, 18, 0xffffff],
    [-6, -82, 18, 24, 0xfff3a6],
    [16, -85, 18, 16, 0xbfe3ff],
    [-28, -62, 26, 18, 0xffd3e0],
    [8, -62, 22, 18, 0xffffff],
  ] as const) {
    g.rect(x, y, w, h).fill(c).stroke({ width: 1.2, color: 0x9d8f7c })
    g.circle(x + w / 2, y + 2, 2).fill(0xe0584a)
  }
  g.poly([-48, -92, 48, -92, 38, -104, -38, -104]).fill(0xd2694a).stroke({ width: 2, color: OUTLINE, join: 'round' })
  return g
}

/** A neighbour's house at the edge of the picture: the island goes on past it. */
function drawHouse(proj: Projection) {
  const g = new Graphics()
  const { x, y, w, d } = HOUSE
  const { P } = proj
  const [sx, sy] = P(x + w / 2, y + d)
  g.ellipse(sx, sy - 10, 150, 40).fill({ color: 0x3d6b2a, alpha: 0.16 })
  box(g, proj, x, y, 0, w, d, 110, 0xf3e3c3)
  // Door and windows on the front.
  const door = (u: number, z0: number, z1: number, ww: number, color: number) => {
    const [ax, ay] = P(x + u, y + d, z0)
    const [bx, by] = P(x + u + ww, y + d, z0)
    const [cx, cy] = P(x + u + ww, y + d, z1)
    const [dx, dy] = P(x + u, y + d, z1)
    g.poly([ax, ay, bx, by, cx, cy, dx, dy]).fill(color).stroke({ width: 2, color: OUTLINE, join: 'round' })
  }
  door(w / 2 - 0.35, 0, 64, 0.7, 0x7db8c9)
  door(0.4, 40, 80, 0.7, 0xbfe3ff)
  door(w - 1.1, 40, 80, 0.7, 0xbfe3ff)
  // Roof: a ridge along x.
  const o = 0.3
  const h = 110
  const rh = 90
  const A = P(x - o, y - o, h)
  const B = P(x + w + o, y - o, h)
  const C = P(x + w + o, y + d + o, h)
  const D = P(x - o, y + d + o, h)
  const R1 = P(x - o, y + d / 2, h + rh)
  const R2 = P(x + w + o, y + d / 2, h + rh)
  const roof = (pts: [number, number][], color: number) =>
    g.poly(pts.flat()).fill(color).stroke({ width: 2.4, color: OUTLINE, join: 'round' })
  roof([A, B, R2, R1], shade(0xd2694a, -0.15))
  if (proj.diag) roof([B, C, R2], shade(0xd2694a, -0.08))
  else roof([A, D, R1], shade(0xd2694a, -0.08))
  roof([D, C, R2, R1], 0xd2694a)
  if (proj.diag) roof([B, C, R2], shade(0xd2694a, -0.2))
  // Chimney.
  const [kx, ky] = P(x + w * 0.75, y + d * 0.3, h + rh * 0.55)
  g.rect(kx - 9, ky - 36, 18, 36).fill(0xc9c1b3).stroke({ width: 2, color: OUTLINE })
  return g
}

/** The Campfire tent, peeking in at the top: striped, with smoke rising. */
function drawTent() {
  const view = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, 120, 34).fill({ color: 0x3d6b2a, alpha: 0.18 })
  g.poly([-110, 0, 0, -150, 110, 0]).fill(0xf6e7c8).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  for (const k of [-0.66, -0.33, 0.33, 0.66]) {
    g.poly([k * 110 - 12, 0, 0, -150, k * 110 + 12, 0]).fill(0xe46f5c)
  }
  g.poly([-110, 0, 0, -150, 110, 0]).stroke({ width: 2.5, color: OUTLINE, join: 'round' })
  g.poly([-24, 0, 0, -58, 24, 0]).fill(0x7a4a2c)
  g.moveTo(0, -150).lineTo(0, -184).stroke({ width: 3, color: OUTLINE })
  g.poly([0, -184, 30, -176, 0, -168]).fill(0xffd34d).stroke({ width: 2, color: OUTLINE, join: 'round' })
  // The campfire in front, with a warm glow.
  g.ellipse(140, 14, 44, 16).fill({ color: 0xffc46b, alpha: 0.35 })
  for (const [a, r] of [
    [-0.5, 0],
    [0.5, 0],
  ]) {
    g.poly([140 - 28, 18 + a * 8, 140 + 28, 12 - a * 8, 140 + 28, 6 - a * 8, 140 - 28, 12 + a * 8 + r]).fill(0x8a5a3a).stroke({ width: 1.6, color: OUTLINE })
  }
  g.moveTo(126, 10).quadraticCurveTo(128, -20, 140, -34).quadraticCurveTo(152, -20, 154, 10).fill(0xffa53d).stroke({ width: 2, color: OUTLINE })
  g.moveTo(133, 10).quadraticCurveTo(135, -6, 140, -16).quadraticCurveTo(146, -6, 147, 10).fill(0xffe07a)
  view.addChild(g)
  const smoke: Graphics[] = []
  for (let i = 0; i < 5; i++) {
    const puff = new Graphics().circle(0, 0, 12).fill(0xffffff)
    const holder = new Container()
    holder.position.set(140, -34)
    holder.addChild(puff)
    view.addChild(holder)
    smoke.push(puff)
  }
  return { view, smoke }
}
