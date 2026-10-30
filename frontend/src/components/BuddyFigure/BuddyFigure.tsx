import { Companion } from '../../companions/Companion'
import { isCompanionId } from '../../companions/registry'
import type { BuddyId } from '../../setup/quizData'
import { buddyPicture } from './buddyArt'
import styles from './BuddyFigure.module.css'

/**
 * A buddy, as animated as its art allows: its rig if it has one, otherwise
 * its picture with a gentle idle bob. Renders nothing if it has neither.
 */
export function BuddyFigure({ id, name, className }: { id: BuddyId; name?: string; className?: string }) {
  if (isCompanionId(id)) return <Companion id={id} className={className} />

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
