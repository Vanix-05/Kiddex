import { companionArt } from '../assets/art'
import type { CardTint } from '../data/types'
import type { Avatar } from '../setup/avatar'
import type { BuddyId } from '../setup/quizData'

/**
 * FAKE data for the learner login flow, until the backend exists.
 * Class code BLUE42 has 6 learners; StarKid has no buddy yet (goes to /setup).
 * Any other 6-character code shows the same class (see findClass).
 *
 * Finishing setup (/setup/pet) saves the learner's avatar, buddy and nickname
 * with saveLearnerSetup(). That's kept in sessionStorage: it survives page
 * reloads and resets when the browser tab is closed, so the egg flow can be
 * tested again.
 */

export interface MockLearner {
  id: string
  /** Shown on the tile and in "Hi, <handle>!". */
  handle: string
  /** Their companion, or null if they haven't picked one yet. */
  buddy: BuddyId | null
  /** The kid's own character (boy/girl), or null if not picked yet. */
  avatar: Avatar | null
  /** What they named their buddy. Empty = the buddy's default name. */
  nickname?: string
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
      { id: 'blueotter', handle: 'BlueOtter', buddy: 'otter', avatar: 'boy', tint: 'lavender' },
      { id: 'sunnyfox', handle: 'SunnyFox', buddy: 'fox', avatar: 'girl', tint: 'peach' },
      { id: 'pinkaxo', handle: 'PinkAxo', buddy: 'axolotl', avatar: 'girl', tint: 'pink' },
      { id: 'mangokitty', handle: 'MangoKitty', buddy: 'kitty', avatar: 'boy', tint: 'periwinkle' },
      { id: 'luckydog', handle: 'LuckyDog', buddy: 'dog', avatar: 'boy', tint: 'peach' },
      { id: 'starkid', handle: 'StarKid', buddy: null, avatar: null, tint: 'periwinkle' },
    ],
  },
]

// ---------- Setup results saved during testing ----------

type LearnerSetup = Pick<MockLearner, 'buddy' | 'avatar' | 'nickname'>

const SETUP_KEY = 'kiddex.mockLearnerSetup'

function loadSetups(): Record<string, LearnerSetup> {
  try {
    return JSON.parse(sessionStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, LearnerSetup>
  } catch {
    return {}
  }
}

/** FAKE "save to the server": stores what the learner picked during setup. */
export function saveLearnerSetup(learnerId: string, setup: LearnerSetup) {
  try {
    sessionStorage.setItem(SETUP_KEY, JSON.stringify({ ...loadSetups(), [learnerId]: setup }))
  } catch {
    // Storage unavailable: the pick just won't be remembered.
  }
}

// ---------- Lookups ----------

/**
 * FAKE: any 6-character code works, since there's no real authentication yet.
 * A code that isn't in mockClasses opens the first class (BLUE42's learners).
 * Learners include anything saved with saveLearnerSetup().
 */
export function findClass(code: string | null | undefined): MockClass | undefined {
  if (!code || code.length !== 6) return undefined
  const cls = mockClasses.find((c) => c.code === code.toUpperCase()) ?? mockClasses[0]
  const setups = loadSetups()
  return { ...cls, learners: cls.learners.map((l) => ({ ...l, ...setups[l.id] })) }
}

export function findLearner(code: string | null | undefined, learnerId: string | null | undefined) {
  return findClass(code)?.learners.find((l) => l.id === learnerId)
}

/** The buddy's picture, or null if the learner has no buddy yet. */
export function buddyImage(learner: MockLearner): string | null {
  return learner.buddy ? companionArt[learner.buddy] : null
}
