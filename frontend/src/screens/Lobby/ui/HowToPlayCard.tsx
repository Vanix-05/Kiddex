import type { ReactNode } from 'react'
import { CardButton, LobbyCard } from './LobbyCard'
import { IS_TOUCH } from './touch'
import styles from './ui.module.css'

const Keys = ({ keys }: { keys: string }) => (
  <>
    {keys.split(' ').map((k) => (
      <kbd key={k} className={styles.key}>
        {k}
      </kbd>
    ))}
  </>
)

/** Opens once per session, and from Settings. A walking key also closes it. */
export function HowToPlayCard({ buddyName, onClose }: { buddyName: string; onClose: () => void }) {
  const rows: [ReactNode, string][] = IS_TOUCH
    ? [
        ['Tap the floor', 'Walk around the room'],
        ['Tap the button', 'Do the action near you: sit, talk, play'],
        ['Tap a classmate', 'See their Buddy card, wave, walk together'],
        [`Tap ${buddyName}`, 'Give your buddy some love'],
        ['Round buttons', 'Zoom in or out, and Settings'],
      ]
    : [
        [
          <>
            <Keys keys="W A S D" /> or click
          </>,
          'Walk around the room',
        ],
        [
          <>
            <Keys keys="E" /> or <Keys keys="Space" />
          </>,
          'Do the action near you: sit, talk, play',
        ],
        ['Click a classmate', 'See their Buddy card, wave, walk together'],
        [`Click ${buddyName}`, 'Give your buddy some love'],
        [<Keys keys="1 2 3 4 5" />, 'Send an emote'],
        [<Keys keys="C" />, 'Turn the camera. More in Settings (the gear)'],
      ]
  return (
    <LobbyCard label="How to play" onClose={onClose}>
      <h2 className={styles.cardTitle}>How to play</h2>
      <p className={styles.sub}>This is your classroom on Rene Island.</p>
      <div className={styles.howto}>
        {rows.map(([keys, text]) => (
          <div key={text}>
            <span className={styles.keys}>{keys}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
      <div className={styles.acts}>
        <CardButton color="orange" primary onClick={onClose}>
          Let's go!
        </CardButton>
      </div>
    </LobbyCard>
  )
}
