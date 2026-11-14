import type { BuddyId } from '../../setup/quizData'

/**
 * The magic fall has to stay on screen while the page underneath changes
 * from the setup storybook to the Customize Bridge (it cross-fades into it).
 * So it isn't drawn by either screen: the setup book asks for it here, and
 * MagicFallHost (in App.tsx, above the routes) draws it.
 */
export interface MagicFallJob {
  buddy: BuddyId
  buddyColor?: string
}

let job: MagicFallJob | null = null
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

export const magicFall = {
  /** Play the magic fall with this buddy. */
  start(next: MagicFallJob) {
    job = next
    changed()
  },
  /** It is over. */
  clear() {
    if (!job) return
    job = null
    changed()
  },
  current: () => job,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
