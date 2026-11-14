import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import type { LobbyIconName } from './icons'
import styles from './ui.module.css'

/** The game corners that used to open a game: they point to All games now. */
export type MovedCorner = 'stage' | 'match'

const MOVED: Record<MovedCorner, { game: string; icon: LobbyIconName; tint: string }> = {
  stage: { game: 'Quiz Show', icon: 'mic', tint: '--color-tint-lavender' },
  match: { game: 'Match Up', icon: 'puzzle', tint: '--color-tint-mint' },
}

export function GameMovedCard({ corner, onOpen, onClose }: { corner: MovedCorner; onOpen: () => void; onClose: () => void }) {
  const { game, icon, tint } = MOVED[corner]
  return (
    <LobbyCard label={`${game} lives in All games now`} onClose={onClose}>
      <BigIcon icon={icon} tint={tint} />
      <h2 className={styles.cardTitle}>{game} lives in All games now</h2>
      <p className={styles.sub}>Every game is on one page, with today’s mission at the top.</p>
      <div className={styles.acts}>
        <CardButton onClick={onClose}>Not now</CardButton>
        <CardButton color="orange" primary onClick={onOpen}>
          Open All games
        </CardButton>
      </div>
    </LobbyCard>
  )
}
