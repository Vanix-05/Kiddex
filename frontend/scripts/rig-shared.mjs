// Dev tool helper: what rig-human.mjs (the boy and girl) and rig-wardrobe.mjs
// (their clothes and hair pieces) share. Same canvas, same body, same cut
// lines, same vtracer settings, same PNG decoder.
import { inflateSync } from 'node:zlib'
import vtracer from '@visioncortex/vtracer'

// Same high-detail colour settings as trace-human.mjs: small specks kept and
// small colour steps kept, so the eyes, highlights and mouth stay sharp.
export const TRACE = {
  clustering: 'color-cluster',
  hierarchical: 'stacked',
  mode: 'spline',
  filterSpeckle: 2,
  colorPrecision: 8,
  layerDifference: 6,
  cornerThreshold: 60,
  lengthThreshold: 4,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 1,
}

// ---- Measurements --------------------------------------------------------------
// All in "view units": the 5000 px PNG viewed at 1932 px (1 unit = 2.588 px).
// Both kids are mirror-symmetric around x = 965, so only the left side is listed.
export const K = 5000 / 1932
export const MID = 965
export const mirror = (x) => (x <= MID ? x : 2 * MID - x)

export const lerpTable = (table) => (v) => {
  if (v <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) if (v <= table[i][0]) {
    const [a, fa] = table[i - 1], [b, fb] = table[i]
    return fa + ((fb - fa) * (v - a)) / (b - a)
  }
  return table.at(-1)[1]
}

// Arms (same on both kids): from the top of the shoulder (y 1085) to below the
// hands, everything outside the shirt's side seam. The seam's x, by y:
export const ARM_TOP = 1085
export const ARM_BOTTOM = 1452
export const armEdge = lerpTable([[1085, 833], [1140, 833], [1170, 824], [1200, 815], [1250, 801], [1300, 790], [1350, 780], [1400, 772], [1452, 768]])
export const NECK_OVERLAP = 20 // body reaches this far under the chin (neck only), so no gap opens when the head tilts

/** Bottom of the head (just below its outline), by x (left side; use with mirror). */
export const CHIN = {
  // Under x 780 it drops lower to keep the boy's hair tufts behind the neck, then rises to the jaw.
  boy: lerpTable([[0, 1066], [780, 1066], [800, 1043], [820, 1018], [840, 1008], [860, 1006], [900, 1009], [965, 1012]]),
  girl: lerpTable([[0, 1008], [800, 1008], [820, 1010], [840, 1008], [860, 1006], [900, 1010], [965, 1013]]),
}

/** Where each kid's calm mouth is (view units, [x0, y0, x1, y1]). */
export const MOUTH_BOX = {
  boy: [915, 870, 1015, 912],
  girl: [900, 850, 1030, 905],
}

export const isArmLeft = (x, y) => y >= ARM_TOP && y <= ARM_BOTTOM && x < armEdge(y)
export const isArmRight = (x, y) => isArmLeft(2 * MID - x, y)

// ---- Decode the PNG (8-bit RGBA, non-interlaced) -----------------------------
export function decodePng(buf) {
  let p = 8, w = 0, h = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('expected 8-bit RGBA, non-interlaced PNG')
    }
    if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = y * stride, prev = row - stride
    for (let x = 0; x < stride; x++) {
      const r = raw[y * (stride + 1) + 1 + x]
      const a = x >= 4 ? out[row + x - 4] : 0, b = y ? out[prev + x] : 0, c = x >= 4 && y ? out[prev + x - 4] : 0
      let v
      if (f === 0) v = r
      else if (f === 1) v = r + a
      else if (f === 2) v = r + b
      else if (f === 3) v = r + ((a + b) >> 1)
      else { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
      out[row + x] = v & 255
    }
  }
  return { w, h, rgba: out }
}

// ---- Path helpers -------------------------------------------------------------
// vtracer paths use M/m, C/c, Z: enough to get a bounding box from the points.
export function bbox(d) {
  let x = 0, y = 0, sx = 0, sy = 0
  const b = [Infinity, Infinity, -Infinity, -Infinity]
  const add = (px, py) => { b[0] = Math.min(b[0], px); b[1] = Math.min(b[1], py); b[2] = Math.max(b[2], px); b[3] = Math.max(b[3], py) }
  for (const [, cmd, args] of d.matchAll(/([MmCcZz])([^MmCcZz]*)/g)) {
    const n = (args.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number)
    if (cmd === 'M') { x = n[0]; y = n[1]; sx = x; sy = y; add(x, y) }
    else if (cmd === 'm') { x += n[0]; y += n[1]; sx = x; sy = y; add(x, y) }
    else if (cmd === 'C') for (let i = 0; i + 5 < n.length; i += 6) { add(n[i], n[i + 1]); add(n[i + 2], n[i + 3]); x = n[i + 4]; y = n[i + 5]; add(x, y) }
    else if (cmd === 'c') for (let i = 0; i + 5 < n.length; i += 6) { add(x + n[i], y + n[i + 1]); add(x + n[i + 2], y + n[i + 3]); x += n[i + 4]; y += n[i + 5]; add(x, y) }
    else { x = sx; y = sy }
  }
  return b.map((v) => v / K) // in view units
}
export const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
export const near = (fill, target, tol) => { const a = hex(fill), t = hex(target); return Math.max(...a.map((v, i) => Math.abs(v - t[i]))) <= tol }
export const inBox = (b, [x0, y0, x1, y1]) => b[0] >= x0 && b[1] >= y0 && b[2] <= x1 && b[3] <= y1

/** The two eyes' areas (view units). Dark pupils and the light rings inside them are the `eyes` group. */
export const EYE_AREAS = [[700, 560, 845, 820], [1085, 560, 1230, 820]]
export const isEye = (fill, b) => EYE_AREAS.some((a) => inBox(b, a)) && (near(fill, '#50322C', 24) || near(fill, '#FFEFCE', 24))
/** The calm mouth: an outline-coloured line in the kid's mouth box. */
export const isMouth = (fill, b, mouthBox) => inBox(b, mouthBox) && near(fill, '#7B5062', 30)

// ---- Masks and tracing ------------------------------------------------------------

/** One Uint8Array mask per part (1 = an opaque pixel that `inPart(x, y)` puts in it, in view units). */
export function partMasks({ w, h, rgba }, parts) {
  const masks = {}
  for (const [name, inPart] of Object.entries(parts)) {
    const m = (masks[name] = new Uint8Array(w * h))
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) if (rgba[(Y * w + X) * 4 + 3] && inPart(X / K, Y / K)) m[Y * w + X] = 1
  }
  return masks
}

/**
 * Traces one cut-out part. Returns the SVG and its shapes back to front (vtracer's
 * order), each [path data, fill colour, sub-group] with `subgroup(fill, bbox)`.
 */
export function traceShapes(masked, w, h, subgroup) {
  const svg = vtracer.convertPixels(masked, w, h, TRACE).replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)"/, '<svg $1viewBox="0 0 $2 $3" width="$2" height="$3"')
  const shapes = [...svg.matchAll(/<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"\/>/g)].map(([, d, fill]) => [
    d,
    fill.toUpperCase(),
    subgroup(fill.toUpperCase(), bbox(d)),
  ])
  return { svg, shapes }
}

/** "head  base:12 hair:26" */
export const countGroups = (shapes) => {
  const count = {}
  for (const s of shapes) count[s[2]] = (count[s[2]] ?? 0) + 1
  return Object.entries(count).map(([g, n]) => `${g}:${n}`).join(' ')
}
