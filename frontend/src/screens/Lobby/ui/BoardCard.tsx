import type { Mission } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'

/** The chalkboard: today's lesson message from the Teacher. */
export function BoardCard({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  return (
    <LobbyCard label="Today's lesson" onClose={onClose}>
      <BigIcon icon="book" tint="--color-tint-mint" />
      <h2 className={styles.cardTitle}>{mission.title}</h2>
      <p className={styles.sub}>
        Today's {mission.subject} lesson from {mission.teacher}
      </p>
      <div className={styles.list}>
        {mission.lesson.map((line) => (
          <div key={line.word}>
            <span aria-hidden="true">{line.icon}</span>
            <span>
              <b>{line.word}</b> {line.text}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.acts}>
        <CardButton color="orange" primary onClick={onClose}>
          Got it
        </CardButton>
      </div>
    </LobbyCard>
  )
}
