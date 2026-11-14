import { bedroomLayout } from '../../assets/art'

/**
 * The bedroom world and its camera.
 *
 * "World" coordinates are stage pixels (1440 x 900) as seen by the HOME
 * camera: the pulled-back view with the book lying open in the middle of the
 * desk. A camera at (x, y) with zoom z puts world point w on the stage at
 * 720 + z * (w.x - x), 450 + z * (w.y - y).
 */

export const STAGE_W = 1440
export const STAGE_H = 900
const CX = STAGE_W / 2
const CY = STAGE_H / 2

/** The open book's own size (components/StoryBook/bookParts.module.css). */
export const BOOK_W = 1216
export const BOOK_H = 748
/** How big the book is drawn in the world: about half the screen width at HOME. */
export const BOOK_SCALE = 0.592
/** The book's top-left corner in the world (it lies in the middle of the desk). */
export const BOOK = { x: CX - (BOOK_W * BOOK_SCALE) / 2, y: 392 }

export interface Camera {
  x: number
  y: number
  zoom: number
  /** Looking up, in degrees: the bottom of the picture tips away. */
  tilt: number
  /** Leaning sideways, in degrees (the handheld sway). */
  roll: number
}

/** The pulled-back view: the whole desk, the lamp on the left, the pencil cup on the right. */
export const HOME: Camera = { x: CX, y: CY, zoom: 1, tilt: 0, roll: 0 }

/** The camera that shows the book at its full size (1216 x 748) with its top-left corner at (left, top) on the stage. */
export const bookCamera = (left: number, top: number): Camera => ({
  x: BOOK.x + (CX - left) * BOOK_SCALE,
  y: BOOK.y + (CY - top) * BOOK_SCALE,
  zoom: 1 / BOOK_SCALE,
  tilt: 0,
  roll: 0,
})

/** Book view: where the setup storybook sits (and where the clip ends). */
export const BOOK_VIEW = bookCamera(96, 130)
/** Where the Student login's open book sits (where the clip starts). */
export const LOGIN_VIEW = bookCamera(96, 92)

/** A point on the right page (in the page's own 572 x 698 pixels) -> the world. */
export const rightPageToWorld = (x: number, y: number) => ({
  x: BOOK.x + (608 + x) * BOOK_SCALE,
  y: BOOK.y + (20 + y) * BOOK_SCALE,
})

// ---------- Hands ----------

/** How wide a hand picture is drawn in the world: the hand itself is about 40% of the book's height. */
export const HAND_W = 240
const handScale = (hand: { width: number }) => HAND_W / hand.width
export const HAND_LEFT_H = bedroomLayout.hands.left.height * handScale(bedroomLayout.hands.left)
export const HAND_RIGHT_H = bedroomLayout.hands.right.height * handScale(bedroomLayout.hands.right)
/** The pencil's tip, from the right hand picture's top-left corner (world pixels). */
export const PENCIL_TIP = {
  x: bedroomLayout.hands.right.tip.x * handScale(bedroomLayout.hands.right),
  y: bedroomLayout.hands.right.tip.y * handScale(bedroomLayout.hands.right),
}

/** A hand turns around this point of its picture (world pixels from its top-left corner). */
export const handPivot = (height: number) => ({ x: HAND_W / 2, y: height * 0.3 })

/**
 * The right hand's pose with the pencil's tip on a point of the world, the
 * hand turned by `rot` degrees (clockwise: the arm comes more from below).
 */
export function rightHandWithTipAt(tip: { x: number; y: number }, rot: number): HandPose {
  const pivot = handPivot(HAND_RIGHT_H)
  const a = (rot * Math.PI) / 180
  const dx = PENCIL_TIP.x - pivot.x
  const dy = PENCIL_TIP.y - pivot.y
  return {
    x: tip.x - pivot.x - (dx * Math.cos(a) - dy * Math.sin(a)),
    y: tip.y - pivot.y - (dx * Math.sin(a) + dy * Math.cos(a)),
    rot,
  }
}

/** Where a hand picture is: its top-left corner in the world. The sleeve's cut edge is its bottom. */
export interface HandPose {
  x: number
  y: number
  /** Degrees, around the middle of the hand. */
  rot?: number
  /** 0..1: how dark its shadow is (1 = resting on the desk). */
  shadow?: number
  /** Its size (1 = as drawn), around the middle of the hand. */
  scale?: number
  /** 0..1 (default 1). */
  opacity?: number
}

// ---------- One frame ----------

/** Everything the bedroom shows at one moment. Only transforms and opacities change. */
export interface BedroomFrame {
  cam: Camera
  /** 1 = the room is out of focus (the camera is on the book), 0 = sharp. */
  soft: number
  /** 0..1: the desk dims a little while the room is in focus. */
  deskDim: number
  /** 0..1: the lamp's light dips (its one soft flicker). */
  lampDip: number
  /** 0..1: how bright the moonbeam is. */
  moon: number
  /** 0..1: the star by the moon twinkling. */
  star: number
  left: HandPose | null
  /** The right hand holding the pencil. */
  right: HandPose | null
  /** The right hand, empty (the left hand's picture, mirrored). */
  rightOpen?: HandPose | null
  /** 0..1: the desk out of focus (its soft copy fades in). */
  deskSoft?: number
  /** The room and the desk drawn this much bigger than the camera's zoom (0 = as usual): they stretch outward in the rush into the page. */
  stretch?: number
  /** Seconds, for the dust drifting in the lamp's light. null = no dust. */
  dust: number | null
  /** 0..1: how visible the dust is (it fades in and out with the clip). */
  dustLevel: number
  /**
   * Warm-up: everything that is normally hidden is drawn almost invisibly, so
   * the browser gets every picture ready before the clip starts moving.
   */
  warm?: boolean
}

/** The bedroom as the setup storybook sees it: book view, soft room, no hands, nothing moving. */
export const STILL_FRAME: BedroomFrame = {
  cam: BOOK_VIEW,
  soft: 1,
  deskDim: 0,
  lampDip: 0,
  moon: 0.5,
  star: 0,
  left: null,
  right: null,
  dust: null,
  dustLevel: 0,
}

// ---------- Where the layers go ----------

/**
 * Parallax: how much of the camera's move a layer follows (1 = all of it).
 * The wall moves least; the shelf, chair and bed a bit more each (sideways,
 * so the bed slides past the shelf a little); the desk, book and hands the most.
 * Up and down the room follows only a quarter of the move: looking up, the
 * desk (with its tall lamp) drops right out of view while the room stays in it.
 */
export interface Parallax {
  x: number
  y: number
  zoom: number
}
export const PARALLAX = {
  wall: { x: 0.45, y: 0.25, zoom: 0.5 },
  shelf: { x: 0.47, y: 0.25, zoom: 0.5 },
  chair: { x: 0.5, y: 0.25, zoom: 0.5 },
  bed: { x: 0.53, y: 0.25, zoom: 0.5 },
  desk: { x: 1, y: 1, zoom: 1 },
} satisfies Record<string, Parallax>

const px = (n: number) => `${n.toFixed(2)}px`

/** CSS transform (origin 0 0) of a layer whose contents are placed in world coordinates. */
export function layerTransform(cam: Camera, p: Parallax) {
  const z = 1 + (cam.zoom - 1) * p.zoom
  const dx = -(cam.x - CX) * p.x
  const dy = -(cam.y - CY) * p.y
  return `translate(${px(CX + z * (dx - CX))}, ${px(CY + z * (dy - CY))}) scale(${z.toFixed(5)})`
}

/** CSS transform (origin 0 0) of the book's box (1216 x 748, drawn in its own pixels). */
export function bookTransform(cam: Camera) {
  return `translate(${px(CX + cam.zoom * (BOOK.x - cam.x))}, ${px(CY + cam.zoom * (BOOK.y - cam.y))}) scale(${(cam.zoom * BOOK_SCALE).toFixed(5)})`
}

/** CSS transform of the whole world for the camera's tilt and roll. */
export const tiltTransform = (cam: Camera) => `rotateX(${(-cam.tilt).toFixed(3)}deg) rotate(${cam.roll.toFixed(3)}deg)`

// ---------- The room and the desk, in world coordinates ----------

/** The room pictures are drawn at this scale; the back wall's top-left corner at HOME. */
export const ROOM_SCALE = 0.78
export const ROOM = { x: -520, y: -190 }
/** A point of the back-wall picture (its own 3168 x 1344 pixels), as a place inside a room layer. */
export const roomPoint = (x: number, y: number) => ({ x: ROOM.x + x * ROOM_SCALE, y: ROOM.y + y * ROOM_SCALE })

/** The desk picture: a little narrower than drawn, so the lamp and the pencil cup both fit the pulled-back view. */
export const DESK = { x: -315, y: -232, width: bedroomLayout.desk.width * 0.745, height: bedroomLayout.desk.height * 0.82 }
/** The back edge of the desk top (world y): the room shows above it. */
export const DESK_BACK_Y = 373
