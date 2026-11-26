// Dev tool: trace the kids' wardrobe pieces (src/assets/wardrobe/*.png) into
// rig parts. Every piece sits on the same 5000 x 5000 canvas as
// human_boy.png / human_girl.png, so the same cut lines and joints fit them.
// Same method as rig-human.mjs (shared code in rig-shared.mjs).
//
// Run: npm run rig:wardrobe                   every piece
//      npm run rig:wardrobe -- top/hoodie     one piece (or several)
//      npm run rig:wardrobe -- --colors       also list each piece's fills (to check the recolor keys)
// Writes: src/companions/wardrobe/generated/<folder>-<name>.generated.ts
//         (a Partial<RigParts> with only the parts the piece has)
//
// The PNGs are source art only: the app never imports them.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeCuts, cutPart } from './close-cuts.mjs'
import {
  CHIN,
  MID,
  MOUTH_BOX,
  NECK_OVERLAP,
  countGroups,
  decodePng,
  hex,
  inBox,
  isArmLeft,
  isArmRight,
  isEye,
  isMouth,
  lerpTable,
  EYE_AREAS,
  K,
  mirror,
  partMasks,
  traceShapes,
} from './rig-shared.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = resolve(root, 'src/assets/wardrobe')
const outDir = resolve(root, 'src/companions/wardrobe/generated')
const OUTLINE = [0x7b, 0x50, 0x62]

// ---- Cut lines (view units) -----------------------------------------------------
// The girl's chin (the bald base has no hair tufts under it), legs from 1540 for everyone.
const chin = (x) => CHIN.girl(mirror(x))
const LEGS_FROM = 1540
const BODY_OVERLAP = 40
const PANTS_REACH = 8 // view units: the bottoms' body part reaches this much past the base body
const isHead = (x, y) => y < chin(x)
const isLeg = (x, y) => y >= LEGS_FROM
const isArm = (x, y) => isArmLeft(x, y) || isArmRight(x, y)
const all = () => true
// The base arm's inner outline (its right edge, by y): the tank and shorts start right of it.
// Cut at the arm cut line alone, the base's arm would carry a strip of tank top.
const baseArmInner = lerpTable([[1085, 832], [1100, 832], [1150, 824], [1200, 809], [1250, 795], [1300, 784], [1350, 774], [1395, 768], [1405, 758], [1452, 755]]) // under the hand: left of the shorts' side line
const isBaseArmLeft = (x, y) => isArmLeft(x, y) && x < baseArmInner(y)
const isBaseArmRight = (x, y) => isBaseArmLeft(2 * MID - x, y)
const HAIR_NECK_FROM = 700 // the pigtails are all outside this (x 360-620); the neck strip is inside (760-965)

/** Which rig part each pixel goes into, for each kind of piece. */
const CUTS = {
  // The bald body: the normal cut, like rig-human.
  base: {
    head: isHead,
    armLeft: isBaseArmLeft,
    armRight: isBaseArmRight,
    legLeft: (x, y) => isLeg(x, y) && x < MID,
    legRight: (x, y) => isLeg(x, y) && x >= MID,
    body: (x, y) =>
      y >= chin(x) - (Math.abs(x - MID) < 105 ? NECK_OVERLAP : 0) && y < LEGS_FROM + BODY_OVERLAP && !isBaseArmLeft(x, y) && !isBaseArmRight(x, y),
  },
  // Face: head only, every pixel.
  head: { head: all },
  // Hair: head only, every pixel out to the sides (the pigtails hang low). Under
  // the chin, girl-bob-front and boy-classic-front also have a strip of neck,
  // neckline and collar left over from the old art (down to y 1043): it would sit
  // on top of every top's collar, so between the shoulders hair stops at the
  // boy's chin line (which keeps his tufts behind the neck, like today).
  hair: { head: (x, y) => mirror(x) < HAIR_NECK_FROM || y < CHIN.boy(mirror(x)) },
  // Tops: body + sleeves (anything above the chin line goes to the body too).
  top: { armLeft: isArmLeft, armRight: isArmRight, body: (x, y) => !isArm(x, y) },
  // The skirt stays still: body only.
  skirt: { body: all },
  // Pants and cargo: body above the legs line, a leg each below it.
  pants: {
    // A little lower than the base body ends (PANTS_REACH): if both edges met on one line, their
    // anti-aliasing would let the skin under them show as a light hairline across the pants.
    body: (x, y) => y < LEGS_FROM + BODY_OVERLAP + PANTS_REACH,
    legLeft: (x, y) => isLeg(x, y) && x < MID,
    legRight: (x, y) => isLeg(x, y) && x >= MID,
  },
  // Shoes: a leg each.
  shoes: { legLeft: (x) => x < MID, legRight: (x) => x >= MID },
}
/**
 * Body + arms with closeCuts, so nothing opens at the shoulder when an arm waves.
 * Not the base: every top covers its shoulders and torso, and its arms reaching over
 * the tank (and its body's under-arm outline) would show as a lavender edge on a
 * raised arm and stray dashes under it.
 */
const CLOSE_CUTS = new Set(['top'])

/**
 * Short-sleeved tops whose torso reaches past the arm cut line (the old shirt's
 * side seam): the blouse's and polo's side edge, the hoodie's side panels. Cut
 * by that line alone, the torso's side swings out with a waving arm. For these
 * an arm keeps only the sleeve: above its hem line and outside the torso's side
 * line, both measured from the art (view units, left side; mirrored for the
 * right). Layered's plaid is a long undersleeve, so it keeps the plain cut.
 */
const HEM_MARGIN = 18 // the hem line runs along the outline; its lower edge is up to this far below
const SIDE_MARGIN = 8 // the torso keeps its whole side outline
const line = ([x0, y0], [x1, y1]) => (x) => y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
const SHIRT = {
  hem: line([720, 1157], [797, 1223]),
  side: lerpTable([[1085, 9999], [1136, 9999], [1140, 825], [1366, 774], [1460, 768]]),
}
const SLEEVES = {
  'top/polo': SHIRT,
  'top/blouse': SHIRT,
  'top/hoodie': {
    hem: line([660, 1233], [765, 1308]), // its hem curves a little below the straight line
    side: lerpTable([[1085, 9999], [1132, 9999], [1136, 822], [1300, 765], [1366, 747], [1460, 747]]),
  },
}
/**
 * A top's cut: its arms keep only the sleeves (when measured). The rest of the arm
 * cut is bodyFront: the torso where it covers the arm's inner edge. It moves with
 * the body but is drawn in front of the arms, like the art at rest, and it stays
 * put when an arm waves.
 */
function topCut(id) {
  const s = SLEEVES[id]
  if (!s) return CUTS.top
  const sleeveLeft = (x, y) => isArmLeft(x, y) && y <= s.hem(x) + HEM_MARGIN && x < s.side(y) - SIDE_MARGIN
  const sleeveRight = (x, y) => sleeveLeft(2 * MID - x, y)
  return {
    armLeft: sleeveLeft,
    armRight: sleeveRight,
    bodyFront: (x, y) => isArm(x, y) && !sleeveLeft(x, y) && !sleeveRight(x, y),
    body: (x, y) => !isArm(x, y),
  }
}

// ---- The pieces --------------------------------------------------------------------
function kindOf(id) {
  if (id === 'base' || id === 'base-noshorts') return 'base' // the same body, with or without its shorts
  if (id.startsWith('face-')) return 'head'
  if (id.startsWith('hair/')) return 'hair'
  if (id.startsWith('top/')) return 'top'
  if (id === 'bottom/skirt') return 'skirt'
  if (id.startsWith('bottom/')) return 'pants'
  if (id.startsWith('shoes/')) return 'shoes'
  throw new Error(`unknown piece: ${id}`)
}

function allPieces() {
  const ids = ['base', 'base-noshorts', 'face-girl', 'face-boy']
  for (const folder of ['hair', 'top', 'bottom', 'shoes'])
    for (const f of readdirSync(resolve(srcDir, folder)).sort()) if (f.endsWith('.png')) ids.push(`${folder}/${f.slice(0, -4)}`)
  return ids
}

/**
 * The face PNGs leave each eye's ring (between the pupil and the small dot under
 * it) see-through, so the skin would show there and darken on dark skins. The
 * old kids have a light ring that never recolors: paint it back in, in the old
 * ring colour, so it's traced into the `eyes` group. The ring is everything
 * see-through within one ring-width of the dot (the gap between dot and pupil).
 */
const RING = [0xfe, 0xee, 0xcd]
function paintEyeRings({ w, rgba }) {
  for (const area of EYE_AREAS) {
    const [x0, y0, x1, y1] = area.map((v) => Math.round(v * K))
    const bw = x1 - x0, bh = y1 - y0
    const dark = (x, y) => rgba[((y0 + y) * w + x0 + x) * 4 + 3] > 128
    // Dark blobs in the eye box: the biggest is the pupil, the one under it the dot.
    const blob = new Int32Array(bw * bh).fill(-1)
    const sizes = []
    for (let i = 0; i < bw * bh; i++) {
      if (blob[i] >= 0 || !dark(i % bw, (i / bw) | 0)) continue
      const id = sizes.length, stack = [i]
      blob[i] = id
      let n = 0
      while (stack.length) {
        const j = stack.pop(), x = j % bw, y = (j / bw) | 0
        n++
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = ny * bw + nx
          if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || blob[k] >= 0 || !dark(nx, ny)) continue
          blob[k] = id
          stack.push(k)
        }
      }
      sizes.push(n)
    }
    const order = sizes.map((n, id) => [n, id]).sort((a, b) => b[0] - a[0])
    if (order.length < 2) throw new Error('eye ring: expected a pupil and a dot in each eye')
    const pupil = order[0][1], dot = order[1][1]
    // Straight-line distance from the dot's edge; the ring is as wide as the gap to the pupil.
    const edge = []
    for (let i = 0; i < bw * bh; i++) {
      if (blob[i] !== dot) continue
      const x = i % bw, y = (i / bw) | 0
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => blob[(y + dy) * bw + x + dx] !== dot)) edge.push([x, y])
    }
    const dist = new Float32Array(bw * bh)
    let ringWidth = Infinity
    for (let i = 0; i < bw * bh; i++) {
      if (blob[i] === dot) continue
      const x = i % bw, y = (i / bw) | 0
      let d = Infinity
      for (const [ex, ey] of edge) d = Math.min(d, (x - ex) ** 2 + (y - ey) ** 2)
      dist[i] = Math.sqrt(d)
      if (blob[i] === pupil) ringWidth = Math.min(ringWidth, dist[i])
    }
    // Paint the ring under whatever is there (anti-aliased edges blend onto it).
    for (let i = 0; i < bw * bh; i++) {
      const ring = Math.min(1, Math.max(0, ringWidth + 0.5 - dist[i]))
      if (!ring) continue
      const p = ((y0 + ((i / bw) | 0)) * w + x0 + (i % bw)) * 4, a = rgba[p + 3] / 255
      const out = a + ring * (1 - a)
      for (let c = 0; c < 3; c++) rgba[p + c] = Math.round((rgba[p + c] * a + RING[c] * ring * (1 - a)) / out)
      rgba[p + 3] = Math.round(out * 255)
    }
  }
}

/** Sub-group of one traced shape. Returns null to drop it. */
function subgroup(id, fill, b) {
  if (id.startsWith('face-')) {
    // Pupils, rings and the specks at their edges: all of it moves with the eyes.
    if (isEye(fill, b) || EYE_AREAS.some((a) => inBox(b, a))) return 'eyes'
    if (isMouth(fill, b, MOUTH_BOX[id === 'face-boy' ? 'boy' : 'girl'])) return 'mouth'
    return 'base' // blush
  }
  if (id.startsWith('hair/')) {
    // girl-bob-front has a copy of the calm mouth in it: the face draws the
    // mouth (and swaps it for happy / sad ones), so the copy is dropped.
    if (isMouth(fill, b, MOUTH_BOX.girl) || isMouth(fill, b, MOUTH_BOX.boy)) return null
    return 'hair' // all of it bounces with the hair spring (the bow too)
  }
  return 'base'
}

// ---- Run ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const showColors = args.includes('--colors')
const wanted = args.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\\/g, '/').replace(/\.png$/, ''))
const ids = wanted.length ? wanted : allPieces()
mkdirSync(outDir, { recursive: true })

const t0 = performance.now()
let totalBytes = 0
for (const id of ids) {
  const t1 = performance.now()
  const kind = kindOf(id)
  const png = decodePng(readFileSync(resolve(srcDir, `${id}.png`)))
  const { w, h, rgba } = png
  if (id.startsWith('face-')) paintEyeRings(png)
  const cut = kind === 'top' ? topCut(id) : CUTS[kind]
  const masks = partMasks(png, cut)
  const paint = CLOSE_CUTS.has(kind) ? closeCuts({ w, h, rgba, masks }) : null

  const result = {}
  const lines = []
  let dropped = 0
  for (const name of Object.keys(cut)) {
    if (!masks[name].some(Boolean)) continue // nothing of this piece in that part
    const masked = cutPart(rgba, masks[name], name === 'body' ? paint : null, OUTLINE)
    const { shapes } = traceShapes(masked, w, h, (fill, bb) => subgroup(id, fill, bb))
    const kept = shapes.filter((s) => s[2] !== null)
    dropped += shapes.length - kept.length
    if (!kept.length) continue
    result[name] = kept
    lines.push(`${name}(${countGroups(kept)})`)
  }

  const file = id.replace('/', '-')
  const ts = `// Generated by scripts/rig-wardrobe.mjs from assets/wardrobe/${id}.png (vtracer). Do not edit by hand.
// Each part: its traced shapes back to front, as [path data, fill colour, sub-group].
// Coordinates = the PNG's 5000 x 5000 canvas (the same as human_boy.png / human_girl.png).
import type { RigParts } from '../../TracedRig'

const parts: Partial<RigParts> = ${JSON.stringify(result)}
export default parts
`
  writeFileSync(resolve(outDir, `${file}.generated.ts`), ts)
  const bytes = Buffer.byteLength(ts)
  totalBytes += bytes
  console.log(
    `${file.padEnd(22)} ${(bytes / 1024).toFixed(1).padStart(6)} KB  ${((performance.now() - t1) / 1000).toFixed(1).padStart(5)}s  ${lines.join(' ')}${dropped ? `  (dropped ${dropped})` : ''}`,
  )

  if (showColors) {
    // Like list-fills.mjs: each fill, how many shapes use it, and its sub-group.
    for (const [part, shapes] of Object.entries(result)) {
      const counts = new Map()
      for (const [, fill, group] of shapes) counts.set(`${fill} ${group}`, (counts.get(`${fill} ${group}`) ?? 0) + 1)
      console.log(`    ${part}`)
      for (const [key, n] of [...counts].sort((a, b) => b[1] - a[1])) {
        const [fill, group] = key.split(' ')
        console.log(`      ${fill}  rgb(${hex(fill).join(',').padEnd(11)})  ${String(n).padStart(4)}  ${group}`)
      }
    }
  }
}
console.log(`${ids.length} pieces, ${(totalBytes / 1024).toFixed(1)} KB in all, done in ${((performance.now() - t0) / 1000).toFixed(1)}s`)
