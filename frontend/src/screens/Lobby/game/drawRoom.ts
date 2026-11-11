/**
 * Draws the classroom: the wooden floor with rugs and the Quiz Stage, the back
 * walls with their windows, chalkboard, banner and door, every piece of
 * furniture, and the low railing at the front. Positions come from room.ts.
 */
import { Container, Graphics, Matrix, Text } from 'pixi.js'
import { WALL, type Projection } from './projection'
import {
  BEAN_BAGS,
  BOOKSHELF,
  CHAIR_BACK_DY,
  CHAIR_DX,
  CHAIR_FRONT_DY,
  CHAIR_SIZE,
  CUBBIES,
  DESK_GROUPS,
  DOOR_MAT,
  MATCH_TABLE,
  PLANT_SIZE,
  PLANTS,
  PODIUM,
  RD,
  RW,
  STAGE,
  STAR_BOARD,
  TEACHER_DESK,
} from './room'
import { box, cylinder, flat, floorCircle, OUTLINE, shade, type Scene } from './scene'

/** The words on the walls. */
export interface RoomText {
  /** Chalkboard, big line. */
  hello: string
  /** Chalkboard, second line. */
  today: string
  /** The banner over the Quiz Stage. */
  banner: string
}

const CHAIR_COLORS = [0x7fc4ea, 0x7dbf7a, 0xef8a7e, 0xffc94d]
const BOOK_COLORS = [0xef6f5e, 0x7fc4ea, 0x7dbf7a, 0xffc94d]
const FLAG_COLORS = [0xef6f5e, 0xffd34d, 0x7dbf7a, 0x7fc4ea, 0xc9b6f0, 0xf0a050]

// ---------- Floor ----------

/** The floor, rugs, door mat and Quiz Stage. Static: one container to cache. */
export function drawFloor({ proj, layers }: Scene): Container {
  const { P, diag } = proj
  const view = new Container()

  const g = new Graphics()
  // The floor's thickness along the front edges.
  g.poly(flat(P(0, RD), P(RW, RD), P(RW, RD, -16), P(0, RD, -16))).fill(0xb87a45).stroke({ width: 2.2, color: OUTLINE })
  g.poly(flat(P(RW, 0), P(RW, RD), P(RW, RD, -16), P(RW, 0, -16))).fill(0xa86c3a).stroke({ width: 2.2, color: OUTLINE })
  g.poly(flat(P(0, 0), P(RW, 0), P(RW, RD), P(0, RD))).fill(0xeab77a)
  // Planks run along x.
  const line = { width: 1.4, color: 0xc98f55, alpha: 0.75 }
  for (let y = 0, row = 0; y < RD; y += 0.5, row++) {
    if (row % 2) g.poly(flat(P(0, y), P(RW, y), P(RW, y + 0.5), P(0, y + 0.5))).fill({ color: 0xe2ad6f, alpha: 0.8 })
    g.moveTo(...P(0, y)).lineTo(...P(RW, y)).stroke(line)
    for (let x = (row % 3) * 1.3 + 0.6; x < RW; x += 3.9) g.moveTo(...P(x, y)).lineTo(...P(x, y + 0.5)).stroke(line)
  }
  g.poly(flat(P(0, 0), P(RW, 0), P(RW, RD), P(0, RD))).stroke({ width: 2.5, color: OUTLINE })

  // Sun patches from the windows.
  const beam = (...corners: [number, number][]) => g.poly(flat(...corners)).fill({ color: 0xfff6d6, alpha: 0.28 })
  if (diag) {
    beam(P(0, 0.9), P(0, 2.5), P(3.4, 4.3), P(3.4, 2.7))
    beam(P(0, 11.5), P(0, 13.2), P(3.2, 14), P(3.2, 12.9))
  }
  beam(P(1.1, 0), P(2.7, 0), P(4.6, 3.3), P(3, 3.3))
  beam(P(11.2, 0), P(12.3, 0), P(14.1, 3.1), P(13, 3.1))

  // Rugs: Teacher's Desk, Word Nook, Match Corner.
  const rug = (x: number, y: number, r: number, color: number) => {
    floorCircle(g, proj, x, y, r).fill(color).stroke({ width: 2.5, color: OUTLINE })
    floorCircle(g, proj, x, y, r - 0.5).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
  }
  rug(2.9, 2.5, 2.6, 0xf7d58a)
  rug(2.6, 10.4, 2.9, 0xffc9c4)
  rug(MATCH_TABLE.x, MATCH_TABLE.y, 3.1, 0xa8e2c5)
  const m = DOOR_MAT
  g.poly(flat(P(m.x0, m.y0), P(m.x1, m.y0), P(m.x1, m.y1), P(m.x0, m.y1))).fill(0x7dbf7a).stroke({ width: 2, color: OUTLINE })

  // The Quiz Stage: a low platform with lights along its front.
  const s = STAGE
  box(g, proj, s.x0, s.y0, 0, s.x1 - s.x0, s.y1 - s.y0, s.h, 0xb9a2e8, { top: 0xcdbaf3 })
  for (let i = 0; i < 6; i++) {
    const [X, Y] = P(13.3 + i * 0.95, s.y1, s.h / 2)
    g.circle(X, Y, 3.2).fill(0xffd34d).stroke({ width: 1.5, color: OUTLINE })
  }
  const zs = s.h + 0.5
  g.poly(flat(P(13.6, 0.6, zs), P(17.8, 0.6, zs), P(17.8, 2.4, zs), P(13.6, 2.4, zs))).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })

  view.addChild(g)
  layers.floor.addChild(view)
  return view
}

// ---------- Walls ----------

/** The back walls with everything hanging on them. Static: one container to cache. */
export function drawWalls({ proj, layers }: Scene, text: RoomText): Container {
  const { P, diag, unit: U } = proj
  const view = new Container()
  const t = 0.3 // wall thickness in tiles

  // In the diagonal view the left wall stands too; front-on, only the back wall.
  for (const side of diag ? (['left', 'back'] as const) : (['back'] as const)) {
    const wall = new Container()
    // Wall-local px: u runs along the wall, y is 0 at the floor and -WALL at the top.
    if (side === 'back') {
      const [X, Y] = P(0, 0)
      wall.setFromMatrix(new Matrix(1, diag ? 0.5 : 0, 0, 1, X, Y))
    } else {
      const [X, Y] = P(0, RD)
      wall.setFromMatrix(new Matrix(1, -0.5, 0, 1, X, Y))
    }
    const len = (side === 'back' ? RW : RD) * U
    const paper = side === 'back' ? 0xfdf0dc : 0xf4e2c8
    const panel = side === 'back' ? 0xdca46a : 0xcf955c
    const g = new Graphics()
    g.rect(0, -WALL, len, WALL).fill(paper)
    for (let u = 14; u < len; u += 28) g.moveTo(u, -WALL + 6).lineTo(u, -54).stroke({ width: 1.2, color: 0xe9d3b4, alpha: 0.8 })
    g.rect(0, -52, len, 52).fill(panel)
    for (let u = 16; u < len; u += 16) g.moveTo(u, -50).lineTo(u, 0).stroke({ width: 1.2, color: shade(panel, -0.12) })
    g.rect(0, -56, len, 7).fill(shade(panel, -0.08)).stroke({ width: 2, color: OUTLINE })
    g.rect(0, -WALL, len, WALL).stroke({ width: 2.5, color: OUTLINE })
    wall.addChild(g)
    if (side === 'back') decorateBackWall(wall, U, text)
    else decorateLeftWall(wall, U)
    drawBunting(wall, len)
    view.addChild(wall)
  }

  // The walls' top edge (their thickness).
  const caps = new Graphics()
  const stroke = { width: 2.2, color: OUTLINE, join: 'round' } as const
  if (diag) {
    caps.poly(flat(P(-t, -t, WALL), P(RW, -t, WALL), P(RW, 0, WALL), P(0, 0, WALL), P(0, RD, WALL), P(-t, RD, WALL))).fill(0xc98f5a).stroke(stroke)
    caps.poly(flat(P(0, RD, 0), P(-t, RD, 0), P(-t, RD, WALL), P(0, RD, WALL))).fill(0xd7a06a).stroke(stroke)
    caps.poly(flat(P(RW, 0, 0), P(RW, -t, 0), P(RW, -t, WALL), P(RW, 0, WALL))).fill(0xb98050).stroke(stroke)
  } else {
    caps.poly(flat(P(-0.16, -t, WALL), P(RW + 0.16, -t, WALL), P(RW + 0.16, 0, WALL), P(-0.16, 0, WALL))).fill(0xc98f5a).stroke(stroke)
  }
  view.addChild(caps)

  layers.walls.addChild(view)
  return view
}

function wallText(wall: Container, text: string, x: number, y: number, size: number, color: number, weight: '400' | '500' | '600' | '700' = '700', anchorX = 0.5) {
  const t = new Text({ text, style: { fontFamily: 'Fredoka', fontWeight: weight, fontSize: size, fill: color }, resolution: 2 })
  t.anchor.set(anchorX, 0.5)
  t.position.set(x, y)
  wall.addChild(t)
}

/** A window looking out at the sea: u = left edge, w = width, z0..z1 = height above the floor. */
function drawWindow(g: Graphics, u: number, w: number, z0: number, z1: number) {
  const h = z1 - z0
  g.roundRect(u - 4, -z1 - 4, w + 8, h + 8, 6).fill(0xffffff).stroke({ width: 2.5, color: OUTLINE })
  g.rect(u, -z1, w, h * 0.58).fill(0xbfe8f7)
  g.rect(u, -z1 + h * 0.58, w, h * 0.42).fill(0x6cc3e2)
  g.moveTo(u, -z1 + h * 0.58).lineTo(u + w, -z1 + h * 0.58).stroke({ width: 1.5, color: 0x4aa8cc })
  g.ellipse(u + w * 0.3, -z1 + h * 0.26, w * 0.14, 5).fill(0xffffff)
  g.ellipse(u + w * 0.42, -z1 + h * 0.22, w * 0.1, 6).fill(0xffffff)
  g.moveTo(u + w / 2, -z1).lineTo(u + w / 2, -z0).moveTo(u, -z1 + h / 2).lineTo(u + w, -z1 + h / 2).stroke({ width: 5, color: 0xffffff })
  g.rect(u, -z1, w, h).stroke({ width: 2, color: OUTLINE })
  g.roundRect(u - 8, -z0 + 2, w + 16, 8, 3).fill(0xffffff).stroke({ width: 2, color: OUTLINE })
}

function decorateBackWall(wall: Container, U: number, text: RoomText) {
  const g = new Graphics()
  wall.addChild(g)
  drawWindow(g, 1.2 * U, 1.4 * U, 62, 126)
  drawWindow(g, 11.25 * U, 1.0 * U, 62, 126)

  // The green chalkboard.
  const u0 = 4.6 * U
  const w = 6.1 * U
  g.roundRect(u0 - 6, -132, w + 12, 86, 6).fill(0xb98050).stroke({ width: 2.5, color: OUTLINE })
  g.rect(u0, -126, w, 74).fill(0x3f7a5a).stroke({ width: 2, color: 0x2c5a41 })
  g.rect(u0 + w * 0.1, -50, w * 0.8, 6).fill(0xb98050).stroke({ width: 2, color: OUTLINE })
  g.rect(u0 + 30, -53, 14, 3).fill(0xffffff)
  g.rect(u0 + 52, -53, 10, 3).fill(0xffd34d)
  wallText(wall, text.hello, u0 + 16, -101, 21, 0xffffff, '600', 0)
  wallText(wall, text.today, u0 + 16, -81, 14, 0xffe59a, '500', 0)
  wallText(wall, 'Walk to a game corner to play!', u0 + 16, -65, 12, 0xd9f0e3, '400', 0)
  // A chalk sun.
  const sun = new Graphics()
  const sx = u0 + w - 34
  const sy = -96
  sun.circle(sx, sy, 11)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    sun.moveTo(sx + Math.cos(a) * 15, sy + Math.sin(a) * 15).lineTo(sx + Math.cos(a) * 20, sy + Math.sin(a) * 20)
  }
  sun.stroke({ width: 2, color: 0xffe59a })
  wall.addChild(sun)

  // Quiz Stage: curtains, a valance and the section banner.
  const curtain = (u: number, dir: 1 | -1) => {
    g.poly([u, -WALL + 8, u + 30 * dir, -WALL + 8, u + 22 * dir, -14, u + 4 * dir, -6]).fill(0xef6f5e).stroke({ width: 2.2, color: OUTLINE, join: 'round' })
    for (let k = 1; k < 3; k++) {
      g.moveTo(u + k * 9 * dir, -WALL + 12).lineTo(u + k * 7 * dir + 2 * dir, -14).stroke({ width: 1.5, color: 0xc9483c })
    }
  }
  curtain(12.85 * U, 1)
  curtain(18.55 * U, -1)
  g.roundRect(12.8 * U, -WALL + 2, 5.8 * U, 16, 4).fill(0xc9483c).stroke({ width: 2, color: OUTLINE })
  g.roundRect(13.9 * U, -112, 3.6 * U, 30, 8).fill(0xfff3d6).stroke({ width: 2.5, color: OUTLINE })
  wallText(wall, text.banner, 15.7 * U, -97, 16, 0x5b3a22)

  // The green door to Outside.
  const d0 = 19.5 * U
  const dw = 1.45 * U
  g.roundRect(d0 - 6, -118, dw + 12, 118, 6).fill(0xffffff).stroke({ width: 2.5, color: OUTLINE })
  g.rect(d0, -112, dw, 112).fill(0x6fbf6c).stroke({ width: 2.2, color: OUTLINE })
  g.roundRect(d0 + 10, -100, dw - 20, 34, 5).fill(0xbfe8f7).stroke({ width: 2, color: OUTLINE })
  g.rect(d0 + 10, -56, dw - 20, 36).stroke({ width: 2, color: 0x4f9a54 })
  g.circle(d0 + dw - 12, -52, 4.5).fill(0xffd34d).stroke({ width: 2, color: OUTLINE })
}

function decorateLeftWall(wall: Container, U: number) {
  const g = new Graphics()
  wall.addChild(g)
  // On the left wall, u grows toward the back corner.
  const u = (y: number) => (RD - y) * U
  drawWindow(g, u(2.5), 1.6 * U, 62, 126)
  drawWindow(g, u(13.2), 1.6 * U, 58, 122)

  // A cork board with pinned notes.
  const b0 = u(STAR_BOARD.y1)
  const bw = (STAR_BOARD.y1 - STAR_BOARD.y0) * U
  g.roundRect(b0, -128, bw, 64, 6).fill(0xd9a86c).stroke({ width: 2.5, color: OUTLINE })
  g.rect(b0 + 6, -122, bw - 12, 52).fill(0xe8c08a)
  for (const [x, y, color] of [
    [14, -114, 0xffe59a],
    [52, -110, 0xc9e7fa],
    [92, -116, 0xffc9c4],
    [30, -92, 0xc9f0d9],
    [70, -94, 0xe4d6fa],
    [110, -92, 0xffe59a],
  ]) {
    g.rect(b0 + x, y, 26, 20).fill(color).stroke({ width: 1.5, color: OUTLINE })
    g.circle(b0 + x + 13, y + 2, 2.5).fill(0xef6f5e)
  }
  g.roundRect(b0 + bw / 2 - 52, -142, 104, 20, 6).fill(0xfff3d6).stroke({ width: 2, color: OUTLINE })
  wallText(wall, '★ Star Students', b0 + bw / 2, -132, 13, 0xc9762c)

  // ABC strip.
  const tiles = [0xffc9c4, 0xffe59a, 0xc9f0d9, 0xc9e7fa, 0xe4d6fa, 0xffd8b0]
  'ABCDEF'.split('').forEach((letter, i) => {
    const x = u(11.0) + i * 22
    g.roundRect(x, -146, 18, 18, 4).fill(tiles[i]).stroke({ width: 1.6, color: OUTLINE })
    wallText(wall, letter, x + 9, -137, 12, 0x5b3a22)
  })
}

function drawBunting(wall: Container, len: number) {
  const g = new Graphics()
  for (let u = 10, i = 0; u < len - 20; u += 30, i++) {
    g.poly([u, -WALL + 6 + Math.sin(u * 0.05) * 2, u + 22, -WALL + 7 + Math.sin(u * 0.05 + 1) * 2, u + 11, -WALL + 26])
      .fill(FLAG_COLORS[i % FLAG_COLORS.length])
      .stroke({ width: 1.6, color: OUTLINE, join: 'round' })
  }
  g.moveTo(0, -WALL + 6).lineTo(len, -WALL + 6).stroke({ width: 1.6, color: OUTLINE })
  wall.addChild(g)
}

// ---------- Furniture ----------

/** Every piece of furniture, each one depth-sorted on its own footprint. */
export function drawFurniture(scene: Scene) {
  const { proj } = scene
  const { P, diag } = proj
  const prop = (x0: number, y0: number, x1: number, y1: number, draw: (g: Graphics) => void) => {
    const g = new Graphics()
    draw(g)
    scene.add(g, x0, y0, x1, y1)
  }

  // Teacher's Desk, with books, a paper and an apple.
  const td = TEACHER_DESK
  prop(td.x0, td.y0, td.x1, td.y1, (g) => {
    box(g, proj, td.x0, td.y0, 0, td.x1 - td.x0, td.y1 - td.y0, 36, 0xc0824a, { top: 0xd99d62 })
    box(g, proj, 1.9, 2.15, 36, 0.55, 0.4, 12, 0x7fc4ea)
    box(g, proj, 1.92, 2.17, 48, 0.5, 0.36, 8, 0xef6f5e)
    const [ax, ay] = P(3.4, 2.3, 44)
    g.circle(ax, ay, 7).fill(0xef5a4b).stroke({ width: 2, color: OUTLINE })
    g.moveTo(ax, ay - 7).lineTo(ax + 2, ay - 12).stroke({ width: 2, color: OUTLINE })
    const [px, py] = P(2.9, 2.5, 37)
    g.poly([px - 14, py, px, py - 7, px + 14, py, px, py + 7]).fill(0xfffaf0).stroke({ width: 1.5, color: OUTLINE })
  })

  // Word Nook: a bookshelf along the left wall, and bean bags.
  const bs = BOOKSHELF
  prop(bs.x0, bs.y0, bs.x1, bs.y1, (g) => {
    box(g, proj, bs.x0, bs.y0, 0, bs.x1 - bs.x0, bs.y1 - bs.y0, 92, 0xc98f5a, { top: 0xdba26a })
    const colors = [0xef6f5e, 0x7fc4ea, 0xffc94d, 0x7dbf7a, 0xc9b6f0, 0xf0a050, 0xffffff]
    for (let row = 0; row < 3; row++) {
      const z = 10 + row * 28
      // The books show on the side facing the room: the right side when
      // diagonal, the front when straight (where only 3 fit).
      for (let i = 0; i < (diag ? 9 : 3); i++) {
        const h = 16 + ((i * 7 + row * 3) % 6)
        const y = 8.15 + i * 0.31
        const x = 0.06 + i * 0.22
        const book = diag
          ? flat(P(bs.x1, y, z), P(bs.x1, y + 0.24, z), P(bs.x1, y + 0.24, z + h), P(bs.x1, y, z + h))
          : flat(P(x, bs.y1, z), P(x + 0.18, bs.y1, z), P(x + 0.18, bs.y1, z + h), P(x, bs.y1, z + h))
        g.poly(book).fill(colors[(i + row * 2) % colors.length]).stroke({ width: 1.3, color: OUTLINE })
      }
      const shelf = diag
        ? flat(P(bs.x1, bs.y0, z - 2), P(bs.x1, bs.y1, z - 2), P(bs.x1, bs.y1, z), P(bs.x1, bs.y0, z))
        : flat(P(bs.x0, bs.y1, z - 2), P(bs.x1, bs.y1, z - 2), P(bs.x1, bs.y1, z), P(bs.x0, bs.y1, z))
      g.poly(shelf).fill(0xa86c3a)
    }
  })
  for (const bag of BEAN_BAGS) {
    prop(bag.x - 0.4, bag.y - 0.4, bag.x + 0.4, bag.y + 0.4, (g) => {
      const [X, Y] = P(bag.x, bag.y)
      g.ellipse(X, Y - 10, 30, 19).fill(bag.color).stroke({ width: 2.2, color: OUTLINE })
      g.ellipse(X - 6, Y - 18, 12, 6).fill({ color: 0xffffff, alpha: 0.45 })
    })
  }

  // Quiz Stage: a podium with a star and a microphone, standing on the stage.
  const pd = PODIUM
  prop(pd.x0, pd.y0, pd.x1, pd.y1, (g) => {
    box(g, proj, pd.x0, pd.y0, STAGE.h, pd.x1 - pd.x0, pd.y1 - pd.y0, 46, 0x9e85e0, { top: 0xbfaef0 })
    const [sx, sy] = P(15.65, pd.y1, 36)
    g.star(sx, sy, 5, 10, 5).fill(0xffd34d).stroke({ width: 1.8, color: OUTLINE })
    const [mx, my] = P(15.6, 0.95, 66)
    g.moveTo(mx, my).lineTo(mx, my - 20).stroke({ width: 3, color: OUTLINE })
    g.circle(mx, my - 24, 6).fill(0x5b3a22)
  })

  // Match Corner: a round table with blocks.
  const mt = MATCH_TABLE
  prop(mt.solid.x0, mt.solid.y0, mt.solid.x1, mt.solid.y1, (g) => {
    cylinder(g, proj, mt.x, mt.y, 0, mt.r, 22, 0xe7c08c)
    const [X, Y] = P(mt.x, mt.y)
    for (const [a, b, color] of [
      [-18, -30, 0x7fc4ea],
      [-2, -36, 0xef6f5e],
      [14, -30, 0xffc94d],
      [-6, -48, 0x7dbf7a],
    ]) {
      g.rect(X + a, Y + b, 14, 12).fill(color).stroke({ width: 1.6, color: OUTLINE })
      g.rect(X + a, Y + b, 14, 4).fill({ color: 0xffffff, alpha: 0.35 })
    }
  })

  DESK_GROUPS.forEach((group, k) => drawDeskGroup(scene, group.x, group.y, k))

  // Cubbies under the cork board.
  const cb = CUBBIES
  prop(cb.x0, cb.y0, cb.x1, cb.y1, (g) => {
    box(g, proj, cb.x0, cb.y0, 0, cb.x1 - cb.x0, cb.y1 - cb.y0, 40, 0xc98f5a, { top: 0xdba26a })
    const door = { width: 1.5, color: OUTLINE }
    if (!diag) {
      g.poly(flat(P(0.08, cb.y1, 6), P(0.47, cb.y1, 6), P(0.47, cb.y1, 32), P(0.08, cb.y1, 32))).fill(0xffc9c4).stroke(door)
      return
    }
    const colors = [0xffc9c4, 0xc9e7fa, 0xc9f0d9, 0xffe59a]
    for (let i = 0; i < 4; i++) {
      const y = cb.y0 + 0.12 + i * 0.68
      g.poly(flat(P(cb.x1, y, 6), P(cb.x1, y + 0.55, 6), P(cb.x1, y + 0.55, 32), P(cb.x1, y, 32))).fill(colors[i]).stroke(door)
    }
  })

  for (const p of PLANTS) {
    prop(p.x, p.y, p.x + PLANT_SIZE, p.y + PLANT_SIZE, (g) => drawPlant(g, proj, p.x, p.y, p.big))
  }
}

/** 4 desks pushed together, with 2 chairs behind and 2 in front. */
function drawDeskGroup(scene: Scene, cx: number, cy: number, k: number) {
  const { proj } = scene
  const { P } = proj
  const chair = (x: number, y: number, color: number, backrestDy: number) => {
    const g = new Graphics()
    box(g, proj, x, y, 0, CHAIR_SIZE, CHAIR_SIZE, 16, color)
    box(g, proj, x, y + backrestDy, 16, CHAIR_SIZE, 0.08, 22, color)
    scene.add(g, x, y, x + CHAIR_SIZE, y + CHAIR_SIZE)
  }
  // Chairs behind the desks: backrest on the far side, so sitters face the room.
  CHAIR_DX.forEach((dx, i) => chair(cx + dx, cy + CHAIR_BACK_DY, CHAIR_COLORS[(k + i) % 4], 0))
  ;[
    [0, 0],
    [1.05, 0],
    [0, 0.75],
    [1.05, 0.75],
  ].forEach(([dx, dy], i) => {
    const x = cx + dx
    const y = cy + dy
    const g = new Graphics()
    box(g, proj, x, y, 24, 1, 0.7, 7, 0xe7c08c, { top: 0xf6dcb4 })
    for (const [lx, ly] of [
      [0.06, 0.06],
      [0.86, 0.56],
      [0.86, 0.06],
      [0.06, 0.56],
    ]) {
      box(g, proj, x + lx, y + ly, 0, 0.08, 0.08, 24, 0xb98050)
    }
    // A book and a pencil on top.
    const [bx, by] = P(x + 0.35 + (i % 2) * 0.2, y + 0.3, 31)
    g.poly([bx - 12, by, bx, by - 6, bx + 12, by, bx, by + 6]).fill(BOOK_COLORS[(i + k) % 4]).stroke({ width: 1.5, color: OUTLINE })
    g.moveTo(bx + 4, by + 9).lineTo(bx + 18, by + 2).stroke({ width: 3, color: 0xffc94d, cap: 'round' })
    scene.add(g, x, y, x + 1, y + 0.7)
  })
  CHAIR_DX.forEach((dx, i) => chair(cx + dx, cy + CHAIR_FRONT_DY, CHAIR_COLORS[(k + 2 + i) % 4], 0.34))
}

function drawPlant(g: Graphics, { P }: Projection, x: number, y: number, big: boolean) {
  const [X, Y] = P(x + PLANT_SIZE / 2, y + PLANT_SIZE / 2)
  g.ellipse(X, Y + 2, 20, 8).fill({ color: 0x5b3a22, alpha: 0.15 })
  g.poly([X - 15, Y - 26, X + 15, Y - 26, X + 11, Y, X - 11, Y]).fill(0xe98a5c).stroke({ width: 2.2, color: OUTLINE, join: 'round' })
  g.rect(X - 17, Y - 31, 34, 7).fill(0xf4a676).stroke({ width: 2.2, color: OUTLINE })
  const s = big ? 1.25 : 1
  for (const [a, len] of [
    [-0.9, 30],
    [-0.3, 40],
    [0.3, 38],
    [0.9, 28],
    [0, 46],
  ]) {
    const dx = Math.sin(a) * len * s
    const dy = -Math.cos(a) * len * s - 30
    g.moveTo(X, Y - 30)
      .quadraticCurveTo(X + dx * 0.2 - 9, Y - 44 + dy * 0.2, X + dx, Y + dy)
      .quadraticCurveTo(X + dx * 0.7 + 8, Y - 30 + (dy + 30) * 0.4, X, Y - 30)
      .fill(0x6fbf5c)
      .stroke({ width: 2, color: 0x3f7a35, join: 'round' })
  }
}

// ---------- Railing ----------

/** The low wooden railing along the front edges, in 1-tile pieces so depth sorting stays right. */
export function drawRailing(scene: Scene) {
  const { proj } = scene
  const h = 30
  const t = 0.16
  const post = h + 8
  const piece = (x: number, y: number, w: number, d: number, height: number, color: number, top?: number) => {
    const g = new Graphics()
    box(g, proj, x, y, 0, w, d, height, color, top === undefined ? {} : { top })
    return g
  }
  for (let x = 0; x < RW; x++) scene.add(piece(x, RD, 1, t, h, 0xd28f52, 0xe9b077), x, RD, x + 1, RD + t)
  for (let y = 0; y < RD; y++) scene.add(piece(RW, y, t, 1, h, 0xc0824a, 0xe9b077), RW, y, RW + t, y + 1)
  scene.add(piece(RW, RD, t, t, post, 0xb07a4a), RW, RD, RW + t, RD + t)
  for (let x = 0; x <= RW; x += 2) scene.add(piece(x, RD - 0.02, 0.2, 0.2, post, 0xb07a4a, 0xd99d62), x, RD, x + 0.2, RD + 0.2)
  for (let y = 0; y <= RD; y += 2) scene.add(piece(RW - 0.02, y, 0.2, 0.2, post, 0xa86c3a, 0xd99d62), RW, y, RW + 0.2, y + 0.2)
  if (proj.diag) return
  // Straight view: the left side is a low railing too, so nothing on the floor is hidden.
  for (let y = 0; y < RD; y++) scene.add(piece(-t, y, t, 1, h, 0xc0824a, 0xe9b077), -t, y, 0, y + 1)
  for (let y = 0; y <= RD; y += 2) scene.add(piece(-t - 0.02, y, 0.2, 0.2, post, 0xa86c3a, 0xd99d62), -t - 0.02, y, 0.18 - t, y + 0.2)
  scene.add(piece(-t, RD, t, t, post, 0xb07a4a), -t, RD, 0, RD + t)
}
