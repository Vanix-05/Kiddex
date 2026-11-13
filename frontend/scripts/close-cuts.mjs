// Dev tool helper: closes the cut lines between a rig's body and arms, so
// nothing breaks or comes loose when the arms swing.
//
// The art is one flat picture cut into parts, so there is nothing drawn behind
// a part. This adds two things, both hidden while the rig is at rest:
//
// 1. The body reaches a little under each arm (bodyReach px) and ends there
//    with its own outline, in the art's outline colour. When an arm lifts, the
//    body's side and shoulder have a clean edge instead of a hole.
// 2. Each arm reaches a few px over the body with the same colours, so no thin
//    light seam shows between them at rest.
//
// All sizes are in PNG pixels (5000 x 5000 canvas).

/** Two-pass chamfer distance (3-4 weights / 3 ~ pixels) from every pixel to the nearest pixel in `from`. */
function distanceFrom(from, w, h, limit) {
  const INF = 1e9, d = new Float32Array(w * h).fill(INF)
  for (let i = 0; i < w * h; i++) if (from[i]) d[i] = 0
  const cap = limit * 3 + 8
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    let v = d[i]
    if (v === 0) continue
    if (x > 0) v = Math.min(v, d[i - 1] + 3)
    if (y > 0) {
      v = Math.min(v, d[i - w] + 3)
      if (x > 0) v = Math.min(v, d[i - w - 1] + 4)
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4)
    }
    d[i] = v > cap ? INF : v
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x
    let v = d[i]
    if (v === 0) continue
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3)
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + 3)
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4)
      if (x > 0) v = Math.min(v, d[i + w - 1] + 4)
    }
    d[i] = v > cap ? INF : v
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3
  return d
}

/**
 * masks: { body, armLeft, armRight } as Uint8Array (1 = pixel in that part), changed in place.
 * Returns `paint`: Uint8Array, 1 = body pixel to draw in the outline colour.
 */
export function closeCuts({ w, h, rgba, masks, bodyReach = 26, lineWidth = 26, armOverlap = 8, outline = [0x7b, 0x50, 0x62] }) {
  const opaque = (i) => rgba[i * 4 + 3] > 0
  const paint = new Uint8Array(w * h)

  // 1. Body reaches under the arms, ending in an outline.
  const arm = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) arm[i] = masks.armLeft[i] || masks.armRight[i]
  // Measured from the body's non-outline pixels: where the body already ends in
  // its own outline (most buddies), this adds almost nothing.
  const [or, og, ob] = outline
  const isLine = (i) => Math.abs(rgba[i * 4] - or) + Math.abs(rgba[i * 4 + 1] - og) + Math.abs(rgba[i * 4 + 2] - ob) < 90
  const seeds = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) seeds[i] = masks.body[i] && !isLine(i) ? 1 : 0
  const dist = distanceFrom(seeds, w, h, bodyReach)
  for (let i = 0; i < w * h; i++) {
    if (!arm[i] || masks.body[i] || !opaque(i) || dist[i] > bodyReach) continue
    masks.body[i] = 1
    if (dist[i] > bodyReach - lineWidth) paint[i] = 1
  }

  // 2. Each arm reaches a few pixels over the body (same colours), so no thin
  //    light seam shows between them at rest.
  const armDist = distanceFrom(arm, w, h, armOverlap)
  for (let i = 0; i < w * h; i++) {
    if (!masks.body[i] || arm[i] || paint[i] || armDist[i] > armOverlap) continue
    // Give it to the nearer arm (left half / right half of the picture).
    masks[(i % w) < w / 2 ? 'armLeft' : 'armRight'][i] = 1
  }
  return paint
}

/** Copy of the picture with only the part's pixels, `paint` pixels in `outline` ([r, g, b]). */
export function cutPart(rgba, mask, paint, outline) {
  const out = new Uint8Array(rgba)
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) out[i * 4 + 3] = 0
    else if (paint && paint[i]) {
      out[i * 4] = outline[0]; out[i * 4 + 1] = outline[1]; out[i * 4 + 2] = outline[2]; out[i * 4 + 3] = 255
    }
  }
  return out
}
