import type { ClassGarden } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'

const STAGE_NAMES = ['Just planted', 'Little sprout', 'Growing tall', 'Buds!', 'In bloom!']

/**
 * The Class Garden: one sampaguita the whole section grows together. Every
 * mission anyone finishes waters it. Nobody is ranked: it's a class goal.
 */
export function GardenCard({ garden, stage, section, onClose }: { garden: ClassGarden; stage: number; section: string; onClose: () => void }) {
  const left = Math.max(0, garden.goal - garden.done)
  const bloomed = left === 0
  return (
    <LobbyCard label="Class Garden" onClose={onClose}>
      <BigIcon icon="sprout" tint="--color-tint-mint" />
      <h2 className={styles.cardTitle}>Class Garden</h2>
      <p className={styles.sub}>
        Every mission anyone in {section} finishes helps our sampaguita grow. <b>{STAGE_NAMES[stage]}</b>
      </p>
      <div className={styles.growBar} role="img" aria-label={`${garden.done} of ${garden.goal} missions`}>
        {Array.from({ length: garden.goal }, (_, i) => (
          <i key={i} className={i < garden.done ? styles.growOn : undefined} />
        ))}
      </div>
      <p className={styles.sub}>
        {bloomed ? (
          <b>It bloomed! Everyone gets a flower for their room. 🌼</b>
        ) : (
          <>
            <b>
              {left} more {left === 1 ? 'mission' : 'missions'}
            </b>{' '}
            until it blooms. Then everyone gets a flower for their room.
          </>
        )}
      </p>
      <div className={styles.acts}>
        <CardButton color="green" primary onClick={onClose}>
          OK
        </CardButton>
      </div>
    </LobbyCard>
  )
}
