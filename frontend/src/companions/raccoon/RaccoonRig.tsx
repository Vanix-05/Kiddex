import { TracedRig, type RigPivots } from '../TracedRig'
import { raccoonParts } from './raccoonParts.generated'

/**
 * Joints on pet_raccoon.png, in PNG pixels. Raccoon is drawn on the same body
 * template as the otter, fox and kitty, so the shoulders, hips, neck, eyes and
 * feet are at the same spots (see scripts/rig-pet.mjs).
 */
const raccoonPivots: RigPivots = {
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

/** The raccoon companion: traced from pet_raccoon.png, animated with the shared rig moves. */
export function RaccoonRig({ className, label = 'Raccoon' }: { className?: string; label?: string }) {
  return <TracedRig parts={raccoonParts} pivots={raccoonPivots} label={label} className={className} />
}
