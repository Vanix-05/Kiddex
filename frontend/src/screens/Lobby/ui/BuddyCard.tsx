import { companionRegistry } from '../../../companions/registry'
import type { Classmate } from '../lobbyData'
import { CardButton, LobbyCard } from './LobbyCard'
import { LobbyIcon } from './icons'
import styles from './ui.module.css'

/**
 * A classmate's Buddy card: the kid and their buddy, names, level and badges.
 * No scores. Wave, or ask them to walk with you.
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
  onWave: () => void
  onWalk: (walk: boolean) => void
  onClose: () => void
}) {
  const kind = companionRegistry[classmate.buddy].name
  return (
    <LobbyCard label={`${classmate.name}'s Buddy card`} onClose={onClose}>
      <div className={styles.duo}>
        <img src={kidUrl} alt={classmate.name} draggable={false} />
        <img src={buddyUrl} alt={`${classmate.buddyName} the ${kind}`} draggable={false} />
      </div>
      <h2 className={styles.cardTitle}>{classmate.name}</h2>
      <p className={styles.sub}>
        with {classmate.buddyName} the {kind} · Lv {classmate.level}
      </p>
      <div className={styles.badges}>
        <span className={styles.badge}>
          <LobbyIcon name="medal" size={16} /> {classmate.badges} badges
        </span>
      </div>
      <div className={styles.acts}>
        <CardButton color="orange" primary onClick={onWave}>
          👋 Wave
        </CardButton>
        <CardButton color="green" onClick={() => onWalk(!walking)}>
          {walking ? 'Stop' : 'Walk with me'}
        </CardButton>
      </div>
    </LobbyCard>
  )
}
