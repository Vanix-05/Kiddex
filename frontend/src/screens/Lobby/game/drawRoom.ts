/**
 * Draws the classroom: the wooden floor with rugs and the Quiz Stage, the back
 * walls with their windows, chalkboard, banner and door, every piece of
 * furniture, and the low railing at the front. Positions come from room.ts.
 */
import { Container, Graphics, Matrix, Text } from 'pixi.js'
import { WALL, type Projection } from './projection'
import {
  CHAIR_BACK_DY,
  CHAIR_DX,
  CHAIR_FRONT_DY,
  CHAIR_SIZE,
  CUBBIES,
  DESK_GROUPS,
  DOOR_MAT,
  GARDEN,
  PLANT_SIZE,
  PLANTS,
  WHEEL,
  RD,
  RW,
  STAGE,
  STAR_BOARD,
  STAR_SHOP,
  TEACHER_DESK,
} from './room'
import { box, cylinder, flat, floorCircle, OUTLINE, shade, type Scene } from './scene'

/**
 * The Star Shop stall, a small sari-sari style shop: a back panel with 2 shelves
 * of boxes, a striped counter with a gold star, a cap, a bow and a jar of stars
 * on it, 2 posts holding a red and cream awning, and the yellow STAR SHOP sign.
 * The side facing the room is the right side (x1) when diagonal, the front (y1)
 * when straight. Buying is not built yet: the stall opens a Coming soon card.
 */
function drawStarShop(proj: Projection): Container {
  const { P, diag } = proj
  const view = new Container()
  const g = new Graphics()
  view.addChild(g)
  const s = STAR_SHOP
  const H = 46 // counter height (px)
  const x0 = s.x0
  const x1 = s.x1 + 0.15
  const y0 = s.y0 + 0.2
  const y1 = s.y1 - 0.2
  const stroke = (width: number) => ({ width, color: OUTLINE })

  // The back panel (light wood) against the wall, with 2 shelves of colorful boxes.
  box(g, proj, x0, y0, 0, 0.18, y1 - y0, 150, 0xdba26a, { top: 0xe8b882 })
  const boxColors = [0xef6f5e, 0x7fc4ea, 0xffc94d, 0xc9b6f0, 0x7dbf7a, 0xf0a050, 0xff9fbf]
  ;[74, 108].forEach((z, row) => {
    g.poly(flat(P(0.18, y0 + 0.1, z), P(0.18, y1 - 0.1, z), P(0.42, y1 - 0.1, z), P(0.42, y0 + 0.1, z)))
      .fill(0xa86c3a)
      .stroke(stroke(1.3))
    const count = row === 0 ? 4 : 3
    for (let i = 0; i < count; i++) {
      const y = y0 + 0.45 + ((y1 - y0 - 0.9) * (i + (row === 0 ? 0 : 0.5))) / (count - (row === 0 ? 1 : 0))
      const [X, Y] = P(0.3, y, z + 2)
      g.roundRect(X - 9, Y - 16, 18, 16, 5).fill(boxColors[(i + row * 4) % boxColors.length]).stroke(stroke(1.5))
    }
  })

  // The counter, with pale yellow stripes and a gold star on the side facing the room.
  box(g, proj, x0 + 0.2, y0, 0, x1 - x0 - 0.2, y1 - y0, H, 0xc98f5a, { top: 0xe8b882 })
  const stripes = diag ? 6 : 3
  for (let i = 0; i < stripes; i += 2) {
    if (diag) {
      const ya = y0 + ((y1 - y0) * i) / stripes
      const yb = y0 + ((y1 - y0) * (i + 1)) / stripes
      g.poly(flat(P(x1, ya, 6), P(x1, yb, 6), P(x1, yb, H - 8), P(x1, ya, H - 8))).fill({ color: 0xffe3a3, alpha: 0.85 })
    } else {
      const xa = x0 + 0.2 + ((x1 - x0 - 0.2) * i) / stripes
      const xb = x0 + 0.2 + ((x1 - x0 - 0.2) * (i + 1)) / stripes
      g.poly(flat(P(xa, y1, 6), P(xb, y1, 6), P(xb, y1, H - 8), P(xa, y1, H - 8))).fill({ color: 0xffe3a3, alpha: 0.85 })
    }
  }
  const [sx, sy] = diag ? P(x1, (y0 + y1) / 2, H / 2) : P((x0 + 0.2 + x1) / 2, y1, H / 2)
  g.star(sx, sy, 5, 13, 6).fill(0xffd34d).stroke(stroke(2))

  // On the counter: a red cap, a pink bow and a glass jar of gold stars.
  const onTop = (t: number) => (diag ? P(x0 + 0.55, y0 + (y1 - y0) * t, H) : P(x0 + 0.5, y0 + (y1 - y0) * t, H))
  const [cx, cy] = onTop(0.2)
  g.ellipse(cx, cy - 6, 12, 9).fill(0xef6f5e).stroke(stroke(1.6))
  g.ellipse(cx + 9, cy - 2, 8, 3).fill(0xd8584a).stroke(stroke(1.4))
  const [bx, by] = onTop(0.55)
  g.poly([bx - 13, by - 12, bx, by - 6, bx - 13, by]).fill(0xff9fbf).stroke(stroke(1.5))
  g.poly([bx + 13, by - 12, bx, by - 6, bx + 13, by]).fill(0xff9fbf).stroke(stroke(1.5))
  g.circle(bx, by - 6, 4).fill(0xff7fa8).stroke(stroke(1.4))
  const [jx, jy] = onTop(0.85)
  g.roundRect(jx - 10, jy - 26, 20, 26, 6).fill({ color: 0xe8f6ff, alpha: 0.9 }).stroke(stroke(1.6))
  g.star(jx - 3, jy - 10, 5, 5, 2.4).fill(0xffd34d)
  g.star(jx + 4, jy - 16, 5, 5, 2.4).fill(0xffd34d)
  g.star(jx + 1, jy - 5, 5, 4, 2).fill(0xffd34d)

  // 2 wooden posts at the front corners.
  const posts = diag
    ? [P(x1 + 0.05, y0, H), P(x1 + 0.05, y0, 128), P(x1 + 0.05, y1, H), P(x1 + 0.05, y1, 128)]
    : [P(x0 + 0.22, y1 + 0.05, H), P(x0 + 0.22, y1 + 0.05, 128), P(x1, y1 + 0.05, H), P(x1, y1 + 0.05, 128)]
  for (let i = 0; i < 4; i += 2) {
    g.moveTo(...posts[i]).lineTo(...posts[i + 1]).stroke(stroke(5))
    g.moveTo(...posts[i]).lineTo(...posts[i + 1]).stroke({ width: 3, color: 0xa86c3a })
  }

  // The red and cream striped awning, sloping from the wall down to the posts, with a scalloped front edge.
  const segs = 7
  for (let i = 0; i < segs; i++) {
    const ya = y0 - 0.15 + ((y1 - y0 + 0.3) * i) / segs
    const yb = y0 - 0.15 + ((y1 - y0 + 0.3) * (i + 1)) / segs
    const color = i % 2 ? 0xfff6e6 : 0xef6f5e
    g.poly(flat(P(x0, ya, 150), P(x0, yb, 150), P(x1 + 0.35, yb, 124), P(x1 + 0.35, ya, 124))).fill(color).stroke(stroke(1.6))
    const [mx, my] = P(x1 + 0.35, (ya + yb) / 2, 124)
    // Straight view: the scallops hang along the side; the front edge gets them below.
    if (diag) g.ellipse(mx, my + 3, 11, 6).fill(color).stroke(stroke(1.4))
  }
  if (!diag) {
    // The awning's front edge faces the room in the straight view.
    const n = 3
    for (let i = 0; i < n; i++) {
      const xa = x0 + ((x1 + 0.35 - x0) * i) / n
      const xb = x0 + ((x1 + 0.35 - x0) * (i + 1)) / n
      const za = 150 - (26 * (xa - x0)) / (x1 + 0.35 - x0)
      const zb = 150 - (26 * (xb - x0)) / (x1 + 0.35 - x0)
      const [ax, ay] = P(xa, y1 + 0.15, za)
      const [bx2, by2] = P(xb, y1 + 0.15, zb)
      g.ellipse((ax + bx2) / 2, (ay + by2) / 2 + 4, (bx2 - ax) / 2, 7).fill(i % 2 ? 0xfff6e6 : 0xef6f5e).stroke(stroke(1.4))
    }
  }

  // The yellow sign above the awning: a white star and STAR SHOP.
  // Straight view: it hangs at the back of the stall, so a Student at the counter (and their action button) doesn't cover it.
  const [tx, ty] = diag ? P(0.12, (y0 + y1) / 2, 168) : P(0.95, y0 + 0.3, 175)
  g.roundRect(tx - 70, ty - 20, 140, 34, 10).fill(0xffd34d).stroke(stroke(2.4))
  g.star(tx - 50, ty - 3, 5, 9, 4.2).fill(0xffffff).stroke(stroke(1.5))
  const label = new Text({ text: 'STAR SHOP', style: { fontFamily: 'Fredoka', fontWeight: '700', fontSize: 17, fill: 0x4a3426 }, resolution: 2 })
  label.anchor.set(0.5)
  label.position.set(tx + 12, ty - 3)
  view.addChild(label)
  return view
}

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
    beam(P(0, 12.6), P(0, 14.2), P(3.2, 15), P(3.2, 13.9))
  }
  beam(P(1.1, 0), P(2.7, 0), P(4.6, 3.3), P(3, 3.3))
  beam(P(12.4, 0), P(13.6, 0), P(15.4, 3.1), P(14.2, 3.1))

  // Rugs: Teacher's Desk, the pink one in front of the Star Shop (a welcome mat), Match Corner.
  const rug = (x: number, y: number, r: number, color: number) => {
    floorCircle(g, proj, x, y, r).fill(color).stroke({ width: 2.5, color: OUTLINE })
    floorCircle(g, proj, x, y, r - 0.5).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
  }
  rug(2.9, 2.5, 2.6, 0xf7d58a)
  rug(2.6, 10.9, 2.9, 0xffc9c4)
  rug(GARDEN.x, GARDEN.y, 3.0, 0xa8e2c5)
  const m = DOOR_MAT
  g.poly(flat(P(m.x0, m.y0), P(m.x1, m.y0), P(m.x1, m.y1), P(m.x0, m.y1))).fill(0x7dbf7a).stroke({ width: 2, color: OUTLINE })

  // The Quiz Stage: a low platform with lights along its front.
  const s = STAGE
  box(g, proj, s.x0, s.y0, 0, s.x1 - s.x0, s.y1 - s.y0, s.h, 0xb9a2e8, { top: 0xcdbaf3 })
  for (let i = 0; i < 6; i++) {
    const [X, Y] = P(s.x0 + 0.5 + i * 0.95, s.y1, s.h / 2)
    g.circle(X, Y, 3.2).fill(0xffd34d).stroke({ width: 1.5, color: OUTLINE })
  }
  const zs = s.h + 0.5
  g.poly(flat(P(s.x0 + 0.8, 0.6, zs), P(s.x1 - 0.8, 0.6, zs), P(s.x1 - 0.8, 2.4, zs), P(s.x0 + 0.8, 2.4, zs))).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })

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
  drawWindow(g, 12.5 * U, 1.0 * U, 62, 126)

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
  wallText(wall, 'Finish your mission, then spin the wheel!', u0 + 16, -65, 12, 0xd9f0e3, '400', 0)
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
  curtain(STAGE.x0 * U + 0.05 * U, 1)
  curtain(STAGE.x1 * U - 0.05 * U, -1)
  g.roundRect(STAGE.x0 * U, -WALL + 2, (STAGE.x1 - STAGE.x0) * U, 16, 4).fill(0xc9483c).stroke({ width: 2, color: OUTLINE })
  // The banner hangs high, so the Prize Wheel stands under it.
  const mid = ((STAGE.x0 + STAGE.x1) / 2) * U
  g.roundRect(mid - 1.8 * U, -130, 3.6 * U, 26, 8).fill(0xfff3d6).stroke({ width: 2.5, color: OUTLINE })
  wallText(wall, text.banner, mid, -117, 15, 0x5b3a22)

  // The green door to Outside.
  const d0 = DOOR_MAT.x0 * U
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
  drawWindow(g, u(14.2), 1.6 * U, 58, 122)

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
export function drawFurniture(scene: Scene, gardenStage: number): Furniture {
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

  // The Star Shop stall along the left wall (was the bookshelf).
  const shop = STAR_SHOP
  scene.add(drawStarShop(proj), shop.x0, shop.y0, shop.x1, shop.y1)

  // Quiz Stage: the Prize Wheel on its stand. The wheel's slices turn (see LobbyGame).
  const wheel = drawWheel(scene)

  // The Class Garden: a raised planter with the section's sampaguita, as big as the class has grown it.
  const gd = GARDEN
  prop(gd.solid.x0, gd.solid.y0, gd.solid.x1, gd.solid.y1, (g) => drawGarden(g, proj, gardenStage))

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
  return { wheel }
}

/** What the room animates: the Prize Wheel's slices. */
export interface Furniture {
  wheel: Container
}

export const WHEEL_COLORS = [0xef6f5e, 0xffd34d, 0x7fc4ea, 0x7dbf7a, 0xc9b6f0, 0xf0a050, 0xff9fb4, 0x6fcfc0]
const WHEEL_R = 36
const WHEEL_Z = STAGE.h + 62

/** The Prize Wheel standing at the back of the Quiz Stage. Returns the part that spins. */
function drawWheel(scene: Scene): Container {
  const { proj } = scene
  const { P } = proj
  const w = WHEEL
  const view = new Container()
  const stand = new Graphics()
  // A purple base on the stage, and two legs up to the hub.
  box(stand, proj, w.x - 0.55, w.y - 0.25, STAGE.h, 1.1, 0.5, 12, 0x9e85e0, { top: 0xbfaef0 })
  const [hx, hy] = P(w.x, w.y, WHEEL_Z)
  const [bx, by] = P(w.x, w.y, STAGE.h + 12)
  stand.poly([bx - 22, by - 2, bx - 14, by - 2, hx - 2, hy, hx - 6, hy]).fill(0xb98050).stroke({ width: 2, color: OUTLINE, join: 'round' })
  stand.poly([bx + 14, by - 2, bx + 22, by - 2, hx + 6, hy, hx + 2, hy]).fill(0xa86c3a).stroke({ width: 2, color: OUTLINE, join: 'round' })
  // Rim with bulbs.
  stand.circle(hx, hy, WHEEL_R + 9).fill(0xffc94d).stroke({ width: 2.5, color: OUTLINE })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    stand.circle(hx + Math.cos(a) * (WHEEL_R + 4.5), hy + Math.sin(a) * (WHEEL_R + 4.5), 2.6).fill(0xfff8e0)
  }
  view.addChild(stand)

  const slices = new Graphics()
  const n = WHEEL_COLORS.length
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    slices.moveTo(0, 0).arc(0, 0, WHEEL_R, a0, a1).lineTo(0, 0).fill(WHEEL_COLORS[i]).stroke({ width: 1.6, color: OUTLINE, join: 'round' })
    // A little star on every slice: every slice is a prize.
    const am = (a0 + a1) / 2
    slices.star(Math.cos(am) * WHEEL_R * 0.66, Math.sin(am) * WHEEL_R * 0.66, 5, 5, 2.4).fill(0xffffff)
  }
  slices.position.set(hx, hy)
  view.addChild(slices)

  const top = new Graphics()
  top.circle(hx, hy, 9).fill(0xfff3d6).stroke({ width: 2.2, color: OUTLINE })
  top.star(hx, hy, 5, 6, 3).fill(0xffc94d)
  // The pointer at the top.
  top.poly([hx - 9, hy - WHEEL_R - 14, hx + 9, hy - WHEEL_R - 14, hx, hy - WHEEL_R + 4]).fill(0xef5a4b).stroke({ width: 2.2, color: OUTLINE, join: 'round' })
  view.addChild(top)

  scene.add(view, w.solid.x0, w.solid.y0, w.solid.x1, w.solid.y1)
  return slices
}

/** How the garden looks at each stage, 0 (just planted) to 4 (in bloom). */
export const GARDEN_STAGES = 5

/** The Class Garden planter and its sampaguita. `stage`: 0..4. */
function drawGarden(g: Graphics, proj: Projection, stage: number) {
  const { P } = proj
  const gd = GARDEN
  const H = 26
  cylinder(g, proj, gd.x, gd.y, 0, gd.r, H, 0xd98a5c)
  // Soil.
  const [X, Y] = P(gd.x, gd.y, H)
  const [rx, ry] = proj.floorEllipse(gd.r - 0.12)
  g.ellipse(X, Y, rx, ry).fill(0x8a5a3a).stroke({ width: 1.6, color: OUTLINE })
  for (let i = 0; i < 9; i++) g.circle(X - rx * 0.7 + (i * rx * 1.4) / 8, Y + Math.sin(i * 1.7) * ry * 0.5, 1.6).fill(0x6e4428)
  // A little bamboo stake once it starts climbing.
  if (stage >= 2) {
    g.moveTo(X + 4, Y).lineTo(X + 4, Y - 52 - stage * 8).stroke({ width: 4, color: 0xc9a25a, cap: 'round' })
    g.moveTo(X + 1, Y - 24).lineTo(X + 7, Y - 24).moveTo(X + 1, Y - 44).lineTo(X + 7, Y - 44).stroke({ width: 1.4, color: OUTLINE })
  }
  // The shrub grows with the stage.
  const size = [0.45, 0.7, 0.95, 1.15, 1.3][Math.max(0, Math.min(4, stage))]
  const leaf = (lx: number, ly: number, a: number, len: number) => {
    const dx = Math.sin(a) * len
    const dy = -Math.cos(a) * len
    g.moveTo(lx, ly)
      .quadraticCurveTo(lx + dx * 0.2 - 7, ly + dy * 0.5, lx + dx, ly + dy)
      .quadraticCurveTo(lx + dx * 0.6 + 7, ly + dy * 0.4, lx, ly)
      .fill(0x6fbf5c)
      .stroke({ width: 1.8, color: 0x3f7a35, join: 'round' })
  }
  if (stage === 0) {
    leaf(X, Y - 2, -0.8, 16)
    leaf(X, Y - 2, 0.8, 16)
    g.moveTo(X, Y).lineTo(X, Y - 6).stroke({ width: 2, color: 0x3f7a35 })
    return
  }
  // Leafy clumps, more of them as it grows.
  const clumps: [number, number][] = [
    [0, -30],
    [-20, -22],
    [20, -24],
    [-10, -48],
    [12, -50],
    [0, -66],
    [-24, -42],
    [24, -44],
  ]
  const count = [0, 3, 5, 7, 8][stage]
  for (let i = 0; i < count; i++) {
    const [cx, cy] = clumps[i]
    const ox = X + cx * size
    const oy = Y + cy * size
    g.circle(ox, oy, 15 * size + 4).fill(0x5fae4e).stroke({ width: 1.8, color: 0x3f7a35 })
    leaf(ox - 4, oy + 2, -0.9, 14 * size + 6)
    leaf(ox + 4, oy + 2, 0.9, 14 * size + 6)
  }
  // Buds (stage 3) and white sampaguita flowers (stage 4).
  if (stage >= 3) {
    const spots: [number, number][] = [
      [-16, -30],
      [14, -36],
      [-4, -56],
      [20, -58],
      [-22, -52],
      [4, -72],
      [-8, -36],
    ]
    for (const [fx, fy] of spots) {
      const px = X + fx * size
      const py = Y + fy * size
      if (stage === 3) g.circle(px, py, 3.2).fill(0xfffbef).stroke({ width: 1.2, color: OUTLINE })
      else {
        g.star(px, py, 5, 7.5, 3.4).fill(0xffffff).stroke({ width: 1.3, color: OUTLINE, join: 'round' })
        g.circle(px, py, 2).fill(0xffd34d)
      }
    }
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
