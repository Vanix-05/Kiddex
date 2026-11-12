import type { CSSProperties } from 'react'
import styles from './Confetti.module.css'

const COLORS = [
  'var(--color-stage-curtain-light)',
  'var(--color-game-bulb)',
  'var(--color-game-letter-b)',
  'var(--color-game-letter-d)',
  'var(--color-game-letter-c)',
  'var(--color-pair-pink-yarn)',
  'var(--color-game-letter-a)',
]

/** A small seeded random (the same shower every time: no randomness while drawing). */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const rand = seeded(42)
const PIECES = Array.from({ length: 70 }, (_, i) => ({
  left: rand() * 100,
  delay: rand() * 1.6,
  duration: 2.6 + rand() * 1.8,
  spin: (rand() > 0.5 ? 1 : -1) * (360 + rand() * 540),
  drift: (rand() - 0.5) * 120,
  size: 8 + rand() * 7,
  round: i % 5 === 0,
  color: COLORS[i % COLORS.length],
}))

/** Paper confetti falling behind the board and the UI. Not drawn with less motion. */
export function Confetti() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={p.round ? `${styles.piece} ${styles.round}` : styles.piece}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--spin': `${p.spin}deg`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
