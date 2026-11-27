import type { RigPivots } from '../TracedRig'

/**
 * Joints: the girl's (both kids share one body), with the hips on the legs
 * cut line (y 1540 view units), where the wardrobe's legs start.
 */
export const kidPivots: RigPivots = {
  feet: [2500, 4846],
  middle: [2500, 3030],
  body: [2500, 3990],
  belly: [2500, 3300],
  neck: [2497, 2610],
  eyeLine: [2497, 1773],
  hair: [2497, 551],
  shoulderLeft: [2050, 2899],
  shoulderRight: [2945, 2899],
  hipLeft: [2190, 3990],
  hipRight: [2805, 3990],
}
