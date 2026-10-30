// Dev tool: cut a pet PNG into body parts and trace each part with vtracer.
// For pets drawn on the shared body template (same torso, arms, legs, neck and
// chin line as the otter, fox and kitty): the raccoon, ram, monkey and dog. Same
// method as rig-kitty.mjs, with the kitty's measured cut lines; nothing is
// drawn by hand, every shape comes from the PNG. Ears, horns and hair tufts
// stay part of the head, so they move with it.
//
// Run: npm run rig:raccoon   (or rig:ram, rig:monkey, rig:dog)
// Writes:
//   src/companions/<pet>/parts/<part>.svg            each traced part (for checking)
//   src/companions/<pet>/<pet>Parts.generated.ts     the shapes used by <Pet>Rig.tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import vtracer from '@visioncortex/vtracer'

// ---- Per-pet settings -----------------------------------------------------------
// chinSides: how far down (box units) the head reaches at the far left/right,
// outside the shoulders. The ram's curled horns and the dog's floppy ears hang
// lower than the chin there.
const PETS = {
  raccoon: { chinSides: 440 },
  monkey: { chinSides: 440 },
  ram: { chinSides: 485 },
  dog: { chinSides: 478 }, // ears end at about 467
}

const pet = process.argv[2]
if (!PETS[pet]) {
  console.error(`Usage: node scripts/rig-pet.mjs <${Object.keys(PETS).join('|')}>`)
  process.exit(1)
}
const { chinSides } = PETS[pet]

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = resolve(root, `src/assets/companions/pet_${pet}.png`)
const outDir = resolve(root, `src/companions/${pet}`)

// Same settings as rig-kitty.mjs: high detail, small speck filter and small
// colour steps, so the eyes and face markings stay sharp.
const TRACE = {
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

// ---- Cut lines (the shared body template, as measured for rig-kitty.mjs) --------
// "Box units": a 600 x 1000 box around the body. PNG x = 1330 + 3.9 * bx, PNG y = 850 + 3.9 * by.
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
const mirror = (bx) => (bx <= 300 ? bx : 600 - bx)
// Bottom of the head (just below its outline), by x on the left half. Outside the
// shoulders (x < 150) there's no body, so the head can reach lower there (horns).
const chinLeft = lerpTable([[0, chinSides], [150, chinSides], [177, 440], [190, 442], [203, 446], [216, 446], [230, 448], [243, 450], [256, 452], [283, 455], [300, 456]])
const chinY = (bx) => chinLeft(mirror(bx))
// Where each arm meets the torso, by y (left arm; the right arm is mirrored).
const armEdge = lerpTable([[440, 218], [455, 214], [480, 203], [520, 187], [560, 175], [600, 163], [640, 152], [680, 144], [720, 138], [760, 134]])
const HIP_Y = 792 // legs start here
const OVERLAP = 14 // extra body under the head and legs, so no gaps open when they move

const isHead = (bx, by) => by < chinY(bx)
// Arms start below the head (y 440+), so no stray bits of the head outline end up in them.
const isArmLeft = (bx, by) => by >= Math.max(chinY(bx), 436) && by <= 770 && bx < armEdge(by)
const isArmRight = (bx, by) => isArmLeft(600 - bx, by)
const PARTS = {
  head: isHead,
  armLeft: isArmLeft,
  armRight: isArmRight,
  legLeft: (bx, by) => by >= HIP_Y && bx < 300,
  legRight: (bx, by) => by >= HIP_Y && bx >= 300,
  // Torso, neck, hips. Reaches a little under the chin (neck only) and under the
  // legs, so no gaps open when the head tilts or the legs step.
  body: (bx, by) =>
    by >= chinY(bx) - (bx > 180 && bx < 420 ? OVERLAP : 0) && by < HIP_Y + 40 + OVERLAP && !isArmLeft(bx, by) && !isArmRight(bx, by),
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
const inBox = (b, [x0, y0, x1, y1]) => { const [a, c] = toPng(x0, y0), [e, f] = toPng(x1, y1); return b[0] >= a && b[1] >= c && b[2] <= e && b[3] <= f }

// Sub-groups picked out of the traced head by position (box units): any shape
// that fits inside an eye area is part of an eye (pupil + shine), so it blinks.
// The template puts the eyes, nose and mouth in the same spots on every pet.
const EYE_AREAS = [[120, 150, 222, 330], [378, 150, 480, 330]]
const NOSE_AREA = [270, 315, 330, 352]
const MOUTH_AREA = [250, 345, 350, 420] // roomy: the monkey's tongue hangs lower
function subgroup(part, b) {
  if (part !== 'head') return 'base'
  if (EYE_AREAS.some((a) => inBox(b, a))) return 'eyes'
  if (inBox(b, NOSE_AREA)) return 'nose'
  if (inBox(b, MOUTH_AREA)) return 'mouth'
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

const result = { belly: [] } // no separate belly patch
for (const [name, inPart] of Object.entries(PARTS)) {
  const masked = new Uint8Array(rgba) // copy, then clear everything outside the part
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const i = (Y * w + X) * 4
    if (masked[i + 3] && !inPart(bxOf[X], byOf[Y])) masked[i + 3] = 0
  }
  const svg = vtracer.convertPixels(masked, w, h, TRACE).replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)"/, '<svg $1viewBox="0 0 $2 $3" width="$2" height="$3"')
  writeFileSync(resolve(outDir, 'parts', `${name}.svg`), svg)
  // Keep vtracer's back-to-front order; tag each shape with its sub-group.
  result[name] = [...svg.matchAll(/<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"\/>/g)].map(([, d, fill]) => [
    d,
    fill.toUpperCase(),
    subgroup(name, bbox(d)),
  ])
  const count = {}
  for (const s of result[name]) count[s[2]] = (count[s[2]] ?? 0) + 1
  console.log(name.padEnd(9), Object.entries(count).map(([g, n]) => `${g}:${n}`).join(' '))
}

const ts = `// Generated by scripts/rig-pet.mjs from pet_${pet}.png (vtracer). Do not edit by hand.
// Each part: its traced shapes back to front, as [path data, fill colour, sub-group].
// Coordinates = the PNG's 5000 x 5000 canvas.
import type { RigParts } from '../TracedRig'

export const ${pet}Parts: RigParts = ${JSON.stringify(result)}
`
writeFileSync(resolve(outDir, `${pet}Parts.generated.ts`), ts)
console.log(`done in ${((performance.now() - t0) / 1000).toFixed(1)}s, ${(Buffer.byteLength(ts) / 1024).toFixed(1)} KB of shapes`)
