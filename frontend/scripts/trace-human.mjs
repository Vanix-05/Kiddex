// Dev tool: trace human_boy.png or human_girl.png into a colour SVG with vtracer (WebAssembly).
// Run: npm run trace:boy   or   npm run trace:girl
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vtracer from '@visioncortex/vtracer'

const who = process.argv[2]
if (who !== 'boy' && who !== 'girl') throw new Error('usage: node scripts/trace-human.mjs boy|girl')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = resolve(root, `src/assets/companions/human_${who}.png`)
const output = resolve(root, `src/companions/${who}/${who}-traced.svg`)

// Colour mode, high detail. Smaller speck filter and colour steps than the
// animals, so the eyes, their highlights and the mouth stay sharp.
const options = {
  clustering: 'color-cluster',
  hierarchical: 'stacked',
  mode: 'spline',
  filterSpeckle: 2, // drop specks smaller than 2x2 px (on a 5000 px image)
  colorPrecision: 8, // max colour accuracy
  layerDifference: 6, // small colour steps still get their own layer
  cornerThreshold: 60,
  lengthThreshold: 4,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 2,
}

const t0 = performance.now()
// vtracer sets width/height but no viewBox; add one so the SVG can scale. Shapes are untouched.
const svg = vtracer
  .convertBuffer(readFileSync(input), options)
  .replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)"/, '<svg $1viewBox="0 0 $2 $3" width="$2" height="$3"')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, svg)
const paths = (svg.match(/<path/g) ?? []).length
console.log(`traced in ${((performance.now() - t0) / 1000).toFixed(1)}s -> ${output}`)
console.log(`${paths} paths, ${(statSync(output).size / 1024).toFixed(1)} KB`)
