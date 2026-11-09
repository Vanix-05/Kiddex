import { Companion } from '../../companions/Companion'
import { isCompanionId } from '../../companions/registry'
import type { RigLook } from '../../companions/TracedRig'
import type { BuddyId } from '../../setup/quizData'
import { buddyPicture } from './buddyArt'
import styles from './BuddyFigure.module.css'

/**
 * A buddy, as animated as its art allows: its rig if it has one, otherwise
 * its picture with a gentle idle bob. Renders nothing if it has neither.
 * The look (colors, extras, buddy color) only shows on buddies with a rig.
 */
export function BuddyFigure({
  id,
  name,
  className,
  ...look
}: { id: BuddyId; name?: string; className?: string } & RigLook) {
  if (isCompanionId(id)) return <Companion id={id} className={className} {...look} />

  const picture = buddyPicture(id)
  if (!picture) return null
  return (
    <img
      src={picture}
      alt={name ?? id}
      className={[styles.picture, className].filter(Boolean).join(' ')}
      draggable={false}
    />
  )
}
