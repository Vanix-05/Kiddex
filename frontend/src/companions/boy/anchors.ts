import type { CompanionAnchors } from '../types'

/**
 * Anchor points on human_boy.png, in % of the image (it's square, 5000 x 5000).
 * Measured from the PNG's outline.
 */
export const boyAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 11 }, // top of the hair
  headWidth: 38, // top of the head spans about 31% to 69%
  eyes: {
    left: { x: 40, y: 35.5 },
    right: { x: 60, y: 35.5 },
  },
  neck: { x: 50, y: 52.3 }, // just under the chin
  feet: { x: 50, y: 96.9 }, // bottom of the shoes
}
