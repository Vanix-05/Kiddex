import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { ramParts } from './ramParts.generated'

/**
 * Joints on pet_ram.png, in PNG pixels. Ram is drawn on the same body
 * template as the otter, fox and kitty, so the shoulders, hips, neck, eyes and
 * feet are at the same spots (see scripts/rig-pet.mjs).
 */
const ramPivots: RigPivots = {
  feet: [2500, 4650], // bottom of the feet
  middle: [2500, 3030], // middle of the body
  body: [2500, 3970], // hips
  belly: [2500, 3300], // (no separate belly patch)
  neck: [2500, 2615], // under the chin
  eyeLine: [2500, 1775], // middle of the eyes
  shoulderLeft: [2090, 2683],
  shoulderRight: [2910, 2683],
  hipLeft: [2157, 3970],
  hipRight: [2843, 3970],
}

/** The face, measured from the traced parts (scripts/measure-faces.mjs). */
const ramFace: RigFace = {
  // Eyes set by hand: two small pink specks near the horns are tagged as eyes
  // and stretched the measured boxes.
  eyes: {
    left: { cx: 2000, cy: 1791, rx: 155, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 156, ry: 314 },
  },
  mouth: { x: 2500, y: 2290, w: 110, h: 40 }, // no mouth group: the nose and mouth are one traced shape (y 2113-2269); drawn mouths go just under it
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#FEF5F0', outline: '#7C5163', blush: '#FF828D' },
}

/** The ram companion: traced from pet_ram.png, animated with the shared rig moves. */
export function RamRig({
  className,
  label = 'Ram',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={ramParts}
      pivots={ramPivots}
      face={ramFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
