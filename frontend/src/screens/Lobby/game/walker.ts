/**
 * A kid and their buddy in the room: walking (keys or a path), sitting, and
 * following. The buddy trails about 0.85 tiles behind and stops when the kid
 * stops. All motion is done here in Pixi (bob, breathing, flip, shadow); the
 * pictures themselves never change.
 */
import { Container, Graphics, Rectangle, Sprite, type Texture } from 'pixi.js'
import type { DepthItem } from './depth'
import { findPath, type Point } from './pathfind'
import type { Projection } from './projection'
import { floorHeight, isFree, RD, SEATS, WANDER_SPOTS, type Seat } from './room'
import type { Scene } from './scene'

/** A character picture as a Pixi texture, with where its feet are. */
export interface FigureArt {
  texture: Texture
  anchorX: number
  anchorY: number
  /** Top of the head to the feet, in texture px. */
  bodyPx: number
}

/** Head-to-feet height on screen at zoom 1, in px. */
const KID_BODY = 86
const BUDDY_BODY = 56
const BUDDY_GAP = 0.85
const TRAIL_STEP = 0.08
const TRAIL_MAX = 60
const JUMP_S = 0.5

/** Who sits where. Shared by everyone in the room. */
export type SeatBook = Map<Seat, Walker>

/** One drawn character: the kid or the buddy. */
export interface Figure {
  view: Container
  body: Sprite
  shadow: Graphics
  art: FigureArt
  /** Scale that makes the body its on-screen height. */
  base: number
  x: number
  y: number
  /** Height above the floor in px (the Quiz Stage, a seat). */
  z: number
  phase: number
  /** 1 = facing right, -1 = left. */
  face: 1 | -1
  moving: boolean
  /** Seconds left of a happy jump. */
  jump: number
  /** World px of the top of the head, for bubbles. */
  topX: number
  topY: number
  item: DepthItem | null
}

function makeFigure(art: FigureArt, bodyHeight: number, shadowRx: number, shadowRy: number): Figure {
  const view = new Container()
  const shadow = new Graphics().ellipse(0, 0, shadowRx, shadowRy).fill({ color: 0x4a2c17, alpha: 0.18 })
  const body = new Sprite(art.texture)
  body.anchor.set(art.anchorX, art.anchorY)
  body.eventMode = 'static'
  body.cursor = 'pointer'
  // Taps count on the body, not on the picture's empty corners (a buddy stands close to its kid).
  const { width, height } = art.texture
  body.hitArea = new Rectangle(-width * 0.28, -height * art.anchorY, width * 0.56, height * art.anchorY)
  view.addChild(shadow, body)
  return {
    view,
    body,
    shadow,
    art,
    base: bodyHeight / art.bodyPx,
    x: 0,
    y: 0,
    z: 0,
    phase: Math.random() * 6,
    face: 1,
    moving: false,
    jump: 0,
    topX: 0,
    topY: 0,
    item: null,
  }
}

/** The point `dist` tiles back along a trail (newest point last). */
function trailPoint(trail: readonly Point[], dist: number): Point {
  let walked = 0
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i]
    const b = trail[i - 1]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (walked + d >= dist) {
      const k = (dist - walked) / d
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
    walked += d
  }
  return trail[0]
}

export interface WalkerOptions {
  id: string
  /** The logged-in Student: walks with the keys and has a ring under their feet. */
  you: boolean
  /** Tiles per second. */
  speed: number
  kid: FigureArt
  buddy: FigureArt
  seats: SeatBook
  onTapKid: () => void
  onTapBuddy: () => void
}

export class Walker {
  readonly id: string
  readonly you: boolean
  readonly kid: Figure
  readonly buddy: Figure
  speed: number
  /** The kid's place on the floor (the buddy has its own in `buddy`). */
  x = 0
  y = 0
  seat: Seat | null = null
  /** A classmate walking with someone follows this walker. */
  leader: Walker | null = null
  /** Seconds until a classmate picks something new to do. */
  wait = 2 + Math.random() * 4
  private path: Point[] = []
  private onArrive: (() => void) | null = null
  private trail: Point[] = []
  private seats: SeatBook

  constructor(o: WalkerOptions) {
    this.id = o.id
    this.you = o.you
    this.speed = o.speed
    this.seats = o.seats
    this.kid = makeFigure(o.kid, KID_BODY, 24, 9)
    this.buddy = makeFigure(o.buddy, BUDDY_BODY, 18, 7)
    if (o.you) {
      const ring = new Graphics().ellipse(0, 0, 30, 12).stroke({ width: 3, color: 0xf0a050, alpha: 0.9 })
      this.kid.view.addChildAt(ring, 0)
    }
    this.kid.body.on('pointertap', (e) => {
      e.stopPropagation()
      o.onTapKid()
    })
    this.buddy.body.on('pointertap', (e) => {
      e.stopPropagation()
      o.onTapBuddy()
    })
  }

  /** Puts both figures into a (re)built scene. They keep their places. */
  attach(scene: Scene) {
    this.kid.item = scene.add(this.kid.view, this.x, this.y)
    this.buddy.item = scene.add(this.buddy.view, this.buddy.x, this.buddy.y)
  }

  /** Takes both figures out of the scene without destroying them (before a rebuild). */
  detach() {
    this.kid.view.removeFromParent()
    this.buddy.view.removeFromParent()
    this.kid.item = this.buddy.item = null
  }

  place(x: number, y: number) {
    this.x = x
    this.y = y
    this.buddy.x = x - 0.5
    this.buddy.y = y + 0.35
    this.trail = [
      { x: this.buddy.x, y: this.buddy.y },
      { x, y },
    ]
  }

  get walking() {
    return this.path.length > 0
  }

  /** Where the current walk ends. */
  get destination(): Point | null {
    return this.path.at(-1) ?? null
  }

  /** Walks to a spot along a path. false = no way there. */
  goTo(x: number, y: number, onArrive?: () => void): boolean {
    this.stand()
    const path = findPath(this.x, this.y, x, y)
    this.path = path ?? []
    this.onArrive = path ? (onArrive ?? null) : null
    return !!path
  }

  stop() {
    this.path = []
    this.onArrive = null
  }

  /** Snaps onto a seat. false = someone else is on it. */
  sit(seat: Seat): boolean {
    const taken = this.seats.get(seat)
    if (taken && taken !== this) return false
    this.stand()
    this.stop()
    this.seats.set(seat, this)
    this.seat = seat
    this.x = seat.x
    this.y = seat.y
    this.kid.face = 1
    return true
  }

  stand() {
    const seat = this.seat
    if (!seat) return
    this.seats.delete(seat)
    this.seat = null
    this.x = seat.ax
    this.y = seat.ay
  }

  /** Walks to a seat, then sits. */
  sitAt(seat: Seat, onSit?: () => void): boolean {
    if (this.seats.has(seat)) return false
    return this.goTo(seat.ax, seat.ay, () => {
      if (this.sit(seat)) onSit?.()
    })
  }

  /** A small happy jump, kid and buddy. */
  hop() {
    if (!this.seat) this.kid.jump = JUMP_S
    this.buddy.jump = JUMP_S
  }

  /** `keyDir`: the walking keys' direction on the floor (the Student only). */
  update(dt: number, proj: Projection, still: boolean, keyDir: Point | null) {
    let vx = 0
    let vy = 0
    if (keyDir) {
      this.stop()
      this.stand()
      const step = this.speed * dt
      // Each axis on its own, so the kid slides along walls and desks.
      const nx = this.x + keyDir.x * step
      if (isFree(nx, this.y)) {
        vx = nx - this.x
        this.x = nx
      }
      const ny = this.y + keyDir.y * step
      if (isFree(this.x, ny)) {
        vy = ny - this.y
        this.y = ny
      }
    } else if (this.path.length) {
      const next = this.path[0]
      const dx = next.x - this.x
      const dy = next.y - this.y
      const d = Math.hypot(dx, dy)
      const step = this.speed * dt
      if (d <= step) {
        this.x = next.x
        this.y = next.y
        vx = dx
        vy = dy
        this.path.shift()
        if (!this.path.length && this.onArrive) {
          const arrive = this.onArrive
          this.onArrive = null
          arrive()
        }
      } else {
        vx = (dx / d) * step
        vy = (dy / d) * step
        this.x += vx
        this.y += vy
      }
    } else if (!this.you) {
      this.think(dt)
    }

    const kid = this.kid
    kid.moving = Math.abs(vx) + Math.abs(vy) > 1e-4
    if (kid.moving) {
      const sx = proj.screenDx(vx, vy)
      if (Math.abs(sx) > 1e-4) kid.face = sx > 0 ? 1 : -1
      const last = this.trail[this.trail.length - 1]
      if (Math.hypot(this.x - last.x, this.y - last.y) > TRAIL_STEP) {
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > TRAIL_MAX) this.trail.shift()
      }
    }
    kid.x = this.x
    kid.y = this.y
    drawFigure(kid, dt, proj, still, this.seat)

    // The buddy heads for the point a little way back along the kid's trail.
    const buddy = this.buddy
    const target = trailPoint(this.trail, BUDDY_GAP)
    const dx = target.x - buddy.x
    const dy = target.y - buddy.y
    const d = Math.hypot(dx, dy)
    buddy.moving = d > 0.05
    if (buddy.moving) {
      const step = Math.min(d, this.speed * 1.15 * dt * (d > 1.2 ? 1.6 : 1))
      buddy.x += (dx / d) * step
      buddy.y += (dy / d) * step
      const sx = proj.screenDx(dx, dy)
      if (Math.abs(sx) > 0.01) buddy.face = sx > 0 ? 1 : -1
    } else if (!kid.moving) {
      // Standing still: the buddy looks at its kid.
      buddy.face = proj.P(this.x, this.y)[0] - proj.P(buddy.x, buddy.y)[0] > 0 ? 1 : -1
    }
    drawFigure(buddy, dt, proj, still, null)
  }

  /** A classmate with nothing to do: follow their leader, or wander and sometimes sit. */
  private think(dt: number) {
    this.wait -= dt
    if (this.wait > 0) return
    const leader = this.leader
    if (leader) {
      this.wait = 0.5
      if (Math.hypot(this.x - leader.x, this.y - leader.y) > 1.7) {
        const spot = trailPoint(leader.trail, 1.9)
        this.goTo(spot.x, spot.y)
      }
      return
    }
    this.wait = 6 + Math.random() * 8
    if (Math.random() < 0.35) {
      const chairs = SEATS.filter((s) => s.kind === 'chair' && !this.seats.has(s))
      if (chairs.length && this.sitAt(chairs[Math.floor(Math.random() * chairs.length)])) return
    }
    const spot = WANDER_SPOTS[Math.floor(Math.random() * WANDER_SPOTS.length)]
    this.goTo(spot.x + (Math.random() - 0.5) * 0.8, spot.y + (Math.random() - 0.5) * 0.6)
  }

  destroy() {
    this.kid.view.destroy({ children: true })
    this.buddy.view.destroy({ children: true })
  }
}

/** Places one figure and applies its motion: bob when walking, breathing when idle. */
function drawFigure(f: Figure, dt: number, proj: Projection, still: boolean, seat: Seat | null) {
  const floor = seat ? seat.z : floorHeight(f.x, f.y)
  f.z += (floor - f.z) * Math.min(1, dt * 14)
  const [X, Y] = proj.P(f.x, f.y)
  f.view.position.set(X, Y)
  f.shadow.position.set(0, -f.z)

  f.phase += dt * (f.moving ? 11 : 2.2)
  let lift = 0
  let squash = 1
  let tilt = 0
  if (!still) {
    if (f.moving) {
      const up = Math.abs(Math.sin(f.phase))
      lift = up * 7
      squash = 1 - (1 - up) * 0.05
      tilt = Math.sin(f.phase) * 0.04
    } else if (seat) {
      squash = 0.93 + Math.sin(f.phase) * 0.006
    } else {
      squash = 1 + Math.sin(f.phase) * 0.012
    }
  } else if (seat) {
    squash = 0.93
  }
  if (f.jump > 0) {
    f.jump = Math.max(0, f.jump - dt)
    if (!still) lift += Math.sin((1 - f.jump / JUMP_S) * Math.PI) * 18
  }

  // Straight view: the back of the room is a little smaller.
  const depth = proj.diag ? 1 : 0.86 + 0.14 * Math.min(1, Math.max(0, f.y / RD))
  const scaleY = f.base * squash * depth
  f.body.position.set(0, -f.z - lift)
  f.body.rotation = tilt
  f.body.scale.set(f.base * f.face * Math.sqrt(2 - squash) * depth, scaleY)
  f.shadow.scale.set(depth)

  if (f.item) {
    f.item.x0 = f.item.x1 = f.x
    f.item.y0 = f.item.y1 = f.y
  }
  f.topX = X
  f.topY = Y - f.z - f.art.texture.height * f.art.anchorY * scaleY
}
