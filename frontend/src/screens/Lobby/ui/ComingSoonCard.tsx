import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import type { LobbyIconName } from './icons'
import styles from './ui.module.css'

/** Everything that isn't built yet. Each has its own icon. */
export type SoonKind = 'myRoom' | 'allGames' | 'mission' | 'island' | 'stage' | 'match' | 'nook' | 'stars'

const SOON: Record<SoonKind, { title: string; icon: LobbyIconName; tint: string; text: string }> = {
  myRoom: { title: 'My Room', icon: 'house', tint: '--color-tint-peach', text: 'Your room with your buddy is coming soon.' },
  allGames: { title: 'All games', icon: 'pad', tint: '--color-info-bg', text: 'The games page is coming soon.' },
  mission: { title: 'Mission games', icon: 'pad', tint: '--color-info-bg', text: 'The mission games are coming soon.' },
  island: { title: 'Rene Island', icon: 'palm', tint: '--color-tint-mint', text: 'The island is coming soon.' },
  stage: { title: 'Quiz Stage', icon: 'mic', tint: '--color-tint-lavender', text: 'Step up and answer quiz questions. This game is coming soon.' },
  match: { title: 'Match Corner', icon: 'puzzle', tint: '--color-tint-mint', text: 'Match each word to its picture. This game is coming soon.' },
  stars: { title: 'Star Students', icon: 'medal', tint: '--color-tint-peach', text: 'The Star Students board is coming soon.' },
  nook: { title: 'Word Nook', icon: 'book', tint: '--color-tint-pink', text: 'Word games in the reading corner are coming soon.' },
}

export function ComingSoonCard({ kind, onClose }: { kind: SoonKind; onClose: () => void }) {
  const { title, icon, tint, text } = SOON[kind]
  return (
    <LobbyCard label={`${title}: coming soon`} onClose={onClose}>
      <BigIcon icon={icon} tint={tint} />
      <h2 className={styles.cardTitle}>{title}</h2>
      <p className={styles.soon}>Coming soon</p>
      <p className={styles.sub}>{text}</p>
      <div className={styles.acts}>
        <CardButton color="orange" primary onClick={onClose}>
          OK
        </CardButton>
      </div>
    </LobbyCard>
  )
}
