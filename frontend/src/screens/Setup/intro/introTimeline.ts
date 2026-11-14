import {
  BOOK_VIEW,
  HOME,
  LOGIN_VIEW,
  PARALLAX,
  type BedroomFrame,
  type Camera,
  type HandPose,
} from '../../../components/Bedroom/camera'
import { TURN_MS } from '../bookPages'

/*
 * The bedroom intro clip, as pure functions of the clock (t, in seconds).
 * useIntroClip.tsx runs the clock and writes these values onto the elements.
 *
 *    0   - 1     arrive: the blurred login scene fades to the dark bedroom
 *    1   - 4.5   pull back: the book ends up in the middle of the desk; the
 *                hands slide in; the letterbox bars and Skip come in
 *    4.5 - 5     a still beat (the lamp flickers once, very softly)
 *    5   - 9     look around: up off the desk, left to the bed, right across
 *                the shelf, a stop on the moon window, then the chair
 *    9   - 10    back down to the book, a little closer
 *   10   - 13.6  doodle: a sun, a star and an owl (0.8 + 0.6 + 1.4 s of drawing)
 *   13.6 - 14.2  the owl blinks twice; gold sparkles
 *   14.2 - 15.2  the owl becomes Ollie and hops onto the top edge of the book
 *   15.2 - 16.1  into the story: book view, the bars leave, the page turns
 */
export const BEAT = {
  arrive: 0,
  pull: 1,
  still: 4.5,
  look: 5,
  back: 9,
  doodle: 10,
  blink: 13.6,
  ollie: 14.2,
  story: 15.2,
  end: 16.1,
} as const

/** When the page starts to turn: it lands exactly as the clip ends. */
export const TURN_AT = BEAT.end - TURN_MS / 1000

/** The doodles: when each one is drawn. The pencil hops between them. */
export const DRAW = {
  sun: [10.4, 11.2],
  star: [11.4, 12.0],
  owl: [12.2, 13.6],
} as const

// ---------- Small helpers ----------

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** 0..1 progress of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
/** Gentle ease in and out (no sudden starts or stops). */
export const ease = (e: number) => e * e * e * (e * (e * 6 - 15) + 10)
export const lerp = (a: number, b: number, e: number) => a + (b - a) * e
const lerpCam = (a: Camera, b: Camera, e: number): Camera => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  // Zoom changes evenly to the eye when it is eased as a ratio.
  zoom: a.zoom * (b.zoom / a.zoom) ** e,
  tilt: lerp(a.tilt, b.tilt, e),
  roll: lerp(a.roll, b.roll, e),
})

// ---------- The camera ----------

/** How far the camera lifts off the desk to look at the room, and how much it tilts up. */
const LOOK_UP = 850
const LOOK_TILT = 9
/** Looking around: how far the back wall slides on screen (+ = the room moves right, we look left). */
const LOOK_BED = 440
const LOOK_WINDOW = -400
const LOOK_CHAIR = -505
/**
 * The doodle view: a little closer than HOME (the book is about 65% of the
 * width), with the book's bottom edge at the bottom letterbox bar. The right
 * hand reaches the page from below, so the end of its sleeve stays behind the bar.
 */
const DOODLE_VIEW: Camera = { x: 720, y: 527, zoom: 1.3, tilt: 0, roll: 0 }
/** While it draws, the right hand is turned this much: the arm comes up from the bottom of the screen. */
export const DRAW_ROT = 38
/** The doodles stay below this line of the right page (its own pixels): higher up, the sleeve's cut end would show above the bar. */
export const DRAW_ZONE_TOP = 451

/** The look-around: how far the wall has slid at time t. It stops on the window for 0.6 s. */
function lookSlide(t: number) {
  if (t < 6.4) return lerp(0, LOOK_BED, ease(seg(t, 5.5, 6.4)))
  if (t < 7.7) return lerp(LOOK_BED, LOOK_WINDOW, ease(seg(t, 6.4, 7.7)))
  if (t < 8.3) return LOOK_WINDOW
  return lerp(LOOK_WINDOW, LOOK_CHAIR, ease(seg(t, 8.3, 9)))
}

/** The camera looking at the room at time t (beat 4). */
const lookCam = (t: number): Camera => {
  const up = ease(seg(t, BEAT.look, 6.1))
  return {
    x: HOME.x - lookSlide(t) / PARALLAX.wall.x,
    y: HOME.y - LOOK_UP * up,
    zoom: 1,
    tilt: LOOK_TILT * up,
    roll: 0,
  }
}

/** The planned camera move, without the handheld sway. */
function plannedCam(t: number): Camera {
  if (t < BEAT.pull) return LOGIN_VIEW
  if (t < BEAT.still) return lerpCam(LOGIN_VIEW, HOME, ease(seg(t, BEAT.pull, BEAT.still)))
  if (t < BEAT.look) return HOME
  if (t < BEAT.back) return lookCam(t)
  if (t < BEAT.doodle) return lerpCam(lookCam(BEAT.back), DOODLE_VIEW, ease(seg(t, BEAT.back, BEAT.doodle)))
  if (t < BEAT.story) return DOODLE_VIEW
  return lerpCam(DOODLE_VIEW, BOOK_VIEW, ease(seg(t, BEAT.story, BEAT.end)))
}

/** How much of the "small life" shows: none on the first and last frames, which must match the login and the setup book exactly. */
const life = (t: number) => ease(seg(t, 0.6, 2.2)) * (1 - ease(seg(t, BEAT.story, BEAT.end - 0.1)))

/**
 * The camera at time t: the planned move plus a handheld sway (slow sine
 * waves mixed together: a few pixels, a fraction of a degree) and a gentle
 * breathing zoom (±0.6% every 4 s).
 */
export function cameraAt(t: number): Camera {
  const c = plannedCam(t)
  const k = life(t)
  const swayX = 4.5 * Math.sin(t * 0.83) + 2.5 * Math.sin(t * 0.47 + 1.3) + 1.2 * Math.sin(t * 1.31 + 0.4)
  const swayY = 3.5 * Math.sin(t * 0.61 + 2.1) + 2.2 * Math.sin(t * 1.07 + 0.2)
  return {
    // Screen pixels, whatever the zoom.
    x: c.x + (k * swayX) / c.zoom,
    y: c.y + (k * swayY) / c.zoom,
    zoom: c.zoom * (1 + k * 0.006 * Math.sin((t * Math.PI * 2) / 4)),
    tilt: c.tilt,
    roll: k * (0.2 * Math.sin(t * 0.57 + 0.9) + 0.1 * Math.sin(t * 1.13)),
  }
}

// ---------- The hands ----------

/** Resting beside the book (world coordinates of each picture's top-left corner). */
export const LEFT_REST: HandPose = { x: 118, y: 480, rot: 4 }
export const RIGHT_REST: HandPose = { x: 1128, y: 540, rot: 0 }
/** Out of view, below the bottom corners. */
const LEFT_AWAY: HandPose = { x: -220, y: 1040, rot: -8 }
const RIGHT_AWAY: HandPose = { x: 1540, y: 1060, rot: 10 }

const lerpHand = (a: HandPose, b: HandPose, e: number): HandPose => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  rot: lerp(a.rot ?? 0, b.rot ?? 0, e),
})
/** Never fully still: a hand shifts by a pixel or two now and then. */
const fidget = (h: HandPose, t: number, phase: number): HandPose => {
  const now = Math.sin(t * 0.9 + phase) ** 8 // mostly 0, a slow bump now and then
  return { ...h, x: h.x + 1.6 * now + 0.5 * Math.sin(t * 0.5 + phase), y: h.y - 1.2 * now, rot: (h.rot ?? 0) + 0.35 * now }
}

export function leftHandAt(t: number): HandPose {
  const rest = fidget(LEFT_REST, t, 0.7)
  if (t < BEAT.still) return lerpHand(LEFT_AWAY, rest, ease(seg(t, 1.9, 4.1)))
  return lerpHand(rest, LEFT_AWAY, ease(seg(t, BEAT.story, BEAT.end - 0.1)))
}

/** The right hand while it isn't drawing (the clip moves it by the pencil tip while it draws). */
export function rightHandRestAt(t: number): HandPose {
  return lerpHand(RIGHT_AWAY, fidget(RIGHT_REST, t, 2.9), ease(seg(t, 2.1, 4.3)))
}
/** After the owl comes alive: the right hand jerks back in surprise, then slides out of view. */
export function rightHandLeave(from: HandPose, t: number): HandPose {
  const jerk = 1 - (1 - seg(t, BEAT.ollie + 0.05, BEAT.ollie + 0.22)) ** 3
  const back: HandPose = { x: from.x + 64, y: from.y + 52, rot: 7 }
  const jerked = lerpHand(from, back, jerk)
  return lerpHand(jerked, RIGHT_AWAY, ease(seg(t, BEAT.ollie + 0.35, BEAT.story)))
}

// ---------- The whole bedroom ----------

/** The bedroom at time t, except the right hand while it draws. */
export function bedroomAt(t: number): BedroomFrame {
  // Focus: the room turns sharp as the camera lifts, and soft again on the way back.
  const sharp = ease(seg(t, BEAT.look + 0.1, BEAT.look + 0.7)) * (1 - ease(seg(t, BEAT.back + 0.1, BEAT.back + 0.7)))
  // The lamp's one soft flicker, at the start of the still beat.
  const flick = seg(t, BEAT.still, BEAT.still + 0.3)
  const k = life(t)
  // On the window: one star twinkles twice.
  const star = t > 7.7 && t < 8.3 ? Math.sin(seg(t, 7.72, 8.28) * Math.PI * 2) ** 2 : 0
  return {
    cam: cameraAt(t),
    soft: 1 - sharp,
    deskDim: 0.3 * sharp,
    lampDip: flick > 0 && flick < 1 ? 0.28 * Math.sin(flick * Math.PI) ** 2 * (0.6 + 0.4 * Math.cos(flick * Math.PI * 4)) : 0,
    moon: 0.5 + 0.5 * k * Math.sin(t * 1.5),
    star,
    left: leftHandAt(t),
    right: rightHandRestAt(t),
    dust: t,
    dustLevel: k,
  }
}

// ---------- Reduce motion: fades only, about 2 s ----------

export const CALM = { toRoom: 0.35, story: 1.65, end: 2 } as const

/** The bedroom view shown for a moment with reduce motion on: pulled back, hands resting, nothing moving. */
export const CALM_ROOM: BedroomFrame = {
  cam: HOME,
  soft: 1,
  deskDim: 0,
  lampDip: 0,
  moon: 0.5,
  star: 0,
  left: LEFT_REST,
  right: RIGHT_REST,
  dust: null,
  dustLevel: 0,
}
/** The clip's first frame: the login's place for the book. */
export const FIRST_FRAME: BedroomFrame = { ...bedroomAt(0), left: null, right: null, dust: null }
/**
 * Before the clock starts: the first frame, with everything that comes later
 * (the hands, the sharp room) drawn almost invisibly behind the login scene,
 * so the browser has every picture ready and nothing stutters once it moves.
 */
export const WARM_FRAME: BedroomFrame = { ...FIRST_FRAME, left: LEFT_REST, right: RIGHT_REST, warm: true }
/** The login scene is taken away here: in the still beat, where a busy moment can't be seen. */
export const LOGIN_GONE_AT = BEAT.still + 0.1
/** How dark the cover is (reduce motion): down over the book, up on the bedroom, down again, up on Boy or Girl. */
export const calmCover = (t: number) =>
  t < CALM.toRoom ? seg(t, 0, CALM.toRoom) : t < 1.3 ? 1 - seg(t, CALM.toRoom, 0.7) : t < CALM.story ? seg(t, 1.3, CALM.story) : 1 - seg(t, CALM.story, CALM.end)
