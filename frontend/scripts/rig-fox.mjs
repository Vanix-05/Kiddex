// Dev tool: cut pet_fox.png into body parts and trace each part with vtracer.
// Same method as rig-otter.mjs: the fox is drawn on the same body template as
// the otter (same arms, legs, hips and neck), so most cut lines are shared.
// What differs: the chin line (cheek fur tufts), belly/eye colours, ears.
// Nothing is drawn by hand: every shape comes from the PNG. The cut lines are
// simple masks (head / arms / body / legs) measured from the artwork.
//
// Run: npm run rig:fox
// Writes:
//   src/companions/fox/parts/<part>.svg         each traced part (for checking)
//   src/companions/fox/foxParts.generated.ts     the shapes used by FoxRig.tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import vtracer from '@visioncortex/vtracer'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = resolve(root, 'src/assets/companions/pet_fox.png')
const outDir = resolve(root, 'src/companions/fox')

// Same high-detail colour settings as trace-fox.mjs.
const TRACE = {
  clustering: 'color-cluster',
  hierarchical: 'stacked',
  mode: 'spline',
  filterSpeckle: 4,
  colorPrecision: 8,
  layerDifference: 8,
  cornerThreshold: 60,
  lengthThreshold: 4,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 1,
}

// ---- Decode the PNG (8-bit RGBA, non-interlaced) -----------------------------
function decodePng(buf) {
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

// ---- Cut lines --------------------------------------------------------------
// Measured on a 600 x 1000 box around the fox body, same box as the otter ("box units"):
// PNG x = 1330 + 3.9 * bx, PNG y = 850 + 3.9 * by.
const S = 3.9, OX = 1330, OY = 850
const toBox = (X, Y) => [(X - OX) / S, (Y - OY) / S]
const toPng = (bx, by) => [OX + S * bx, OY + S * by]

const lerpTable = (table) => (v) => {
  if (v <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) if (v <= table[i][0]) {
    const [a, fa] = table[i - 1], [b, fb] = table[i]
    return fa + ((fb - fa) * (v - a)) / (b - a)
  }
  return table.at(-1)[1]
}
// Bottom of the head (just below its outline, cheek tufts included), by x on the left half.
// Measured from the PNG: lowest outline pixel per column + ~3 box units.
const chinLeft = lerpTable([[0, 436], [150, 436], [176, 438], [203, 445], [229, 448], [256, 451], [283, 454], [300, 455]])
const chinY = (bx) => chinLeft(bx <= 300 ? bx : 600 - bx)
// Where each arm meets the torso, by y (left arm; the right arm is mirrored).
const armEdge = lerpTable([[440, 218], [455, 214], [480, 203], [520, 187], [560, 175], [600, 163], [640, 152], [680, 144], [720, 138], [760, 134]])
const HIP_Y = 792 // legs start here
const OVERLAP = 14 // box units of extra body under the head and legs, so no gaps open when they move

const isHead = (bx, by) => by < chinY(bx)
// Arms start below the head (y 436+), so no stray bits of the head outline end up in them.
const isArmLeft = (bx, by) => by >= Math.max(chinY(bx), 436) && by <= 770 && bx < armEdge(by)
const isArmRight = (bx, by) => isArmLeft(600 - bx, by)
const PARTS = {
  head: isHead,
  armLeft: isArmLeft,
  armRight: isArmRight,
  legLeft: (bx, by) => by >= HIP_Y && bx < 300,
  legRight: (bx, by) => by >= HIP_Y && bx >= 300,
  // Torso, neck, belly, hips. Reaches a little under the chin (neck only) and
  // under the legs, so no gaps open when the head tilts or the legs step.
  body: (bx, by) =>
    by >= chinY(bx) - (bx > 180 && bx < 420 ? OVERLAP : 0) && by < HIP_Y + 40 + OVERLAP && !isArmLeft(bx, by) && !isArmRight(bx, by),
  // The cream chest bib on its own (cut by colour), drawn over the body so it can breathe.
  belly: (bx, by, r, g, b) =>
    by > 455 && by < 800 && bx > 180 && bx < 420 && Math.abs(r - 0xfc) < 14 && Math.abs(g - 0xf5) < 14 && Math.abs(b - 0xee) < 14,
}

// ---- Path helpers -------------------------------------------------------------
// vtracer paths use M/m, C/c, Z: enough to get a bounding box from the points.
function bbox(d) {
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
  return b
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const near = (fill, target, tol) => { const a = hex(fill), t = hex(target); return Math.max(...a.map((v, i) => Math.abs(v - t[i]))) <= tol }
const inBox = (b, [x0, y0, x1, y1]) => { const [a, c] = toPng(x0, y0), [e, f] = toPng(x1, y1); return b[0] >= a && b[1] >= c && b[2] <= e && b[3] <= f }

// Sub-groups picked out of the traced head and body, by colour and position (box units).
const EYE_AREAS = [[120, 150, 222, 330], [378, 150, 480, 330]]
function subgroup(part, fill, b) {
  if (part === 'head') {
    if (EYE_AREAS.some((a) => inBox(b, a)) && (near(fill, '#5E4642', 24) || near(fill, '#FFEFCE', 24))) return 'eyes'
    if (inBox(b, [270, 315, 330, 352]) && near(fill, '#7B5062', 30)) return 'nose'
    if (inBox(b, [252, 344, 348, 376]) && near(fill, '#7B5062', 30)) return 'mouth'
    // Tall ears: pink inner ear and brown tips.
    if ((inBox(b, [40, -200, 240, 215]) || inBox(b, [360, -200, 560, 215])) && (near(fill, '#F8D8D4', 14) || near(fill, '#A98D7E', 14))) return 'ears'
  }
  return 'base'
}

// ---- Run ------------------------------------------------------------------------
const t0 = performance.now()
const { w, h, rgba } = decodePng(readFileSync(input))
mkdirSync(resolve(outDir, 'parts'), { recursive: true })

// Pre-compute box coordinates once per row/column.
const bxOf = new Float32Array(w), byOf = new Float32Array(h)
for (let X = 0; X < w; X++) bxOf[X] = toBox(X, 0)[0]
for (let Y = 0; Y < h; Y++) byOf[Y] = toBox(0, Y)[1]

const result = {}
for (const [name, inPart] of Object.entries(PARTS)) {
  const masked = new Uint8Array(rgba) // copy, then clear everything outside the part
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const i = (Y * w + X) * 4
    if (masked[i + 3] && !inPart(bxOf[X], byOf[Y], masked[i], masked[i + 1], masked[i + 2])) masked[i + 3] = 0
  }
  const svg = vtracer.convertPixels(masked, w, h, TRACE).replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)"/, '<svg $1viewBox="0 0 $2 $3" width="$2" height="$3"')
  writeFileSync(resolve(outDir, 'parts', `${name}.svg`), svg)
  // Keep vtracer's back-to-front order; tag each shape with its sub-group.
  const shapes = [...svg.matchAll(/<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"\/>/g)].map(([, d, fill]) => [
    d,
    fill.toUpperCase(),
    subgroup(name, fill.toUpperCase(), bbox(d)),
  ])
  result[name] = shapes
  const count = {}
  for (const s of shapes) count[s[2]] = (count[s[2]] ?? 0) + 1
  console.log(name.padEnd(9), Object.entries(count).map(([g, n]) => `${g}:${n}`).join(' '))
}

const ts = `// Generated by scripts/rig-fox.mjs from pet_fox.png (vtracer). Do not edit by hand.
// Each part: its traced shapes back to front, as [path data, fill colour, sub-group].
// Coordinates = the PNG's 5000 x 5000 canvas.
import type { RigParts } from '../TracedRig'

export const foxParts: RigParts = ${JSON.stringify(result)}
`
writeFileSync(resolve(outDir, 'foxParts.generated.ts'), ts)
console.log(`done in ${((performance.now() - t0) / 1000).toFixed(1)}s, ${(Buffer.byteLength(ts) / 1024).toFixed(1)} KB of shapes`)
