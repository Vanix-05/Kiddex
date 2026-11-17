// Makes a slightly lighter, warmer copy of each first-person hand picture, so
// the hands sit closer to the kid's skin in the pull-in wide-shot videos
// (src/assets/videos/magic/pull-in-*.mp4). Run once:
//
//   node scripts/make-light-hands.mjs
//
//   bedroom/hand-left.png            -> bedroom/hand-left-light.png
//   bedroom/hand-right-pencil.png    -> bedroom/hand-right-pencil-light.png
//   bedroom/web/hand-left.webp       -> bedroom/web/hand-left-light.webp
//   bedroom/web/hand-right-pencil.webp -> bedroom/web/hand-right-pencil-light.webp
//
// The originals stay. Only skin-coloured pixels change (orange-brown hues,
// not too dark), so the sleeve, the outlines and the yellow pencil keep their
// colours. The WebP copies are made from the WebPs (which already carry the
// night tint from make-web-art.mjs), so they keep that tint.
//
// The shadows (hand-*-shadow.webp) are only the hands' shapes: no copy needed.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const bedroom = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'bedroom')

/**
 * Per channel gain on skin. On the night-tinted WebP the back of the hand goes
 * from about rgb(142, 112, 100) to rgb(158, 122, 104): between it and the
 * kid's hands in the videos, about rgb(170, 132, 118).
 */
const GAIN = [1.11, 1.09, 1.04]

const smooth = (a, b, x) => {
  const e = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return e * e * (3 - 2 * e)
}

/** How much a pixel is skin (0..1): its hue, how colourful and how bright it is. */
function skinWeight(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max !== r || max === min) return 0
  const hue = (60 * (g - b)) / (max - min) // -60..60 when red is the largest
  const sat = (max - min) / max
  const value = max / 255
  // Skin is about 5-35 degrees; the pencil's yellow is 45 and up, pink nails just under 0.
  const byHue = smooth(-12, 2, hue) * (1 - smooth(36, 46, hue))
  return byHue * smooth(0.08, 0.2, sat) * smooth(0.18, 0.4, value)
}

async function lighten(from, to, encode) {
  const { data, info } = await sharp(from).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const w = skinWeight(data[i], data[i + 1], data[i + 2])
    if (w <= 0) continue
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(data[i + c] * (1 + (GAIN[c] - 1) * w)))
  }
  const out = await encode(sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })).toFile(to)
  console.log(`${to}  ${info.width}x${info.height}  ${(out.size / 1024).toFixed(0)} KB`)
}

for (const hand of ['hand-left', 'hand-right-pencil']) {
  await lighten(join(bedroom, `${hand}.png`), join(bedroom, `${hand}-light.png`), (img) => img.png({ compressionLevel: 9 }))
  await lighten(join(bedroom, 'web', `${hand}.webp`), join(bedroom, 'web', `${hand}-light.webp`), (img) =>
    img.webp({ quality: 85, alphaQuality: 100, effort: 6 }),
  )
}
