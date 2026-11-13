import styles from './Wing.module.css'

/**
 * One of Ollie's flying wings. It sits behind his body, sticks out to its
 * side and flaps from the shoulder. The left one is the right one mirrored.
 * Its parent must be Ollie's box (428:600) with `position: relative`.
 */
export function Wing({ side }: { side: 'left' | 'right' }) {
  return (
    <span className={side === 'left' ? `${styles.wing} ${styles.left}` : `${styles.wing} ${styles.right}`}>
      <svg viewBox="-20 -70 230 200">
        <g stroke="var(--color-card-border)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M-6 0 C30 -40 120 -66 196 -50 C188 -30 176 -18 160 -10 C170 4 160 16 140 18 C150 34 136 46 114 44 C120 62 102 72 80 66 C82 86 60 96 38 88 C30 108 4 110 -8 96 C-18 70 -18 30 -6 0 Z"
            fill="var(--color-ollie-wing-fill)"
          />
          <path
            d="M150 -44 C130 -30 112 -24 92 -20 M136 12 C116 12 98 10 80 6 M106 40 C88 40 72 34 58 26 M72 62 C56 60 42 52 32 42"
            fill="none"
            stroke="var(--color-ollie-wing-line)"
            strokeWidth="4"
          />
        </g>
        <g fill="var(--color-ollie-wing-spot)">
          <ellipse cx="22" cy="20" rx="7" ry="5" />
          <ellipse cx="44" cy="4" rx="6" ry="4" />
          <ellipse cx="30" cy="52" rx="6" ry="4" />
          <ellipse cx="62" cy="-10" rx="5" ry="3.5" />
        </g>
      </svg>
    </span>
  )
}
