import { companionArt } from '../assets/art'
import type { CardTint } from '../data/types'

/**
 * FAKE data for the learner login flow, until the backend exists.
 * Class code BLUE42 has 6 learners; StarKid has no buddy yet (goes to /setup).
 * Any other 6-character code shows the same class (see findClass).
 */

export type BuddyId = 'otter' | 'fox' | 'axolotl' | 'kitty' | 'dog'

export interface MockLearner {
  id: string
  /** Shown on the tile and in "Hi, <handle>!". */
  handle: string
  /** Their companion, or null if they haven't picked one yet. */
  buddy: BuddyId | null
  /** Tile background (see colors.tint* in theme.ts). */
  tint: CardTint
}

export interface MockClass {
  code: string
  name: string
  learners: MockLearner[]
}

export const mockClasses: MockClass[] = [
  {
    code: 'BLUE42',
    name: 'Grade 4 · Sampaguita',
    learners: [
      { id: 'blueotter', handle: 'BlueOtter', buddy: 'otter', tint: 'lavender' },
      { id: 'sunnyfox', handle: 'SunnyFox', buddy: 'fox', tint: 'peach' },
      { id: 'pinkaxo', handle: 'PinkAxo', buddy: 'axolotl', tint: 'pink' },
      { id: 'mangokitty', handle: 'MangoKitty', buddy: 'kitty', tint: 'periwinkle' },
      { id: 'luckydog', handle: 'LuckyDog', buddy: 'dog', tint: 'peach' },
      { id: 'starkid', handle: 'StarKid', buddy: null, tint: 'periwinkle' },
    ],
  },
]

/**
 * FAKE: any 6-character code works, since there's no real authentication yet.
 * A code that isn't in mockClasses opens the first class (BLUE42's learners).
 */
export function findClass(code: string | null | undefined): MockClass | undefined {
  if (!code || code.length !== 6) return undefined
  return mockClasses.find((c) => c.code === code.toUpperCase()) ?? mockClasses[0]
}

export function findLearner(code: string | null | undefined, learnerId: string | null | undefined) {
  return findClass(code)?.learners.find((l) => l.id === learnerId)
}

/** The buddy's picture, or null if the learner has no buddy yet. */
export function buddyImage(learner: MockLearner): string | null {
  return learner.buddy ? companionArt[learner.buddy] : null
}
