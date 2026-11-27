/**
 * A kid and their buddy in the room: walking (keys or a path), sitting, and
 * (a real classmate) following the spots their own page sends (moveTo). The buddy trails about 0.85 tiles behind and stops when the kid
 * stops. All motion is done here in Pixi (bob, breathing, flip, shadow); the
 * pictures themselves never change.
 *
 * The Teacher's view uses the same walker for Ollie, with no buddy and the
 * 'hop' style: he has no walking art, so he moves in small quick hops.
 */
import { Container, Graphics, Rectangle, Sprite, type Texture } from 'pixi.js'
import type { DepthItem } from './depth'
import { findPath, type Point } from './pathfind'
import type { Projection } from './projection'
import { floorHeight, isFree, RD, type Seat } from './room'
import type { Scene } from './scene'

/** A character picture as a Pixi texture, with where its feet are. */
export interface FigureArt {
  texture: Texture
  anchorX: number
  anchorY: number
  /** Top of the head to the feet, in texture px. */
  bodyPx: number
  /** The kid cut into layers (legs and arms move on a walk); without it, one flat picture. */
  limbs?: LimbArt
}

/** One layer of a cut kid: its texture, top-left and joint, in picture px. */
export interface LimbPiece {
  texture: Texture
  x: number
  y: number
  pivotX: number
  pivotY: number
}

export interface LimbArt {
  legLeft: LimbPiece
  legRight: LimbPiece
  core: LimbPiece
  head: LimbPiece
  armLeft: LimbPiece
  armRight: LimbPiece
  front: LimbPiece | null
}

/** The moving layers of a cut kid. */
interface LimbSprites {
  legLeft: Sprite
  legRight: Sprite
  head: Sprite
  armLeft: Sprite
  armRight: Sprite
  headX: number
  /** Where the kid looks, -1 (left) to 1 (right), easing toward the walking side. */
  look: number
  /** Where each leg rests (its joint), in picture px. */
  legLeftY: number
  legRightY: number
  /** How much of a walk is showing, 0..1 (eases in and out). */
  walk: number
}

/** An eyelid over one eye, in texture px from the picture's anchor (its feet). */
export interface Lid {
  x: number
  y: number
  rx: number
  ry: number
}

/** How a walker moves: walking with a bob (kids), or hopping (Ollie). */
export type MoveStyle = 'walk' | 'hop'

/** Head-to-feet height on screen at zoom 1, in px. */
const KID_BODY = 86
const BUDDY_BODY = 56
const BUDDY_GAP = 0.85
const TRAIL_STEP = 0.08
const TRAIL_MAX = 60
const JUMP_S = 0.5
const JUMP_PX = 18

// The kid's walk (a cut kid only): front-facing steps, the legs taking turns.
/** Step cycle speed: a full left-right cycle every ~0.6s. */
const STEP_RATE = 10.5
/** How far a stepping foot lifts, as a share of the picture's body height. */
const STEP_LIFT = 0.085
/** A stepping leg tips out a little, degrees. */
const STEP_TIP = 6
/** Arms swing, degrees. */
const ARM_SWING = 22
/** The body's small bob on each step, px on screen. */
const STEP_BOB = 2.5
/** Walking: the body leans toward where it goes, radians. */
const WALK_LEAN = 0.06
/** The head slides toward where the kid goes (looking that way), share of the body height. */
const HEAD_PEEK = 0.04
/** ...and tips that way, degrees. */
const HEAD_TIP = 6
/** How fast the head turns to look the other way. */
const LOOK_RATE = 7
/** How fast a figure turns around (it narrows, then widens facing the other way). */
const TURN_RATE = 16
/** A buddy (or a flat kid) leans toward where it goes, radians. */
const BUDDY_LEAN = 0.07

// Ollie's hops (the 'hop' style).
/** Hop cycle speed: one hop every ~0.33s. */
const HOP_RATE = 9.5
/** How high a small hop goes, px. */
const HOP_PX = 11
/** The big hop down from (or up onto) the Teacher's Desk. */
const BIG_HOP_S = 0.55
const BIG_HOP_PX = 34
/** The squash after landing, s. */
const LAND_S = 0.12
/** Sit and stand moves on the desk glide there instead of jumping in one frame. */
const GLIDE_RATE = 9
/** Eye colors from OllieLive.module.css (the setup storybook's Ollie). */
const LID_FILL = 0xfef3e2
const LID_LINE = 0x6b4a33
const BLINK_S = 0.2

/** Who sits where. Shared by everyone in the room. */
export type SeatBook = Map<Seat, Walker>

/** One drawn character: the kid or the buddy. */
export interface Figure {
  view: Container
  /** Everything that moves with the body (the body, and a cut kid's legs and arms). */
  rig: Container
  /** The picture (a cut kid: its core layer: body, head and face). */
  body: Sprite
  limbs: LimbSprites | null
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
  /** The drawn facing, easing toward `face` (between -1 and 1 while turning). */
  turn: number
  moving: boolean
  /** Seconds left of a happy jump (or a big hop). */
  jump: number
  /** That jump's length (s) and height (px). */
  jumpLen: number
  jumpPx: number
  /** World px of the top of the head, for bubbles. */
  topX: number
  topY: number
  item: DepthItem | null
  /** Moves in hops (Ollie). */
  hopper: boolean
  /** Hopper: how far up the current small hop is, 0..1. */
  air: number
  /** Hopper: seconds left of the squash after a landing. */
  land: number
  wasMoving: boolean
  /** Eyelids (Ollie): children of the body, so they flip and squash with it. */
  lids: Graphics[]
  /** Seconds until the next blink, and how far into a blink we are (-1 = not blinking). */
  blinkIn: number
  blinkT: number
  /** The current blink is the quick second one of a double blink. */
  blinkTwice: boolean
}

function makeLid({ x, y, rx, ry }: Lid): Graphics {
  // Closed, it covers the eye in face color with a thin brown line at its bottom.
  // It hangs from the top of the eye and grows down (scale.y 0 = open).
  const g = new Graphics().ellipse(0, ry, rx, ry).fill(LID_FILL)
  const arc: number[] = []
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (0.12 + (0.76 * i) / 12)
    arc.push(Math.cos(a) * rx * 0.96, ry + Math.sin(a) * ry * 0.96)
  }
  g.poly(arc, false).stroke({ width: Math.max(6, rx * 0.2), color: LID_LINE, cap: 'round' })
  g.position.set(x, y - ry)
  g.eventMode = 'none'
  g.scale.y = 0
  g.visible = false
  return g
}

function makeFigure(art: FigureArt, bodyHeight: number, shadowRx: number, shadowRy: number, hopper = false, lids: readonly Lid[] = []): Figure {
  const view = new Container()
  const shadow = new Graphics().ellipse(0, 0, shadowRx, shadowRy).fill({ color: 0x4a2c17, alpha: 0.18 })
  const rig = new Container()
  const { width, height } = art.texture
  // The feet are at the rig's (0, 0).
  const ox = -art.anchorX * width
  const oy = -art.anchorY * height
  let body: Sprite
  let limbs: LimbSprites | null = null
  if (art.limbs) {
    const piece = (p: LimbPiece, joint: boolean) => {
      const sprite = new Sprite(p.texture)
      sprite.eventMode = 'none'
      if (joint) {
        sprite.pivot.set(p.pivotX - p.x, p.pivotY - p.y)
        sprite.position.set(ox + p.pivotX, oy + p.pivotY)
      } else sprite.position.set(ox + p.x, oy + p.y)
      return sprite
    }
    const l = art.limbs
    const legLeft = piece(l.legLeft, true)
    const legRight = piece(l.legRight, true)
    body = piece(l.core, false)
    const head = piece(l.head, true)
    const armLeft = piece(l.armLeft, true)
    const armRight = piece(l.armRight, true)
    rig.addChild(legLeft, legRight, body, head, armLeft, armRight)
    if (l.front) rig.addChild(piece(l.front, false))
    limbs = { legLeft, legRight, head, armLeft, armRight, headX: head.x, look: 0, legLeftY: legLeft.y, legRightY: legRight.y, walk: 0 }
  } else {
    body = new Sprite(art.texture)
    body.anchor.set(art.anchorX, art.anchorY)
    rig.addChild(body)
  }
  body.eventMode = 'static'
  body.cursor = 'pointer'
  // Taps count on the body, not on the picture's empty corners (a buddy stands close to its kid).
  // In the body sprite's own px (a cut kid's core sits at its place in the picture).
  const bx = art.limbs ? body.x : 0
  const by = art.limbs ? body.y : 0
  body.hitArea = new Rectangle(-width * 0.28 - bx, oy - by, width * 0.56, height * art.anchorY)
  const lidViews = lids.map(makeLid)
  for (const lid of lidViews) body.addChild(lid)
  view.addChild(shadow, rig)
  return {
    view,
    rig,
    body,
    limbs,
    shadow,
    art,
    base: bodyHeight / art.bodyPx,
    x: 0,
    y: 0,
    z: 0,
    phase: Math.random() * 6,
    face: 1,
    turn: 1,
    moving: false,
    jump: 0,
    jumpLen: JUMP_S,
    jumpPx: JUMP_PX,
    topX: 0,
    topY: 0,
    item: null,
    hopper,
    air: 0,
    land: 0,
    wasMoving: false,
    lids: lidViews,
    blinkIn: 1.5 + Math.random() * 2,
    blinkT: -1,
    blinkTwice: false,
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
  /** The logged-in Student (or the Teacher's Ollie): walks with the keys and has a ring under their feet. */
  you: boolean
  /** Tiles per second. */
  speed: number
  kid: FigureArt
  /** No buddy: the Teacher's Ollie. */
  buddy?: FigureArt
  seats: SeatBook
  onTapKid: () => void
  onTapBuddy?: () => void
  /** Default 'walk'. */
  style?: MoveStyle
  /** Head-to-feet height on screen, px (default: a kid's). */
  bodyHeight?: number
  /** Eyelids that blink (Ollie). */
  lids?: readonly Lid[]
}

export class Walker {
  readonly id: string
  readonly you: boolean
  readonly kid: Figure
  readonly buddy: Figure | null
  speed: number
  /** The kid's place on the floor (the buddy has its own in `buddy`). */
  x = 0
  y = 0
  seat: Seat | null = null
  private path: Point[] = []
  private onArrive: (() => void) | null = null
  private trail: Point[] = []
  private seats: SeatBook
  private readonly hopper: boolean
  /** Hopper: the figure is gliding to a new spot (onto or off the desk). */
  private gliding = false
  /** The ring under the player's feet. */
  private ring: Graphics | null = null

  constructor(o: WalkerOptions) {
    this.id = o.id
    this.you = o.you
    this.speed = o.speed
    this.seats = o.seats
    this.hopper = o.style === 'hop'
    this.kid = makeFigure(o.kid, o.bodyHeight ?? KID_BODY, 24, 9, this.hopper, o.lids)
    this.buddy = o.buddy ? makeFigure(o.buddy, BUDDY_BODY, 18, 7) : null
    if (o.you) {
      const ring = new Graphics().ellipse(0, 0, 30, 12).stroke({ width: 3, color: 0xf0a050, alpha: 0.9 })
      this.kid.view.addChildAt(ring, 0)
      this.ring = ring
    }
    this.kid.body.on('pointertap', (e) => {
      e.stopPropagation()
      o.onTapKid()
    })
    this.buddy?.body.on('pointertap', (e) => {
      e.stopPropagation()
      o.onTapBuddy?.()
    })
  }

  /** Puts both figures into a (re)built scene. They keep their places. */
  attach(scene: Scene) {
    this.kid.item = scene.add(this.kid.view, this.kid.x, this.kid.y)
    if (this.buddy) this.buddy.item = scene.add(this.buddy.view, this.buddy.x, this.buddy.y)
  }

  /** Takes both figures out of the scene without destroying them (before a rebuild). */
  detach() {
    this.kid.view.removeFromParent()
    this.kid.item = null
    if (this.buddy) {
      this.buddy.view.removeFromParent()
      this.buddy.item = null
    }
  }

  place(x: number, y: number) {
    this.x = x
    this.y = y
    this.kid.x = x
    this.kid.y = y
    this.gliding = false
    const bx = x - 0.5
    const by = y + 0.35
    if (this.buddy) {
      this.buddy.x = bx
      this.buddy.y = by
    }
    this.trail = [
      { x: bx, y: by },
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

  /**
   * Snaps onto a seat. false = someone else is on it.
   * `instant`: already there (the Teacher's Ollie starts on the desk), no hop.
   */
  sit(seat: Seat, instant = false): boolean {
    const taken = this.seats.get(seat)
    if (taken && taken !== this) return false
    this.stand()
    this.stop()
    this.seats.set(seat, this)
    this.seat = seat
    this.x = seat.x
    this.y = seat.y
    this.kid.face = 1
    if (instant) {
      this.kid.x = seat.x
      this.kid.y = seat.y
      this.kid.z = seat.z
    } else if (seat.kind === 'desk') {
      this.bigHop()
    }
    return true
  }

  stand() {
    const seat = this.seat
    if (!seat) return
    this.seats.delete(seat)
    this.seat = null
    this.x = seat.ax
    this.y = seat.ay
    // Off the Teacher's Desk: one bigger hop down.
    if (seat.kind === 'desk') this.bigHop()
  }

  /** Walks to a seat, then sits. */
  sitAt(seat: Seat, onSit?: () => void): boolean {
    if (this.seats.has(seat)) return false
    const sit = () => {
      if (this.sit(seat)) onSit?.()
    }
    // Already standing there: no walk needed.
    if (!this.seat && Math.hypot(this.x - seat.ax, this.y - seat.ay) < 0.05) {
      this.stop()
      sit()
      return true
    }
    return this.goTo(seat.ax, seat.ay, sit)
  }

  /** A small happy jump, kid and buddy. */
  hop() {
    for (const f of [this.seat ? null : this.kid, this.buddy]) {
      if (!f) continue
      f.jump = f.jumpLen = JUMP_S
      f.jumpPx = JUMP_PX
    }
  }

  /** Ollie: the big hop onto or off the desk; the figure glides to its new spot meanwhile. */
  private bigHop() {
    if (!this.hopper) return
    const kid = this.kid
    kid.jump = kid.jumpLen = BIG_HOP_S
    kid.jumpPx = BIG_HOP_PX
    this.gliding = true
  }

  /** `keyDir`: the walking keys' direction on the floor (the Student only). */
  update(dt: number, proj: Projection, still: boolean, keyDir: Point | null) {
    const kid = this.kid
    // Ollie moves while in the air and barely while touching down, so it reads as hopping.
    const pace = this.hopper && kid.moving && !still ? 0.25 + 1.2 * Math.abs(Math.sin(kid.phase)) : 1
    let vx = 0
    let vy = 0
    if (keyDir) {
      this.stop()
      this.stand()
      const step = this.speed * dt * pace
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
      const step = this.speed * dt * pace
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
    }

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
    if (this.gliding && !still) {
      const k = Math.min(1, dt * GLIDE_RATE)
      kid.x += (this.x - kid.x) * k
      kid.y += (this.y - kid.y) * k
      if (Math.hypot(this.x - kid.x, this.y - kid.y) < 0.01) this.gliding = false
    } else {
      this.gliding = false
      kid.x = this.x
      kid.y = this.y
    }
    drawFigure(kid, dt, proj, still, this.seat)
    // Ollie's ring goes up onto the desk with him, like his shadow.
    if (this.hopper && this.ring) this.ring.position.y = -kid.z

    const buddy = this.buddy
    if (!buddy) return
    // The buddy heads for the point a little way back along the kid's trail.
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

  /**
   * A real classmate: walk to the spot their page sent (it sends one several
   * times a second while they move). Close by: straight there. Further (a
   * missed message): around the desks. Too far, or no way there: jump there.
   * `seat`: they sit on it once they get there (if it's free here).
   */
  moveTo(x: number, y: number, seat: Seat | null) {
    if (seat && this.seat === seat) return
    const d = Math.hypot(this.x - x, this.y - y)
    if (seat) {
      // Sitting down where they stand (their page put them on the chair already).
      if (d < 1.2 || !this.goTo(seat.ax, seat.ay, () => this.sit(seat))) {
        this.stand()
        this.stop()
        this.place(seat.ax, seat.ay)
        this.sit(seat, true)
      }
      return
    }
    if (this.seat) this.stand()
    if (d < 0.02) return
    if (d > 6) {
      this.stop()
      this.place(x, y)
    } else if (d <= 2) {
      this.path = [{ x, y }]
      this.onArrive = null
    } else if (!this.goTo(x, y)) {
      this.place(x, y)
    }
  }

  destroy() {
    this.kid.view.destroy({ children: true })
    this.buddy?.view.destroy({ children: true })
  }
}

/** Blinks every 2.5-5s, sometimes twice (like OllieLive). Also with reduced motion. */
function blink(f: Figure, dt: number) {
  if (!f.lids.length) return
  if (f.blinkT < 0) {
    f.blinkIn -= dt
    if (f.blinkIn > 0) return
    f.blinkT = 0
  }
  f.blinkT += dt
  const k = f.blinkT / BLINK_S
  // Down, a short hold, and up again.
  const closed = k >= 1 ? 0 : k < 0.45 ? k / 0.45 : k < 0.55 ? 1 : (1 - k) / 0.45
  for (const lid of f.lids) {
    lid.scale.y = closed
    lid.visible = closed > 0.02
  }
  if (k >= 1) {
    f.blinkT = -1
    if (!f.blinkTwice && Math.random() < 0.25) {
      f.blinkTwice = true
      f.blinkIn = 0.06
    } else {
      f.blinkTwice = false
      f.blinkIn = 2.5 + Math.random() * 2.5
    }
  }
}

/** Places one figure and applies its motion: bob (or hops) when moving, breathing when idle. */
function drawFigure(f: Figure, dt: number, proj: Projection, still: boolean, seat: Seat | null) {
  const floor = seat ? seat.z : floorHeight(f.x, f.y)
  f.z += (floor - f.z) * Math.min(1, dt * (f.hopper ? 8 : 14))
  const [X, Y] = proj.P(f.x, f.y)
  f.view.position.set(X, Y)
  f.shadow.position.set(0, -f.z)

  let lift = 0
  let squash = 1
  let tilt = 0
  if (f.hopper) {
    // Small quick hops: up and down from the floor, stretched in the air,
    // squashed when touching down. Each walk starts from the floor.
    if (f.moving && !f.wasMoving) f.phase = 0
    const landed = f.air > 0 || f.jump > 0
    f.wasMoving = f.moving
    if (f.moving) {
      f.phase += dt * HOP_RATE
      f.air = Math.abs(Math.sin(f.phase))
    } else {
      f.phase += dt * 2.2
      // Stopped mid-hop: come down first.
      f.air = Math.max(0, f.air - dt * 7)
    }
    if (f.jump > 0) {
      f.jump = Math.max(0, f.jump - dt)
      if (!still) {
        const k = Math.sin((1 - f.jump / f.jumpLen) * Math.PI)
        lift += k * f.jumpPx
        squash = 1 + 0.08 * k
      }
    }
    if (landed && f.air === 0 && f.jump === 0) f.land = LAND_S
    if (!still) {
      if (f.air > 0) {
        const ground = Math.pow(1 - f.air, 6)
        const rising = f.moving ? Math.abs(Math.cos(f.phase)) : 1
        lift += f.air * HOP_PX
        squash *= 1 + 0.08 * rising * (1 - ground) - 0.16 * ground
        tilt = f.face * 0.05 * (1 - ground)
      } else if (f.land > 0) {
        f.land = Math.max(0, f.land - dt)
        squash *= 1 - 0.14 * (f.land / LAND_S)
      } else if (f.jump === 0) {
        squash = seat ? 0.95 + Math.sin(f.phase) * 0.008 : 1 + Math.sin(f.phase) * 0.015
      }
    } else if (seat) {
      squash = 0.95
    }
    blink(f, dt)
  } else if (f.limbs) {
    const limbs = f.limbs
    // A cut kid walks: the legs take turns stepping, the arms swing, a small bob.
    f.phase += dt * (f.moving ? STEP_RATE : 2.2)
    const target = f.moving && !still ? 1 : 0
    limbs.walk += (target - limbs.walk) * Math.min(1, dt * 12)
    const w = limbs.walk
    const s = f.moving ? Math.sin(f.phase) : 0
    const liftPx = STEP_LIFT * f.art.bodyPx
    const left = Math.max(0, s) * w
    const right = Math.max(0, -s) * w
    limbs.legLeft.y = limbs.legLeftY - left * liftPx
    limbs.legRight.y = limbs.legRightY - right * liftPx
    limbs.legLeft.angle = left * STEP_TIP
    limbs.legRight.angle = -right * STEP_TIP
    // The lifted leg comes toward us (a knee up), so it looks a little shorter.
    limbs.legLeft.scale.y = 1 - 0.12 * left
    limbs.legRight.scale.y = 1 - 0.12 * right
    // Each arm swings with the other side's leg.
    limbs.armLeft.angle = -s * ARM_SWING * w
    limbs.armRight.angle = -s * ARM_SWING * w
    // A cut kid never flips (the outfit would mirror): the head turns to look where it goes,
    // a lot while walking and a little once stopped.
    limbs.look += (f.face - limbs.look) * Math.min(1, dt * (still ? 60 : LOOK_RATE))
    const looking = limbs.look * (0.35 + 0.65 * w)
    limbs.head.x = limbs.headX + HEAD_PEEK * f.art.bodyPx * looking
    limbs.head.angle = HEAD_TIP * looking
    if (!still) {
      if (w > 0.01) {
        lift = Math.abs(Math.cos(f.phase)) * STEP_BOB * w
        tilt = s * 0.025 * w + f.face * WALK_LEAN * w
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
      if (!still) lift += Math.sin((1 - f.jump / f.jumpLen) * Math.PI) * f.jumpPx
    }
  } else {
    f.phase += dt * (f.moving ? 11 : 2.2)
    if (!still) {
      if (f.moving) {
        const up = Math.abs(Math.sin(f.phase))
        lift = up * 7
        squash = 1 - (1 - up) * 0.05
        tilt = Math.sin(f.phase) * 0.04 + f.face * BUDDY_LEAN
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
      if (!still) lift += Math.sin((1 - f.jump / f.jumpLen) * Math.PI) * f.jumpPx
    }
  }

  // Straight view: the back of the room is a little smaller.
  const depth = proj.diag ? 1 : 0.86 + 0.14 * Math.min(1, Math.max(0, f.y / RD))
  // Turning around: narrow, then wide again facing the other way (a snap with reduced motion).
  // Kids and buddies always face us (a flip looked odd): the kid's head and a lean show the way.
  // Only Ollie (the Teacher's view) flips.
  const facing = f.hopper ? f.face : 1
  f.turn = still ? facing : f.turn + (facing - f.turn) * Math.min(1, dt * TURN_RATE)
  const scaleY = f.base * squash * depth
  f.rig.position.set(0, -f.z - lift)
  f.rig.rotation = tilt
  f.rig.scale.set(f.base * f.turn * Math.sqrt(2 - squash) * depth, scaleY)
  // Ollie's shadow shrinks while he is up in the air.
  f.shadow.scale.set(depth * (f.hopper ? 1 - Math.min(0.5, lift / 60) : 1))

  if (f.item) {
    f.item.x0 = f.item.x1 = f.x
    f.item.y0 = f.item.y1 = f.y
  }
  f.topX = X
  f.topY = Y - f.z - f.art.texture.height * f.art.anchorY * scaleY
}
