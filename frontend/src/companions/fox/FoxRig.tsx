import { TracedRig, type RigPivots } from '../TracedRig'
import { foxParts } from './foxParts.generated'

/**
 * Joints on pet_fox.png, in PNG pixels. The fox is drawn on the same body as
 * the otter, so the shoulders, hips and feet are at the same spots. The neck,
 * eye line and chest were measured on the fox itself.
 */
const foxPivots: RigPivots = {
  feet: [2500, 4650], // bottom of the feet
  middle: [2500, 3030], // middle of the body (ears not counted)
  body: [2500, 3970], // hips
  belly: [2500, 3040], // middle of the cream chest patch
  neck: [2500, 2610], // under the chin
  eyeLine: [2500, 1775], // middle of the eyes
  shoulderLeft: [2090, 2683],
  shoulderRight: [2910, 2683],
  hipLeft: [2157, 3970],
  hipRight: [2843, 3970],
}

/** The fox companion: traced from pet_fox.png, animated with the otter's rig moves. */
export function FoxRig({ className, label = 'Fox' }: { className?: string; label?: string }) {
  return <TracedRig parts={foxParts} pivots={foxPivots} label={label} className={className} />
}
