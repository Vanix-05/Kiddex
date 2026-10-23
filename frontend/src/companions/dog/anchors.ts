import type { CompanionAnchors } from '../types'

/**
 * Anchor points on pet_dog.png, in % of the image (it's square, 5000 x 5000).
 * Read off the PNG with a 5% grid laid over it.
 */
export const dogAnchors: CompanionAnchors = {
  headTop: { x: 50, y: 19.5 }, // top of the head outline, between the ears
  headWidth: 36, // head spans about 32% to 68% (not counting the ears)
  eyes: {
    left: { x: 40, y: 35.5 },
    right: { x: 60, y: 35.5 },
  },
  neck: { x: 50, y: 52.5 }, // just under the chin
  feet: { x: 50, y: 92.8 }, // bottom of the feet
}
