import type { CSSProperties } from 'react'
import styles from './Confetti.module.css'

const COLORS = [
  'var(--color-button-bg)',
  'var(--color-tint-pink)',
  'var(--color-tint-lavender)',
  'var(--color-title-pill-bg)',
  'var(--color-tint-periwinkle)',
  'var(--color-logo-orange)',
]

const COUNT = 28

// Fixed "random-looking" pieces, worked out once, so every burst is the same.
const PIECES = Array.from({ length: COUNT }, (_, i) => {
  const angle = (i / COUNT) * Math.PI * 2 + (i % 3) * 0.2
  const distance = 90 + ((i * 37) % 80)
  return {
    '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
    // a little extra lift, so it bursts upward more than down
    '--dy': `${Math.round(Math.sin(angle) * distance - 40)}px`,
    '--rot': `${(i * 67) % 360}deg`,
    '--delay': `${(i % 4) * 30}ms`,
    background: COLORS[i % COLORS.length],
    borderRadius: i % 2 ? '50%' : '3px',
  } as CSSProperties
})

/** A small one-off confetti burst from the middle of its parent (which must be position: relative). */
export function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {PIECES.map((style, i) => (
        <span key={i} className={styles.piece} style={style} />
      ))}
    </div>
  )
}
