/** A point in PNG pixels (the 5000 x 5000 canvas). */
export type Point = readonly [x: number, y: number]

/** Joint positions in PNG pixels: each part rotates and scales around its own. */
export interface RigPivots {
  feet: Point // landing squash
  middle: Point // sway and lean
  body: Point // hips: breathing
  belly: Point // (kept for the rig files; the belly breathes with the body)
  neck: Point // head nod and tilt
  eyeLine: Point // middle of the eyes
  hair?: Point // top of the hair (companions with a hair group)
  earLeft?: Point // base of each ear (companions with earL / earR groups)
  earRight?: Point
  gillsLeft?: Point // base of each side's gills (gillsL / gillsR groups)
  gillsRight?: Point
  shoulderLeft: Point
  shoulderRight: Point
  hipLeft: Point
  hipRight: Point
}

/** One eye: its centre and half-width / half-height, in PNG pixels. */
export interface EyeBox {
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * Where a companion's face is, for the eyelids, drawn mouths and blush.
 * Measured from its traced parts with scripts/measure-faces.mjs.
 */
export interface RigFace {
  eyes: { left: EyeBox; right: EyeBox }
  /** Mouth centre and half-size. The drawn mouths are sized from it. */
  mouth: { x: number; y: number; w: number; h: number }
  /** Blush spots. */
  cheeks: { left: Point; right: Point }
  colors: {
    /** The face colour right behind the eyes (the eyelid). */
    lid: string
    /** The art's outline colour (lash line, drawn mouths, happy eyes). */
    outline: string
    blush: string
  }
}
