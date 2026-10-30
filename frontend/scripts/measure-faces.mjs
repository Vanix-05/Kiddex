// Dev tool (one-off): measure each traced companion's face, for the `face`
// config in src/companions/<id>/<Id>Rig.tsx.
//
// Reads src/companions/<id>/<id>Parts.generated.ts and prints, in PNG pixels:
//   - each eye's centre and half-width/half-height (the `eyes` group, split into
//     left and right by x around the face centre)
//   - the `mouth` and `nose` boxes
//   - the fill of the traced shape directly behind each eye (the lid colour)
//   - the eye fills (the darkest is the outline colour)
//
// Run: node scripts/measure-faces.mjs [id ...]
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IDS = ['otter', 'fox', 'boy', 'girl', 'kitty', 'axolotl', 'raccoon', 'ram', 'monkey']

/** Flattens a path (only M m c C Z appear in the traced data) into polygons. */
function flatten(d) {
  const tokens = d.match(/[MmCcZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)
  const polys = []
  let poly = null
  let x = 0
  let y = 0
  let cmd = ''
  let i = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++]
    if (cmd === 'Z' || cmd === 'z') {
      if (poly) polys.push(poly)
      poly = null
      continue
    }
    if (cmd === 'M' || cmd === 'm') {
      const nx = num()
      const ny = num()
      if (cmd === 'm') {
        x += nx
        y += ny
      } else {
        x = nx
        y = ny
      }
      if (poly) polys.push(poly)
      poly = [[x, y]]
      cmd = cmd === 'm' ? 'c' : 'C' // (no implicit lineto in this data)
      continue
    }
    const rel = cmd === 'c'
    const p = [num(), num(), num(), num(), num(), num()]
    const [x1, y1, x2, y2, x3, y3] = rel ? p.map((v, k) => v + (k % 2 ? y : x)) : p
    for (let t = 0.125; t <= 1; t += 0.125) {
      const u = 1 - t
      poly.push([
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
    x = x3
    y = y3
  }
  if (poly) polys.push(poly)
  return polys
}

function bbox(polys) {
  const b = [Infinity, Infinity, -Infinity, -Infinity]
  for (const poly of polys)
    for (const [x, y] of poly) {
      b[0] = Math.min(b[0], x)
      b[1] = Math.min(b[1], y)
      b[2] = Math.max(b[2], x)
      b[3] = Math.max(b[3], y)
    }
  return b
}
const union = (bs) => bs.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])
const box = (b) => ({ cx: r((b[0] + b[2]) / 2), cy: r((b[1] + b[3]) / 2), hw: r((b[2] - b[0]) / 2), hh: r((b[3] - b[1]) / 2) })
const r = (v) => Math.round(v)

/** Even-odd test over all of a path's polygons (the traced outlines use holes). */
function contains(polys, [px, py]) {
  let inside = false
  for (const poly of polys)
    for (let k = 0; k < poly.length; k++) {
      const [ax, ay] = poly[k]
      const [bx, by] = poly[(k + 1) % poly.length]
      if (ay <= py !== by <= py && px < ax + ((py - ay) * (bx - ax)) / (by - ay)) inside = !inside
    }
  return inside
}

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : IDS) {
  const src = readFileSync(resolve(root, `src/companions/${id}/${id}Parts.generated.ts`), 'utf8')
  const head = JSON.parse(src.slice(src.indexOf('= {') + 2).trim().replace(/;$/, '')).head
  const shapes = head.map(([d, fill, group], index) => {
    const polys = flatten(d)
    return { index, fill, group, polys, b: bbox(polys) }
  })

  const eyes = shapes.filter((s) => s.group === 'eyes')
  const faceX = (Math.min(...eyes.map((s) => s.b[0])) + Math.max(...eyes.map((s) => s.b[2]))) / 2
  const sides = {
    left: eyes.filter((s) => (s.b[0] + s.b[2]) / 2 < faceX),
    right: eyes.filter((s) => (s.b[0] + s.b[2]) / 2 >= faceX),
  }

  console.log(`\n== ${id}  (face centre x ${r(faceX)})`)
  for (const [side, list] of Object.entries(sides)) {
    const eye = box(union(list.map((s) => s.b)))
    // Lid colour: the last non-eye shape painted before this eye's first shape
    // that covers a point just above the eye's centre.
    const first = Math.min(...list.map((s) => s.index))
    const probe = [eye.cx, eye.cy - eye.hh * 0.5]
    const behind = shapes
      .slice(0, first)
      .reverse()
      .find((s) => s.group !== 'eyes' && contains(s.polys, probe))
    console.log(`  ${side} eye`, JSON.stringify(eye), 'lid', behind?.fill, `(shape ${behind?.index}, ${behind?.group})`)
    console.log('    shapes', list.map((s) => `${s.index}:${s.fill}:${JSON.stringify(box(s.b))}`).join('\n           '))
  }
  for (const g of ['mouth', 'nose']) {
    const list = shapes.filter((s) => s.group === g)
    if (list.length) console.log(`  ${g}`, JSON.stringify(box(union(list.map((s) => s.b)))), list.map((s) => s.fill).join(' '))
    else console.log(`  ${g}: none`)
  }
  const darkest = [...new Set(eyes.map((s) => s.fill))].sort((a, b) => lum(a) - lum(b))
  console.log('  eye fills, darkest first:', darkest.join(' '))
}
