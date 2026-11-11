/**
 * Depth sorting. Every standing thing (prop, character, buddy) has a footprint
 * on the floor, in tiles. One thing is in front of another when its footprint
 * starts past where the other's ends, so characters pass behind and in front
 * of desks correctly in both angles.
 */
import type { Container } from 'pixi.js'

export interface DepthItem {
  view: Container
  x0: number
  y0: number
  x1: number
  y1: number
}

const EPS = 1e-6

/** Is a drawn in front of b? */
function frontOf(a: DepthItem, b: DepthItem, diag: boolean): boolean {
  return diag ? a.x0 >= b.x1 - EPS || a.y0 >= b.y1 - EPS : a.y0 >= b.y1 - EPS
}

/** Sets every item's zIndex (its layer must have sortableChildren on). */
export function sortDepth(items: readonly DepthItem[], diag: boolean) {
  const n = items.length
  // Only things that can overlap on screen need ordering against each other.
  const left = new Float32Array(n)
  const right = new Float32Array(n)
  const key = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const it = items[i]
    if (diag) {
      left[i] = it.x0 - it.y1 - 2.4
      right[i] = it.x1 - it.y0 + 2.4
      key[i] = it.x0 + it.x1 + it.y0 + it.y1
    } else {
      left[i] = it.x0 - 1.6
      right[i] = it.x1 + 1.6
      key[i] = (it.y0 + it.y1) * 10 + (it.x0 + it.x1) * 0.001
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => key[a] - key[b])

  const done = new Uint8Array(n)
  let z = 0
  const visit = (i: number) => {
    if (done[i]) return
    done[i] = 1
    // Everything behind this one is placed first.
    for (const j of order) {
      if (j === i || done[j]) continue
      if (right[j] <= left[i] || left[j] >= right[i]) continue
      if (frontOf(items[i], items[j], diag) && !frontOf(items[j], items[i], diag)) visit(j)
    }
    items[i].view.zIndex = z++
  }
  for (const i of order) visit(i)
}
