// Dev tool: cut human_boy.png / human_girl.png into body parts and trace each
// part with vtracer. Same method as rig-otter.mjs and rig-fox.mjs: nothing is
// drawn by hand, every shape comes from the PNG; the cut lines are simple masks
// measured from the artwork.
//
// Run: npm run rig:boy   or   npm run rig:girl
// Writes:
//   src/companions/<who>/parts/<part>.svg          each traced part (for checking)
//   src/companions/<who>/<who>Parts.generated.ts   the shapes used by <Who>Rig.tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import vtracer from '@visioncortex/vtracer'

const who = process.argv[2]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Same high-detail colour settings as trace-human.mjs: small specks kept and
// small colour steps kept, so the eyes, highlights and mouth stay sharp.
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

// ---- Measurements --------------------------------------------------------------
// All in "view units": the 5000 px PNG viewed at 1932 px (1 unit = 2.588 px).
// Both kids are mirror-symmetric around x = 965, so only the left side is listed.
const K = 5000 / 1932
const MID = 965
const mirror = (x) => (x <= MID ? x : 2 * MID - x)

const lerpTable = (table) => (v) => {
  if (v <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) if (v <= table[i][0]) {
    const [a, fa] = table[i - 1], [b, fb] = table[i]
    return fa + ((fb - fa) * (v - a)) / (b - a)
  }
  return table.at(-1)[1]
}

// Arms (same on both kids): from just under the shoulder (y 1120) to below the
// hands, everything outside the shirt's side seam. The seam's x, by y:
const ARM_TOP = 1120
const ARM_BOTTOM = 1452
const armEdge = lerpTable([[1120, 833], [1140, 833], [1170, 824], [1200, 815], [1250, 801], [1300, 790], [1350, 780], [1400, 772], [1452, 768]])
const NECK_OVERLAP = 20 // body reaches this far under the chin (neck only), so no gap opens when the head tilts

const CONFIG = {
  boy: {
    // Bottom of the head (just below its outline), by x. Under x 780 it drops
    // lower to keep the hair tufts behind the neck, then rises to the jaw.
    chin: lerpTable([[0, 1066], [780, 1066], [800, 1043], [820, 1018], [840, 1008], [860, 1006], [900, 1009], [965, 1012]]),
    // Legs (shorts + shoes) start here; the body reaches a bit under them.
    legs: { from: () => 1540, bodyOverlap: 40 },
    hair: ['#605576', '#5B4A6A', '#574766'],
    mouthBox: [915, 870, 1015, 912],
  },
  girl: {
    chin: lerpTable([[0, 1008], [800, 1008], [820, 1010], [840, 1008], [860, 1006], [900, 1010], [965, 1013]]),
    // Legs start just under the skirt hem (by x). GirlRig draws them behind the skirt.
    legs: { from: lerpTable([[700, 1624], [740, 1624], [760, 1628], [780, 1632], [800, 1636], [830, 1638], [900, 1640], [930, 1643], [965, 1642]]), bodyOverlap: 0 },
    // Hair, plus the red bow (it bounces with the hair).
    hair: ['#9E766E', '#9C6862', '#FB8D8A', '#FD9F99', '#FC9A95'],
    // The bow's darker edge pieces: anything reddish that sits wholly above y 500.
    bowAbove: 500,
    mouthBox: [900, 850, 1030, 905],
  },
}[who]
if (!CONFIG) throw new Error('usage: node scripts/rig-human.mjs boy|girl')

const isHead = (x, y) => y < CONFIG.chin(mirror(x))
const isArmLeft = (x, y) => y >= ARM_TOP && y <= ARM_BOTTOM && x < armEdge(y)
const isArmRight = (x, y) => isArmLeft(2 * MID - x, y)
const isLeg = (x, y) => y >= CONFIG.legs.from(mirror(x))
const PARTS = {
  head: isHead,
  armLeft: isArmLeft,
  armRight: isArmRight,
  legLeft: (x, y) => isLeg(x, y) && x < MID,
  legRight: (x, y) => isLeg(x, y) && x >= MID,
  // Torso, neck and clothes (the girl's skirt too).
  body: (x, y) =>
    y >= CONFIG.chin(mirror(x)) - (Math.abs(x - MID) < 105 ? NECK_OVERLAP : 0) &&
    y < CONFIG.legs.from(mirror(x)) + CONFIG.legs.bodyOverlap &&
    !isArmLeft(x, y) &&
    !isArmRight(x, y),
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
  return b.map((v) => v / K) // in view units
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const near = (fill, target, tol) => { const a = hex(fill), t = hex(target); return Math.max(...a.map((v, i) => Math.abs(v - t[i]))) <= tol }
const inBox = (b, [x0, y0, x1, y1]) => b[0] >= x0 && b[1] >= y0 && b[2] <= x1 && b[3] <= y1

// Sub-groups picked out of the traced head, by colour and position.
const EYE_AREAS = [[700, 560, 845, 820], [1085, 560, 1230, 820]]
function subgroup(part, fill, b) {
  if (part !== 'head') return 'base'
  if (EYE_AREAS.some((a) => inBox(b, a)) && (near(fill, '#50322C', 24) || near(fill, '#FFEFCE', 24))) return 'eyes'
  if (inBox(b, CONFIG.mouthBox) && near(fill, '#7B5062', 30)) return 'mouth'
  if (CONFIG.hair.some((c) => near(fill, c, 10))) return 'hair'
  const [r, g] = hex(fill)
  if (CONFIG.bowAbove && b[3] < CONFIG.bowAbove && r - g > 60) return 'hair'
  return 'base'
}

// ---- Run ------------------------------------------------------------------------
const t0 = performance.now()
const outDir = resolve(root, 'src/companions', who)
const { w, h, rgba } = decodePng(readFileSync(resolve(root, `src/assets/companions/human_${who}.png`)))
mkdirSync(resolve(outDir, 'parts'), { recursive: true })

const result = { belly: [] } // no separate belly patch on the kids
for (const [name, inPart] of Object.entries(PARTS)) {
  const masked = new Uint8Array(rgba) // copy, then clear everything outside the part
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const i = (Y * w + X) * 4
    if (masked[i + 3] && !inPart(X / K, Y / K)) masked[i + 3] = 0
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
if (process.argv.includes('--colors')) {
  const fills = {}
  for (const [, f] of result.head) fills[f] = (fills[f] ?? 0) + 1
  console.log('head fills:', JSON.stringify(fills))
}

const ts = `// Generated by scripts/rig-human.mjs from human_${who}.png (vtracer). Do not edit by hand.
// Each part: its traced shapes back to front, as [path data, fill colour, sub-group].
// Coordinates = the PNG's 5000 x 5000 canvas.
import type { RigParts } from '../TracedRig'

export const ${who}Parts: RigParts = ${JSON.stringify(result)}
`
writeFileSync(resolve(outDir, `${who}Parts.generated.ts`), ts)
console.log(`done in ${((performance.now() - t0) / 1000).toFixed(1)}s, ${(Buffer.byteLength(ts) / 1024).toFixed(1)} KB of shapes`)
