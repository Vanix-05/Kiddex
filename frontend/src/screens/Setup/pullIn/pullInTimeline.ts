import {
  BOOK,
  BOOK_SCALE,
  BOOK_VIEW,
  HAND_LEFT_H,
  HAND_W,
  handPivot,
  STAGE_H,
  STAGE_W,
  type BedroomFrame,
  type Camera,
  type HandPose,
} from '../../../components/Bedroom/camera'
import { bedroomLayout } from '../../../assets/art'

/*
 * "The buddy reaches out and pulls you in", as pure functions of the clock
 * (t, in seconds from the end of "A perfect team!"). usePullInClip.tsx runs
 * the clock and writes these values onto the elements.
 *
 *   0   - 1     the bars and Skip come in; the camera eases back a little;
 *               both hands slide in and rest (the right one empty)
 *   1   - 2     the right page glows and ripples; gold sparkles rise
 *   2   - 3.8   the buddy's two arms push out of the page, as a pencil
 *               sketch that fills in with its colors
 *   3.8 - 4.4   the kid's hands flinch back
 *   4.4 - 5.5   a pause; the right hand reaches forward; the paws close
 *               around it; the left hand slides away
 *   5.0 - 5.5   the gold hand-off: the paws glow gold, and thin gold lines
 *               loop around the paws and the kid's wrist (the same lines are
 *               on the kid's wrists when the wide shot starts)
 *   5.5 - 5.9   the first tug
 *   5.9         HARD CUT on the second tug, to the wide shot: the kid at the
 *               desk pulled into the book (pull-in-boy/girl.mp4, 4.58 s). It
 *               ends on the glowing page; over its last 0.5 s it cross-fades
 *               into the start frame (see WIDE).
 *
 * The old ending is kept as the fallback, when the video is missing or won't
 * start (and for ?wide=0 on /dev/pullin):
 *   5.5 - 6.2   two tugs, the second stronger
 *   6.2 - 8.6   the rush into the glowing page, speeding up
 *   8.6 - 9     the page fills the screen: it is the start frame
 */
export const BEAT = {
  glow: 1,
  arms: 2,
  flinch: 3.8,
  reach: 4.4,
  gold: 5,
  tug: 5.5,
  cut: 5.9,
  rush: 6.2,
  land: 8.6,
  end: 9,
} as const

/**
 * The wide shot's ending (times in the video's own seconds, from its end).
 * Its last frame is the start frame seen closer: 1.335x, moved a little up and
 * left (measured by matching the pencil lines of both, the same for boy and
 * girl). The video holds still over its last second, so the start frame
 * fades in already lined up with it (no double star or sun), and only once it
 * covers the video does it settle back to its own size, where the magic fall
 * starts.
 */
export const WIDE = {
  /** The start frame's size over the video's last frame. */
  zoom: 1.335,
  /** ...and how far it is moved then (stage pixels, at that zoom). */
  shiftX: -13,
  shiftY: -10,
  /** The fade: from this long before the video's end... */
  fadeFrom: 0.5,
  /** ...until this long before it (fully covered). */
  fadeTo: 0.2,
  /** Then it settles to its own size, ending this long after the video's end: the clip is over. */
  settleEnd: 0.4,
  /** The video must be playing this soon after the cut, or the old rush plays instead. */
  startWithin: 1.5,
} as const

/** The start frame over the wide video at video time vt (duration d): its opacity and transform (zoomed, then its own size). */
export function wideEndAt(vt: number, d: number, zoom: number = WIDE.zoom) {
  const opacity = ease(seg(vt, d - WIDE.fadeFrom, d - WIDE.fadeTo))
  const settle = ease(seg(vt, d - WIDE.fadeTo, d + WIDE.settleEnd))
  const k = 1 - settle
  return {
    opacity,
    transform: `translate(${(WIDE.shiftX * k).toFixed(2)}px, ${(WIDE.shiftY * k).toFixed(2)}px) scale(${(1 + (zoom - 1) * k).toFixed(4)})`,
    over: vt >= d + WIDE.settleEnd,
  }
}

/** Reduce motion: fade to the start frame (0.5 s), hold it (0.5 s). */
export const CALM = { fade: 0.5, end: 1 } as const

// ---------- Small helpers ----------

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
/** Gentle ease in and out. */
export const ease = (e: number) => e * e * e * (e * (e * 6 - 15) + 10)
export const easeOut = (e: number) => 1 - (1 - e) ** 3
/** Speeding up (the rush). */
export const easeIn = (e: number) => e ** 2.6
export const lerp = (a: number, b: number, e: number) => a + (b - a) * e
/** 0 -> 1 -> 0 over [a, b]. */
const bump = (t: number, a: number, b: number) => Math.sin(seg(t, a, b) * Math.PI)

// ---------- The glowing page ----------

/**
 * The magic page: the start-frame picture, lying on the right page of the
 * book (in the book's own pixels). The rush ends with this picture filling
 * the stage exactly, so the clip's last frame is the start frame itself.
 */
const PAGE_W = 572
export const MAGIC = {
  left: 608,
  width: PAGE_W,
  height: (PAGE_W * bedroomLayout.startFrame.height) / bedroomLayout.startFrame.width,
  top: 0,
}
MAGIC.top = 20 + (698 - MAGIC.height) / 2
/** The middle of the glow, in the book's pixels and in the world. */
export const GLOW_BOOK = { x: MAGIC.left + MAGIC.width / 2, y: MAGIC.top + MAGIC.height / 2 }
export const GLOW = { x: BOOK.x + GLOW_BOOK.x * BOOK_SCALE, y: BOOK.y + GLOW_BOOK.y * BOOK_SCALE }

// ---------- The camera ----------

/**
 * Eased back from book view: the book is about 70% of the width (a little
 * less than 75%, so Ollie on its top edge stays under the top bar and a strip
 * of desk shows at the bottom).
 */
const PULL_VIEW: Camera = { x: 720, y: 590, zoom: 1.42, tilt: 0, roll: 0 }
/** The start-frame picture on the page covers the whole stage (same crop as a full-screen picture). */
const coverScale = Math.max(STAGE_W / MAGIC.width, STAGE_H / MAGIC.height)
const END_VIEW: Camera = { x: GLOW.x, y: GLOW.y, zoom: coverScale / BOOK_SCALE, tilt: 0, roll: 0 }

const lerpCam = (a: Camera, b: Camera, e: number): Camera => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  zoom: a.zoom * (b.zoom / a.zoom) ** e,
  tilt: 0,
  roll: 0,
})

/** The two tugs toward the page: a small one, then a stronger one. */
const tugAt = (t: number) => 0.35 * bump(t, BEAT.tug, BEAT.tug + 0.3) ** 2 + bump(t, BEAT.tug + 0.34, BEAT.rush) ** 2
/** How far the rush has got (0..1), speeding up. */
export const rushAt = (t: number) => easeIn(seg(t, BEAT.rush, BEAT.land))

export function cameraAt(t: number): Camera {
  let c = t < BEAT.rush ? lerpCam(BOOK_VIEW, PULL_VIEW, ease(seg(t, 0, 1))) : lerpCam(PULL_VIEW, END_VIEW, rushAt(t))
  // A tug: a few pixels toward the page, and back.
  const tug = tugAt(t)
  if (tug > 0) c = { ...c, x: lerp(c.x, GLOW.x, 0.05 * tug), y: lerp(c.y, GLOW.y, 0.05 * tug), zoom: c.zoom * (1 + 0.03 * tug) }
  // Handheld sway, as in the intro clip: stronger during the tugs, gone by the time the page fills the screen.
  const k = ease(seg(t, 0, 1)) * (1 + 1.4 * seg(t, BEAT.tug - 0.2, BEAT.tug) * (1 - seg(t, BEAT.rush, BEAT.rush + 0.4))) * (1 - seg(t, BEAT.rush + 0.6, BEAT.land - 0.3))
  const swayX = 4.5 * Math.sin(t * 0.83 + 1) + 2.5 * Math.sin(t * 0.47 + 2.3) + 1.2 * Math.sin(t * 1.31)
  const swayY = 3.5 * Math.sin(t * 0.61 + 0.4) + 2.2 * Math.sin(t * 1.07 + 1.7)
  return {
    x: c.x + (k * swayX) / c.zoom,
    y: c.y + (k * swayY) / c.zoom,
    zoom: c.zoom * (1 + k * 0.006 * Math.sin((t * Math.PI * 2) / 4)),
    tilt: 0,
    roll: k * (0.2 * Math.sin(t * 0.57) + 0.1 * Math.sin(t * 1.13 + 0.8)),
  }
}

// ---------- The kid's hands ----------

/** Resting on the bottom corners of the book. The right hand is the left hand's picture, mirrored. */
const LEFT_REST: HandPose = { x: 205, y: 600, rot: 0 }
const RIGHT_REST: HandPose = { x: 1000, y: 600, rot: 0 }
const LEFT_AWAY: HandPose = { x: -200, y: 1020, rot: -8 }
const RIGHT_AWAY: HandPose = { x: 1420, y: 1020, rot: 8 }
/**
 * Reaching into the paws: turned so the arm comes up from the bottom of the
 * screen (the end of the sleeve stays below the bar), fingertips just under the glow.
 */
const RIGHT_GRAB: HandPose = { x: GLOW.x - 124, y: GLOW.y - 36, rot: 38 }

const lerpHand = (a: HandPose, b: HandPose, e: number): HandPose => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  rot: lerp(a.rot ?? 0, b.rot ?? 0, e),
})
/** Flinching back: down about 40px quickly but gently, then most of the way back. */
const flinchAt = (t: number) => 40 * easeOut(seg(t, BEAT.flinch, BEAT.flinch + 0.22)) - 28 * ease(seg(t, BEAT.flinch + 0.22, BEAT.reach))

function leftHandAt(t: number): HandPose | null {
  if (t > BEAT.tug + 0.1) return null
  const rest = lerpHand(LEFT_AWAY, LEFT_REST, ease(seg(t, 0.1, 1)))
  const flinch = flinchAt(t)
  const here = { ...rest, x: rest.x - 0.3 * flinch, y: rest.y + flinch, rot: (rest.rot ?? 0) - 0.08 * flinch }
  return lerpHand(here, LEFT_AWAY, ease(seg(t, BEAT.reach + 0.5, BEAT.tug)))
}

export function rightHandAt(t: number): HandPose {
  const rest = lerpHand(RIGHT_AWAY, RIGHT_REST, ease(seg(t, 0.2, 1)))
  const flinch = flinchAt(t)
  const here = { ...rest, x: rest.x + 0.3 * flinch, y: rest.y + flinch, rot: (rest.rot ?? 0) + 0.08 * flinch }
  // After a short pause it slowly reaches forward, into the paws.
  const held = lerpHand(here, RIGHT_GRAB, ease(seg(t, BEAT.reach + 0.25, BEAT.tug - 0.15)))
  // Pulled: a little toward the page on each tug, then into it (getting smaller, as it goes in ahead of the camera).
  const pull = 0.06 * tugAt(t) + 0.55 * rushAt(t)
  return {
    x: lerp(held.x, GLOW.x - 124, pull),
    y: lerp(held.y, GLOW.y - 110, pull),
    rot: held.rot,
    scale: lerp(1, 0.42, rushAt(t)),
    opacity: 1 - seg(t, BEAT.land - 0.3, BEAT.land + 0.2),
  }
}

// ---------- The buddy's arms ----------

/** One arm at time t: where its shoulder is (book pixels), how it is turned, how big, how visible. */
export interface ArmPose {
  x: number
  y: number
  /** Leaning sideways (degrees): the two arms are slightly apart. */
  rot: number
  /** Tipped toward the camera (degrees): paws first. */
  tip: number
  scale: number
  opacity: number
}

export function armsAt(t: number) {
  const out = ease(seg(t, BEAT.arms, BEAT.flinch))
  const close = ease(seg(t, BEAT.tug - 0.6, BEAT.tug - 0.15))
  const squeeze = 1 - 0.05 * bump(t, BEAT.tug - 0.25, BEAT.tug + 0.05)
  const rush = rushAt(t)
  const scale = lerp(0.14, 1, out) * squeeze * lerp(1, 0.4, rush)
  const opacity = seg(t, BEAT.arms, BEAT.arms + 0.25) * (1 - seg(t, BEAT.land - 0.3, BEAT.land + 0.2))
  // A small sway while they wait; a pull on each tug.
  const wait = out * (1 - close) * 2 * Math.sin(t * 2.1)
  const y = GLOW_BOOK.y - 8 - 18 * tugAt(t)
  const arm = (side: -1 | 1): ArmPose => ({
    x: GLOW_BOOK.x + side * lerp(24, 72, out) * lerp(1, 0.78, close),
    y,
    // Slightly apart (paws a little outward); closing, they turn in around the hand.
    rot: -side * (lerp(16, 11, out) - 13 * close + wait),
    tip: lerp(62, 34, out),
    scale,
    opacity,
  })
  return {
    left: arm(-1),
    right: arm(1),
    /** 0 = pencil sketch, 1 = the buddy's real colors (a 0.8 s cross-fade). */
    color: seg(t, 2.9, 3.7),
    /** The paws' soft shadow on the hand while they hold it. */
    shadow: close * (1 - seg(t, BEAT.land - 0.4, BEAT.land)),
  }
}

// ---------- The gold hand-off ----------

/** Where the closed paws are, below the arms' shoulders (book pixels; measured on /dev/pullin). */
const PAW_DROP = 190

/**
 * A point of the open right hand's picture (u, v: shares of the unmirrored
 * left-hand picture, from its top-left corner), in the book's pixels.
 */
export function handPointInBook(pose: HandPose, u: number, v: number) {
  const pivot = handPivot(HAND_LEFT_H)
  const size = pose.scale ?? 1
  // Mirrored (it is the left hand's picture), then turned around the pivot.
  const px = -size * (u * HAND_W - pivot.x)
  const py = size * (v * HAND_LEFT_H - pivot.y)
  const a = ((pose.rot ?? 0) * Math.PI) / 180
  const wx = pose.x + pivot.x + px * Math.cos(a) - py * Math.sin(a)
  const wy = pose.y + pivot.y + px * Math.sin(a) + py * Math.cos(a)
  return { x: (wx - BOOK.x) / BOOK_SCALE, y: (wy - BOOK.y) / BOOK_SCALE }
}

/** One gold loop: its middle (book pixels), its turn (degrees), how far it has drawn on (0..1), how bright. */
export interface GoldLoop {
  x: number
  y: number
  rot: number
  drawn: number
  opacity: number
}

/** The gold loops' shapes (book pixels): around the paws, the kid's wrist, and the hand between them. */
export const GOLD_LOOPS = [
  { rx: 96, ry: 30, start: BEAT.gold },
  { rx: 78, ry: 24, start: BEAT.gold + 0.1 },
  { rx: 88, ry: 27, start: BEAT.gold + 0.2 },
] as const
/** Each loop draws on over this long. */
export const GOLD_DRAW = 0.4

/**
 * The gold hand-off at time t: the glow behind the paws, the loops around the
 * paws and the wrist, and how strong the sparkles are. In the fallback rush it
 * all fades out as the rush starts.
 */
export function goldAt(t: number) {
  const away = 1 - seg(t, BEAT.rush, BEAT.rush + 0.5)
  const hand = rightHandAt(t)
  const wrist = handPointInBook(hand, 0.55, 0.57)
  const knuckles = handPointInBook(hand, 0.55, 0.42)
  const handRot = hand.rot ?? 0
  const paws = { x: GLOW_BOOK.x, y: GLOW_BOOK.y - 8 - 18 * tugAt(t) + PAW_DROP }
  // Slow spin: each loop sways a few degrees.
  const sway = (i: number) => 6 * Math.sin((t - BEAT.gold) * 1.7 + i * 2.1)
  const places = [
    { x: paws.x, y: paws.y, rot: 0.4 * handRot },
    { x: wrist.x, y: wrist.y, rot: handRot },
    { x: (knuckles.x + paws.x) / 2, y: (knuckles.y + paws.y) / 2, rot: 0.7 * handRot },
  ]
  const loops: GoldLoop[] = places.map((p, i) => ({
    x: p.x,
    y: p.y,
    rot: p.rot + sway(i),
    drawn: seg(t, GOLD_LOOPS[i].start, GOLD_LOOPS[i].start + GOLD_DRAW),
    opacity: away,
  }))
  return {
    /** The pre-made gold glow behind the paws (0..0.8). */
    glow: 0.8 * ease(seg(t, BEAT.gold, BEAT.tug)) * away,
    paws,
    loops,
    /** How strong the sparkles drifting up from the loops are. */
    sparkles: seg(t, BEAT.gold + 0.15, BEAT.gold + 0.5) * away,
    /** Where the bright part of each loop is (radians): it goes round, as if the loop spins. */
    spin: (t - BEAT.gold) * 4.2,
  }
}

// ---------- Everything else ----------

/** The bedroom at time t. */
export function bedroomAt(t: number): BedroomFrame {
  const rush = rushAt(t)
  return {
    cam: cameraAt(t),
    soft: 1,
    deskDim: 0,
    lampDip: 0,
    moon: 0.5,
    star: 0,
    left: leftHandAt(t),
    right: null,
    rightOpen: rightHandAt(t),
    dust: null,
    dustLevel: 0,
    // The rush: the room and desk stretch outward and go soft.
    deskSoft: seg(t, BEAT.rush, BEAT.rush + 0.8),
    stretch: 0.9 * rush,
  }
}

/** The page at time t: how far it has turned into the glowing page, and its ripple. */
export function pageAt(t: number) {
  const glow = ease(seg(t, BEAT.glow, BEAT.arms))
  // A gentle bulge toward the camera, and the pencil lines wiggling with it.
  const ripple = glow * (1 - seg(t, BEAT.rush, BEAT.land))
  return {
    /** The right page's writing is covered by glowing blank paper. */
    veil: ease(seg(t, BEAT.glow, BEAT.glow + 0.7)),
    glow,
    scale: 1 + ripple * (0.012 * Math.sin(t * 4.4) + 0.008 * Math.sin(t * 7.1 + 1)),
    rot: ripple * 0.5 * Math.sin(t * 3.1),
  }
}

/** Where the glow's middle is on the stage (for the speed lines and rushing sparkles). */
export function glowOnStage(cam: Camera) {
  return { x: STAGE_W / 2 + cam.zoom * (GLOW.x - cam.x), y: STAGE_H / 2 + cam.zoom * (GLOW.y - cam.y) }
}
