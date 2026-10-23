// Dev tool: trace pet_axolotl.png into a colour SVG with vtracer (WebAssembly).
// Run: npm run trace:axolotl
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import vtracer from '@visioncortex/vtracer'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = resolve(root, 'src/assets/companions/pet_axolotl.png')
const output = resolve(root, 'src/companions/axolotl/axolotl-traced.svg')

// Colour mode, high detail. Smaller speck filter and colour steps than the otter,
// so the face and the frilly gills stay sharp.
const options = {
  clustering: 'color-cluster',
  hierarchical: 'stacked',
  mode: 'spline',
  filterSpeckle: 2, // drop specks smaller than 2x2 px (on a 5000 px image)
  colorPrecision: 8, // max colour accuracy
  layerDifference: 3, // very small colour steps still get their own layer (the head's soft shading)
  cornerThreshold: 60,
  lengthThreshold: 4,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 2,
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

const t0 = performance.now()
// The head's side shading is a soft blur. Left as is, vtracer merges it into one
// flat colour, so round colours to steps of 6 first: the blur becomes a few thin
// bands that vtracer keeps (they look smooth at app size). Same as rig-axolotl.mjs.
const STEP = 6
const { w, h, rgba } = decodePng(readFileSync(input))
for (let i = 0; i < rgba.length; i += 4) for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round(rgba[i + c] / STEP) * STEP)

// vtracer sets width/height but no viewBox; add one so the SVG can scale. Shapes are untouched.
const svg = vtracer
  .convertPixels(rgba, w, h, options)
  .replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)"/,'<svg $1viewBox="0 0 $2 $3" width="$2" height="$3"')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, svg)
const paths = (svg.match(/<path/g) ?? []).length
console.log(`traced in ${((performance.now() - t0) / 1000).toFixed(1)}s -> ${output}`)
console.log(`${paths} paths, ${(statSync(output).size / 1024).toFixed(1)} KB`)
