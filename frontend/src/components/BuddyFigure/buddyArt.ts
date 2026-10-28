import { companionArt } from '../../assets/art'
import { isCompanionId } from '../../companions/registry'
import type { BuddyId } from '../../setup/quizData'

/** True when the buddy has an animated rig (registry, or the otter's own rig). */
export const hasBuddyRig = (id: BuddyId) => id === 'otter' || isCompanionId(id)

/** The buddy's picture (assets/companions), if it has one yet. */
export const buddyPicture = (id: BuddyId): string | undefined =>
  (companionArt as Partial<Record<string, string>>)[id]

/**
 * True when the buddy can be picked: it has a rig or at least a picture.
 * Buddies with neither show a "Coming soon" silhouette.
 */
export const isBuddyReady = (id: BuddyId) => hasBuddyRig(id) || !!buddyPicture(id)
