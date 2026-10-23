import type { CompanionAnchors } from '../types'

/**
 * Anchor points on pet_fox.png, in % of the image (it's square, 5000 x 5000).
 * Measured from the PNG's outline.
 */
export const foxAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 19.3 }, // top of the head outline, between the ears
  headWidth: 43, // head spans about 28.7% to 71.4% (not counting the ears or cheek fur)
  eyes: {
    left: { x: 40, y: 35.5 },
    right: { x: 60, y: 35.5 },
  },
  neck: { x: 50, y: 52.3 }, // just under the chin
  feet: { x: 50, y: 93 }, // bottom of the feet
}
