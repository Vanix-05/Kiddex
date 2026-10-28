import type { CompanionAnchors } from '../types'

/**
 * Anchor points on pet_raccoon.png, in % of the image (it's square, 5000 x 5000).
 * Same body template as the kitty: eyes, neck and feet at the same spots.
 */
export const raccoonAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 19.2 }, // top of the head outline, between the ears
  headWidth: 43, // head spans about 28.5% to 71.5% (not counting ears or horns)
  eyes: {
    left: { x: 40, y: 35.5 },
    right: { x: 60, y: 35.5 },
  },
  neck: { x: 50, y: 52.4 }, // just under the chin
  feet: { x: 50, y: 93 }, // bottom of the feet
}
