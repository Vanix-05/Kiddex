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
//
// Bedroom (src/assets/bedroom/*.png, the intro clip and the setup book's
// background) -> src/assets/bedroom/web/:
//   back-wall.webp          the wall, 3168 wide
//   room-<piece>.webp       shelf, bed, chair: cut down to the piece itself (the
//                           PNGs are 3168 x 1344 and mostly empty, which would
//                           cost a weak laptop a lot of memory). layout.json
//                           says where each piece goes on the wall.
//   <name>-soft.webp        the same pictures blurred by about 6px (at full
//                           size) and saved at half size: the out-of-focus room.
//   desk.webp               the desk at its own size
//   hand-*.webp             the hands, 1024 wide, tinted cooler and darker to
//                           match the night
//   hand-*-shadow.webp      a soft dark shape of each hand, for its shadow

import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
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

// ---------- Bedroom ----------

const bedroom = join(root, 'bedroom')
const bedroomWeb = join(bedroom, 'web')
mkdirSync(bedroomWeb, { recursive: true })
const ROOM_QUALITY = 82
const SOFT_BLUR = 6 // px at full size
const PIECE_PAD = 24 // room around a cut-out piece, so its soft copy isn't clipped
const HAND_WIDTH = 1024
const report = (from, info, name) =>
  console.log(`${from.padEnd(22)} -> ${name.padEnd(30)} ${info.width}x${info.height} ${kb(info.size).padStart(6)}`)

/** Sharp copy + soft copy (blurred, half size) of a room picture. */
async function roomPair(input, name, from) {
  const sharpInfo = await sharp(input).webp({ quality: ROOM_QUALITY, alphaQuality: 100, effort: 6 }).toFile(join(bedroomWeb, `${name}.webp`))
  report(from, sharpInfo, `${name}.webp`)
  const softInfo = await sharp(input)
    .blur(SOFT_BLUR)
    .resize({ width: Math.round(sharpInfo.width / 2) })
    .webp({ quality: ROOM_QUALITY, alphaQuality: 100, effort: 6 })
    .toFile(join(bedroomWeb, `${name}-soft.webp`))
  report(from, softInfo, `${name}-soft.webp`)
  return sharpInfo
}

const wall = await roomPair(join(bedroom, 'back-wall.png'), 'back-wall', 'back-wall.png')
const layout = { room: { width: wall.width, height: wall.height }, pieces: {} }

for (const piece of ['shelf', 'chair', 'bed']) {
  const from = join(bedroom, `room-${piece}.png`)
  // Where the piece is in its 3168 x 1344 picture.
  const { info } = await sharp(from).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
  const left = Math.max(0, -info.trimOffsetLeft - PIECE_PAD)
  const top = Math.max(0, -info.trimOffsetTop - PIECE_PAD)
  const width = Math.min(wall.width - left, info.width + 2 * PIECE_PAD)
  const height = Math.min(wall.height - top, info.height + 2 * PIECE_PAD)
  const cut = await sharp(from).extract({ left, top, width, height }).png().toBuffer()
  await roomPair(cut, `room-${piece}`, `room-${piece}.png`)
  layout.pieces[piece] = { left, top, width, height }
}

const deskInfo = await sharp(join(bedroom, 'desk.png')).webp({ quality: QUALITY, alphaQuality: 100, effort: 6 }).toFile(join(bedroomWeb, 'desk.webp'))
report('desk.png', deskInfo, 'desk.webp')
layout.desk = { width: deskInfo.width, height: deskInfo.height }

layout.hands = {}
for (const [key, hand] of [['left', 'hand-left'], ['right', 'hand-right-pencil']]) {
  const from = join(bedroom, `${hand}.png`)
  // Cooler and darker: a little less red, a little more blue, dimmer overall.
  const tinted = await sharp(from)
    .resize({ width: HAND_WIDTH })
    .modulate({ brightness: 0.86, saturation: 0.88 })
    .recomb([
      [0.93, 0, 0],
      [0, 0.97, 0],
      [0, 0, 1.06],
    ])
    .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
    .toFile(join(bedroomWeb, `${hand}.webp`))
  report(`${hand}.png`, tinted, `${hand}.webp`)
  // Its shadow: the hand's shape in black, blurred, at a quarter of the size.
  const alpha = await sharp(from).resize({ width: HAND_WIDTH / 4 }).extractChannel('alpha').blur(7).toBuffer()
  const meta = await sharp(alpha).metadata()
  const shadow = await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: { r: 12, g: 8, b: 20 } } })
    .joinChannel(alpha)
    .webp({ quality: 70, alphaQuality: 80, effort: 6 })
    .toFile(join(bedroomWeb, `${hand}-shadow.webp`))
  report(`${hand}.png`, shadow, `${hand}-shadow.webp`)
  layout.hands[key] = { width: tinted.width, height: tinted.height }
}

// The pencil's tip in the right hand's picture: the leftmost point of the pencil.
{
  const { data, info } = await sharp(join(bedroomWeb, 'hand-right-pencil.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let tip = null
  for (let x = 0; x < info.width && !tip; x++) {
    for (let y = 0; y < info.height * 0.6; y++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) {
        tip = { x, y }
        break
      }
    }
  }
  layout.hands.right.tip = tip
}

writeFileSync(join(bedroomWeb, 'layout.json'), JSON.stringify(layout, null, 2) + String.fromCharCode(10))
console.log('layout.json', JSON.stringify(layout))
