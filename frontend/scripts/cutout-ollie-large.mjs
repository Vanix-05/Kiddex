// Dev tool: make a transparent, high-resolution Ollie for the School ID page,
// where he is drawn much bigger than in the popup.
//
// Run: node scripts/cutout-ollie-large.mjs
// Reads  src/assets/characters/Ollie.png        (1145x1374, white background)
// Writes src/assets/characters/ollie-large.png  (white removed, cropped to Ollie,
//        same framing as ollie-cutout.png, so the two swap without a jump)
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPng, writePng } from './png-io.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ART = resolve(root, 'src/assets/characters')
const { w, h, data } = readPng(resolve(ART, 'Ollie.png'))
const at = (x, y) => (y * w + x) * 4
const isWhite = (i) => Math.min(data[i], data[i + 1], data[i + 2]) >= 236

// 1. Flood the white background in from the edges (the cream face is inside
//    Ollie's dark outline, so it is never reached).
const bg = new Uint8Array(w * h)
const stack = []
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
while (stack.length) {
  const p = stack.pop()
  if (bg[p] || !isWhite(p * 4)) continue
  bg[p] = 1
  const x = p % w
  if (x > 0) stack.push(p - 1)
  if (x < w - 1) stack.push(p + 1)
  if (p >= w) stack.push(p - w)
  if (p < w * (h - 1)) stack.push(p + w)
}

// 2. Clear the background, and un-mix the white from the soft edge pixels
//    next to it (assume they are the brown outline blended with white).
const OUTLINE = [108, 64, 41]
const out = Buffer.from(data)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const p = y * w + x, i = p * 4
  if (bg[p]) { out[i + 3] = 0; continue }
  let edge = false
  for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy
    if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) { edge = true; break }
  }
  if (!edge) continue
  let a = 0
  for (let k = 0; k < 3; k++) a += (255 - data[i + k]) / (255 - OUTLINE[k])
  a = Math.min(1, a / 3)
  if (a <= 0.02) { out[i + 3] = 0; continue }
  for (let k = 0; k < 3; k++) out[i + k] = Math.max(0, Math.min(255, Math.round((data[i + k] - (1 - a) * 255) / a)))
  out[i + 3] = Math.round(a * 255)
}

// 3. Crop to Ollie.
let x0 = w, y0 = h, x1 = 0, y1 = 0
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[at(x, y) + 3] > 8) {
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
}
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, crop = Buffer.alloc(cw * ch * 4)
for (let y = 0; y < ch; y++) out.copy(crop, y * cw * 4, at(x0, y0 + y), at(x0, y0 + y) + cw * 4)
writePng(resolve(ART, 'ollie-large.png'), { w: cw, h: ch, data: crop })
console.log(`Wrote ollie-large.png (${cw}x${ch}, ratio ${(cw / ch).toFixed(4)}; ollie-cutout is ${(428 / 600).toFixed(4)})`)
