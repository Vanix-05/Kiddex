import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { kittyParts } from './kittyParts.generated'

/**
 * Joints on pet_kitty.png, in PNG pixels. The kitty is drawn on the same body as
 * the otter and fox, so the shoulders, hips and feet are at the same spots. The
 * neck, eye line and ear corners were measured on the kitty itself.
 */
const kittyPivots: RigPivots = {
  feet: [2500, 4650], // bottom of the feet
  middle: [2500, 3030], // middle of the body (ears not counted)
  body: [2500, 3970], // hips
  belly: [2500, 3300], // (no separate belly patch on the kitty)
  neck: [2500, 2615], // under the chin
  eyeLine: [2500, 1775], // middle of the eyes
  earLeft: [2290, 970], // inner corner of the left ear, where it meets the top of the head
  earRight: [2705, 970],
  shoulderLeft: [2090, 2683],
  shoulderRight: [2910, 2683],
  hipLeft: [2157, 3970],
  hipRight: [2843, 3970],
}

/** The face, measured from the traced parts (scripts/measure-faces.mjs). */
const kittyFace: RigFace = {
  eyes: {
    left: { cx: 1999, cy: 1791, rx: 155, ry: 314 },
    right: { cx: 3001, cy: 1791, rx: 155, ry: 314 },
  },
  mouth: { x: 2500, y: 2277, w: 94, h: 43 },
  cheeks: { left: [1860, 2200], right: [3140, 2200] },
  colors: { lid: '#A3847A', outline: '#7B5062', blush: '#FF828D' }, // the dark face mask
}

/** The kitty companion: traced from pet_kitty.png, animated with the shared rig moves. */
export function KittyRig({
  className,
  label = 'Kitty',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={kittyParts}
      pivots={kittyPivots}
      face={kittyFace}
      emotion={emotion}
      label={label}
      className={className}
    />
  )
}
