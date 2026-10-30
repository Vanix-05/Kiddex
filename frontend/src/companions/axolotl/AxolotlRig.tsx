import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { axolotlParts } from './axolotlParts.generated'

/**
 * Joints on pet_axolotl.png, in PNG pixels. The axolotl is drawn on the same body
 * as the otter, so the shoulders, hips and feet are at the same spots. The neck,
 * eye line and gill bases were measured on the axolotl itself.
 */
const axolotlPivots: RigPivots = {
  feet: [2500, 4650], // bottom of the feet
  middle: [2500, 3030], // middle of the body
  body: [2500, 3970], // hips
  belly: [2500, 3300], // (no separate belly patch on the axolotl)
  neck: [2500, 2615], // under the chin
  eyeLine: [2500, 1775], // middle of the eyes
  // Top of each side's gill base, where the top gill meets the head. The
  // wiggle swings the gills down from here, tucking their base behind the head.
  gillsLeft: [1781, 1229],
  gillsRight: [3214, 1229],
  shoulderLeft: [2090, 2683],
  shoulderRight: [2910, 2683],
  hipLeft: [2157, 3970],
  hipRight: [2843, 3970],
}

/** The face, measured from the traced parts (scripts/measure-faces.mjs). */
const axolotlFace: RigFace = {
  eyes: {
    left: { cx: 2000, cy: 1791, rx: 153, ry: 312 },
    right: { cx: 3000, cy: 1791, rx: 153, ry: 313 },
  },
  mouth: { x: 2500, y: 2198, w: 341, h: 34 },
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#FED7E3', outline: '#7F5567', blush: '#F7718F' }, // deeper pink, to show on the pink face
}

/** The axolotl companion: traced from pet_axolotl.png, animated with the shared rig moves. */
export function AxolotlRig({
  className,
  label = 'Axolotl',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={axolotlParts}
      pivots={axolotlPivots}
      face={axolotlFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
