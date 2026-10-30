import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { otterParts } from './otterParts.generated'

/**
 * Joints on pet_otter.png, in PNG pixels. The otter's body is the template the
 * other pets were drawn on, so the shoulders, hips and feet match theirs.
 */
const otterPivots: RigPivots = {
  feet: [2500, 4650], // bottom of the feet
  middle: [2500, 3030], // middle of the body
  body: [2500, 3970], // hips
  belly: [2500, 3300], // middle of the belly patch
  neck: [2500, 2605], // under the chin
  eyeLine: [2500, 1770], // middle of the eyes
  shoulderLeft: [2090, 2683],
  shoulderRight: [2910, 2683],
  hipLeft: [2157, 3970],
  hipRight: [2843, 3970],
}

/** The face, measured from the traced parts (scripts/measure-faces.mjs). */
const otterFace: RigFace = {
  eyes: {
    left: { cx: 2000, cy: 1792, rx: 154, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 155, ry: 314 },
  },
  mouth: { x: 2500, y: 2277, w: 93, h: 44 },
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#B19591', outline: '#7C5263', blush: '#FF828D' },
}

/**
 * The otter companion: rigged from pet_otter.png (cut into parts and traced
 * with vtracer, scripts/rig-otter.mjs), animated with the shared spring rig.
 */
export function OtterRig({
  className,
  label = 'Otter',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={otterParts}
      pivots={otterPivots}
      face={otterFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
