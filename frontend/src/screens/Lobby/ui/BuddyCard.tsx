import { companionRegistry } from '../../../companions/registry'
import type { Classmate } from '../lobbyData'
import { CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'

/**
 * A classmate's Buddy card: the kid and their buddy, the buddy's name and kind,
 * and their level. It only talks about the buddy: Students have no names in
 * KIDDEX (brief 4.1), and a School ID is never shown. No scores. Wave (a Student
 * only: the Teacher's view shows the card without it). Badges come back when
 * they are real.
 */
export function BuddyCard({
  classmate,
  kidUrl,
  buddyUrl,
  onWave,
  onClose,
}: {
  classmate: Classmate
  /** Their pictures (the same ones that walk around the room). */
  kidUrl: string
  buddyUrl: string
  onWave?: () => void
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
      {onWave && (
        <div className={styles.acts}>
          <CardButton color="orange" primary onClick={onWave}>
            👋 Wave
          </CardButton>
        </div>
      )}
    </LobbyCard>
  )
}
