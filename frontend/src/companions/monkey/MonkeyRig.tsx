import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { monkeyParts } from './monkeyParts.generated'

/**
 * Joints on pet_monkey.png, in PNG pixels. Monkey is drawn on the same body
 * template as the otter, fox and kitty, so the shoulders, hips, neck, eyes and
 * feet are at the same spots (see scripts/rig-pet.mjs).
 */
const monkeyPivots: RigPivots = {
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
const monkeyFace: RigFace = {
  eyes: {
    left: { cx: 2000, cy: 1792, rx: 154, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 155, ry: 314 },
  },
  mouth: { x: 2500, y: 2341, w: 146, h: 114 },
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#F5D9C8', outline: '#7C5162', blush: '#FF828D' },
}

/** The monkey companion: traced from pet_monkey.png, animated with the shared rig moves. */
export function MonkeyRig({
  className,
  label = 'Monkey',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={monkeyParts}
      pivots={monkeyPivots}
      face={monkeyFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
