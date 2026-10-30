import { TracedRig, type Emotion, type RigFace, type RigPivots } from '../TracedRig'
import { girlParts } from './girlParts.generated'

/** Joints on human_girl.png, in PNG pixels (measured from the outline). */
const girlPivots: RigPivots = {
  feet: [2500, 4846], // bottom of the shoes
  middle: [2500, 3030], // middle of the body, for the sway
  body: [2500, 4037], // hips (under the skirt)
  belly: [2500, 3300], // (no belly patch on the girl)
  neck: [2497, 2610], // under the chin
  eyeLine: [2497, 1773], // middle of the eyes
  hair: [2497, 551], // top of the hair (the bow bounces with it)
  shoulderLeft: [2050, 2899], // top of the arm cut, just under the shoulder
  shoulderRight: [2945, 2899],
  hipLeft: [2179, 4037],
  hipRight: [2816, 4037],
}

/** The face, measured from the traced parts (scripts/measure-faces.mjs). */
const girlFace: RigFace = {
  eyes: {
    left: { cx: 2000, cy: 1792, rx: 154, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 155, ry: 315 },
  },
  mouth: { x: 2500, y: 2277, w: 136, h: 42 },
  cheeks: { left: [1995, 2190], right: [3005, 2190] }, // over the drawn-in blush
  colors: { lid: '#FEEBDC', outline: '#7C5163', blush: '#FF828D' }, // skin
}

/**
 * The girl companion: traced from human_girl.png, animated with the shared rig
 * moves. Her legs are drawn behind the body so the skirt stays over them.
 */
export function GirlRig({
  className,
  label = 'Girl',
  emotion,
}: {
  className?: string
  label?: string
  emotion?: Emotion
}) {
  return (
    <TracedRig
      parts={girlParts}
      pivots={girlPivots}
      face={girlFace}
      emotion={emotion}
      label={label}
      className={className}
      legsBehindBody
    />
  )
}
