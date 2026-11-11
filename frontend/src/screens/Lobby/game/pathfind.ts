/**
 * Click-to-walk: A* on a 0.25-tile grid, then the path is straightened by line
 * of sight so characters walk in clean lines around the desks.
 */
import { isFree, RD, RW } from './room'

export interface Point {
  x: number
  y: number
}

const CELL = 0.25
const COLS = Math.round(RW / CELL)
const ROWS = Math.round(RD / CELL)
const SQRT2 = Math.SQRT2

/** 1 = blocked. The room never changes, so this is built once. */
const grid = new Uint8Array(COLS * ROWS)
for (let j = 0; j < ROWS; j++) {
  for (let i = 0; i < COLS; i++) grid[j * COLS + i] = isFree((i + 0.5) * CELL, (j + 0.5) * CELL) ? 0 : 1
}

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v))
const cellOf = (x: number, y: number): [number, number] => [
  clamp(Math.floor(x / CELL), COLS - 1),
  clamp(Math.floor(y / CELL), ROWS - 1),
]
const centre = (n: number): Point => ({ x: ((n % COLS) + 0.5) * CELL, y: (Math.floor(n / COLS) + 0.5) * CELL })

/** The closest walkable cell, searching outward in rings. */
function nearestFreeCell(i: number, j: number): number | null {
  if (!grid[j * COLS + i]) return j * COLS + i
  for (let r = 1; r < 30; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const a = i + di
        const b = j + dj
        if (a >= 0 && b >= 0 && a < COLS && b < ROWS && !grid[b * COLS + a]) return b * COLS + a
      }
    }
  }
  return null
}

/** Can a character walk straight from a to b? */
export function lineFree(ax: number, ay: number, bx: number, by: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.08)
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    if (!isFree(ax + (bx - ax) * t, ay + (by - ay) * t)) return false
  }
  return true
}

/** A small binary heap of [priority, cell]. */
class MinHeap {
  private items: [number, number][] = []
  get size() {
    return this.items.length
  }
  push(priority: number, cell: number) {
    const h = this.items
    h.push([priority, cell])
    let i = h.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (h[p][0] <= h[i][0]) break
      ;[h[p], h[i]] = [h[i], h[p]]
      i = p
    }
  }
  pop(): number {
    const h = this.items
    const top = h[0]
    const last = h.pop()!
    if (h.length) {
      h[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < h.length && h[l][0] < h[m][0]) m = l
        if (r < h.length && h[r][0] < h[m][0]) m = r
        if (m === i) break
        ;[h[m], h[i]] = [h[i], h[m]]
        i = m
      }
    }
    return top[1]
  }
}

/**
 * The corners to walk through from (sx, sy) to (tx, ty). A blocked target
 * becomes the nearest free spot. null = no way there.
 */
export function findPath(sx: number, sy: number, tx: number, ty: number): Point[] | null {
  const start = nearestFreeCell(...cellOf(sx, sy))
  const goal = nearestFreeCell(...cellOf(tx, ty))
  if (start === null || goal === null) return null
  const gi = goal % COLS
  const gj = Math.floor(goal / COLS)

  const cost = new Float32Array(COLS * ROWS).fill(1e9)
  const from = new Int32Array(COLS * ROWS).fill(-1)
  const closed = new Uint8Array(COLS * ROWS)
  const heap = new MinHeap()
  const estimate = (n: number) => {
    const dx = Math.abs((n % COLS) - gi)
    const dy = Math.abs(Math.floor(n / COLS) - gj)
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)
  }

  cost[start] = 0
  heap.push(estimate(start), start)
  while (heap.size) {
    const n = heap.pop()
    if (closed[n]) continue
    closed[n] = 1
    if (n === goal) break
    const ci = n % COLS
    const cj = Math.floor(n / COLS)
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue
        const a = ci + di
        const b = cj + dj
        if (a < 0 || b < 0 || a >= COLS || b >= ROWS) continue
        const m = b * COLS + a
        if (grid[m] || closed[m]) continue
        // No cutting a corner between two blocked cells.
        if (di && dj && (grid[cj * COLS + a] || grid[b * COLS + ci])) continue
        const next = cost[n] + (di && dj ? SQRT2 : 1)
        if (next < cost[m]) {
          cost[m] = next
          from[m] = n
          heap.push(next + estimate(m), m)
        }
      }
    }
  }
  if (from[goal] < 0 && goal !== start) return null

  const cells: number[] = []
  for (let n = goal; n !== -1; n = from[n]) cells.push(n)
  cells.reverse()
  const points = cells.map(centre)
  if (isFree(tx, ty)) points[points.length - 1] = { x: tx, y: ty }

  // Straighten: from each corner, jump to the farthest point in plain sight.
  const out: Point[] = []
  let cur: Point = { x: sx, y: sy }
  let i = 0
  while (i < points.length) {
    let j = points.length - 1
    while (j > i && !lineFree(cur.x, cur.y, points[j].x, points[j].y)) j--
    out.push(points[j])
    cur = points[j]
    i = j + 1
  }
  return out
}
