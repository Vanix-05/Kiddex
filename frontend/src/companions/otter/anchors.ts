import type { CompanionAnchors } from '../types'

/**
 * Anchor points on pet_otter.png, in % of the image (it's square, 5000 x 5000).
 * The otter's body is the shared pet template, so these match the fox's,
 * with the eyes and neck from the rig's measured face and pivots.
 */
export const otterAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 19.3 },
  headWidth: 43,
  eyes: {
    left: { x: 40, y: 35.8 },
    right: { x: 60, y: 35.8 },
  },
  neck: { x: 50, y: 52.1 }, // just under the chin
  feet: { x: 50, y: 93 }, // bottom of the feet
}
