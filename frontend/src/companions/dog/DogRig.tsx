import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { dogParts } from './dogParts.generated'

/**
 * Joints on pet_dog.png, in PNG pixels. Dog is drawn on the same body
 * template as the otter, fox and kitty, so the shoulders, hips, neck, eyes and
 * feet are at the same spots (see scripts/rig-pet.mjs). Its floppy ears are
 * part of the head.
 */
const dogPivots: RigPivots = {
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
const dogFace: RigFace = {
  eyes: {
    left: { cx: 2000, cy: 1792, rx: 154, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 155, ry: 314 },
  },
  mouth: { x: 2500, y: 2314, w: 115, h: 85 },
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#F4D4A7', outline: '#7C5162', blush: '#FF828D' },
}

/** The dog companion: traced from pet_dog.png, animated with the shared spring rig. */
export function DogRig({
  className,
  label = 'Dog',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={dogParts}
      pivots={dogPivots}
      face={dogFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
