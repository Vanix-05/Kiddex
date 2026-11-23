import { companionRegistry } from '../../../companions/registry'
import type { Classmate } from '../lobbyData'
import { CardButton, LobbyCard } from './LobbyCard'
import { LobbyIcon } from './icons'
import styles from './ui.module.css'

/**
 * A classmate's Buddy card: the kid and their buddy, the buddy's name and kind,
 * level and badges. It only talks about the buddy: Students have no names in
 * KIDDEX (brief 4.1), and a School ID is never shown. No scores. Wave, or ask them to walk with you (a Student only: the
 * Teacher's view shows the card without them).
 */
export function BuddyCard({
  classmate,
  kidUrl,
  buddyUrl,
  walking,
  onWave,
  onWalk,
  onClose,
}: {
  classmate: Classmate
  /** Their pictures (the same ones that walk around the room). */
  kidUrl: string
  buddyUrl: string
  /** They are walking with the Student right now. */
  walking: boolean
  onWave?: () => void
  onWalk?: (walk: boolean) => void
  onClose: () => void
}) {
  const kind = companionRegistry[classmate.buddy].name
  const title = `${classmate.buddyName} the ${kind}`
  return (
    <LobbyCard label={`${title}, a classmate's buddy`} onClose={onClose}>
      <div className={styles.duo}>
        <img src={kidUrl} alt="A classmate" draggable={false} />
        <img src={buddyUrl} alt={title} draggable={false} />
      </div>
      <h2 className={styles.cardTitle}>{title}</h2>
      <p className={styles.sub}>A classmate's buddy · Lv {classmate.level}</p>
      <div className={styles.badges}>
        <span className={styles.badge}>
          <LobbyIcon name="medal" size={16} /> {classmate.badges} badges
        </span>
      </div>
      {(onWave || onWalk) && (
        <div className={styles.acts}>
          {onWave && (
            <CardButton color="orange" primary onClick={onWave}>
              👋 Wave
            </CardButton>
          )}
          {onWalk && (
            <CardButton color="green" onClick={() => onWalk(!walking)}>
              {walking ? 'Stop' : 'Walk with me'}
            </CardButton>
          )}
        </div>
      )}
    </LobbyCard>
  )
}
