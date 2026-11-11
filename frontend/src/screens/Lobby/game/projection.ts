/**
 * Floor tiles -> screen pixels, for both camera angles. The room, collision
 * and pathfinding all work in tile coordinates; only the projection changes.
 *
 * - Diagonal: the room is turned like a diamond.
 * - Straight: front-on. The back wall is tall, the side walls are low.
 */
export type Angle = 'diag' | 'straight'
export type Vec2 = readonly [number, number]

/** One floor tile on screen in the diagonal view. */
const TW = 96
const TH = 48
/** One floor tile on screen in the straight view. */
const SX = 64
const SY = 40
/** Back wall height in px. */
export const WALL = 150

export interface Projection {
  angle: Angle
  diag: boolean
  /** Tile (x, y) at height z px -> world px. */
  P: (x: number, y: number, z?: number) => [number, number]
  /** One tile along a wall, in wall-local px. */
  unit: number
  /** World px on the floor -> tile. */
  toFloor: (X: number, Y: number) => { x: number; y: number }
  /** A direction on screen (right, down) -> the same direction on the floor, length 1. */
  floorDir: (sx: number, sy: number) => { x: number; y: number }
  /** Which way a floor step faces on screen: > 0 = right. */
  screenDx: (dx: number, dy: number) => number
  /** Radii of a circle of `r` tiles lying on the floor. */
  floorEllipse: (r: number) => [number, number]
}

export function makeProjection(angle: Angle): Projection {
  const diag = angle === 'diag'
  const unit = (x: number, y: number) => {
    const d = Math.hypot(x, y) || 1
    return { x: x / d, y: y / d }
  }
  if (diag) {
    return {
      angle,
      diag,
      P: (x, y, z = 0) => [((x - y) * TW) / 2, ((x + y) * TH) / 2 - z],
      unit: TW / 2,
      toFloor: (X, Y) => {
        const a = X / (TW / 2)
        const b = Y / (TH / 2)
        return { x: (a + b) / 2, y: (b - a) / 2 }
      },
      floorDir: (sx, sy) => unit(sx / TW + sy / TH, sy / TH - sx / TW),
      screenDx: (dx, dy) => dx - dy,
      floorEllipse: (r) => [((r * TW) / Math.SQRT2) * 0.72, ((r * TH) / Math.SQRT2) * 0.72],
    }
  }
  return {
    angle,
    diag,
    P: (x, y, z = 0) => [x * SX, y * SY - z],
    unit: SX,
    toFloor: (X, Y) => ({ x: X / SX, y: Y / SY }),
    floorDir: (sx, sy) => unit(sx, sy),
    screenDx: (dx) => dx,
    floorEllipse: (r) => [r * SX * 0.76, r * SY * 0.76],
  }
}
