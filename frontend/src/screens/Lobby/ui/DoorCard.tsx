import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'

/** Opens when the Student walks onto the door mat. */
export function DoorCard({ onGo, onClose }: { onGo: () => void; onClose: () => void }) {
  return (
    <LobbyCard label="Go outside?" onClose={onClose}>
      <BigIcon icon="palm" tint="--color-tint-mint" />
      <h2 className={styles.cardTitle}>Go outside?</h2>
      <p className={styles.sub}>Leave the classroom and walk around Rene Island.</p>
      <div className={styles.acts}>
        <CardButton onClick={onClose}>Stay</CardButton>
        <CardButton color="green" primary onClick={onGo}>
          Yes
        </CardButton>
      </div>
    </LobbyCard>
  )
}
