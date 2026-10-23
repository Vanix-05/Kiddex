import { TracedRig, type RigPivots } from '../TracedRig'
import { boyParts } from './boyParts.generated'

/** Joints on human_boy.png, in PNG pixels (measured from the outline). */
const boyPivots: RigPivots = {
  feet: [2500, 4846], // bottom of the shoes
  middle: [2500, 3030], // middle of the body, for the sway
  body: [2500, 3990], // hips
  belly: [2500, 3300], // (no belly patch on the boy)
  neck: [2497, 2610], // under the chin
  eyeLine: [2497, 1773], // middle of the eyes
  hair: [2497, 556], // top of the hair
  shoulderLeft: [2050, 2899], // top of the arm cut, just under the shoulder
  shoulderRight: [2945, 2899],
  hipLeft: [2200, 3990],
  hipRight: [2795, 3990],
}

/** The boy companion: traced from human_boy.png, animated with the shared rig moves. */
export function BoyRig({ className, label = 'Boy' }: { className?: string; label?: string }) {
  return <TracedRig parts={boyParts} pivots={boyPivots} label={label} className={className} />
}
