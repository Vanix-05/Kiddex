// Makes small WebP copies of the big PNG art, for the app to load.
// The PNGs stay where they are (the trace/rig scripts read them).
//
//   npm run web-art
//
// Companions (5000x5000) -> src/assets/companions/web/<name>.webp at 700x700.
//   Why 700: at 1440x900 the biggest a companion picture is drawn is the fox
//   in the "Welcome, Student!" popup, 340px tall (pick-buddy tiles are 150px,
//   the Welcome card fox 83px). 2x for sharp screens = 680, rounded up to 700.
// Ollie (characters/ollie-*.png) -> src/assets/characters/web/<name>.webp at
//   the same pixel size as the PNG.
// All with transparency, quality 85.

import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets')
const COMPANION_SIZE = 700
const QUALITY = 85

const jobs = [
  ...readdirSync(join(root, 'companions'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => ({ from: join(root, 'companions', f), to: join(root, 'companions', 'web'), size: COMPANION_SIZE })),
  ...['ollie-large.png', 'ollie-cutout.png', 'ollie-body.png', 'ollie-wing.png'].map((f) => ({
    from: join(root, 'characters', f),
    to: join(root, 'characters', 'web'),
    size: null, // keep the PNG's size
  })),
]

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`

for (const { from, to, size } of jobs) {
  mkdirSync(to, { recursive: true })
  const out = join(to, basename(from, '.png') + '.webp')
  let img = sharp(from)
  if (size) img = img.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  // alphaQuality 100 keeps the soft edges clean against any background.
  const info = await img.webp({ quality: QUALITY, alphaQuality: 100, effort: 6 }).toFile(out)
  console.log(`${basename(from).padEnd(18)} ${kb(statSync(from).size).padStart(8)} -> ${basename(out).padEnd(19)} ${info.width}x${info.height} ${kb(info.size).padStart(6)}`)
}
