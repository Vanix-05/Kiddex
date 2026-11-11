import { characterArt } from '../../../assets/art'
import type { Mission } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import { LobbyIcon } from './icons'
import styles from './ui.module.css'

/** Ollie tells the Student about today's mission. */
export function MissionCard({ mission, onStart, onClose }: { mission: Mission; onStart: () => void; onClose: () => void }) {
  return (
    <LobbyCard label="Today's mission" onClose={onClose}>
      <BigIcon tint="--color-tint-peach">
        <img src={characterArt.ollie} alt="Ollie" draggable={false} />
      </BigIcon>
      <h2 className={styles.cardTitle}>{mission.title}</h2>
      <p className={styles.sub}>
        Hoo! {mission.teacher} made {mission.games} games from today's {mission.subject} lesson. Due {mission.due}.
      </p>
      <div className={styles.badges}>
        <span className={styles.badge}>
          <LobbyIcon name="star" size={16} /> +{mission.xp} XP
        </span>
        <span className={styles.badge}>
          <LobbyIcon name="star" size={16} /> +{mission.stars} stars
        </span>
      </div>
      <div className={styles.acts}>
        <CardButton onClick={onClose}>Later</CardButton>
        <CardButton color="orange" primary onClick={onStart}>
          Start
        </CardButton>
      </div>
    </LobbyCard>
  )
}
