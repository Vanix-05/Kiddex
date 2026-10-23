import type { CompanionAnchors } from '../types'

/**
 * Anchor points on pet_axolotl.png, in % of the image (it's square, 5000 x 5000).
 * Measured from the PNG's outline.
 */
export const axolotlAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 19.2 }, // top of the head outline
  headWidth: 43, // head spans about 28.7% to 71.4% (not counting the gills)
  eyes: {
    left: { x: 40, y: 35.5 },
    right: { x: 60, y: 35.5 },
  },
  neck: { x: 50, y: 52.4 }, // just under the chin
  feet: { x: 50, y: 93 }, // bottom of the feet
}
