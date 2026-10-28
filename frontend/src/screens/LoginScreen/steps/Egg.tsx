import { useId } from 'react'
import styles from './Egg.module.css'

/**
 * Speckled egg shown for a learner who has no buddy yet.
 * It wobbles every few seconds (none with "reduce motion"). Decorative only.
 * Size it with width/height via className.
 */
export function Egg({ className }: { className?: string }) {
  const fillId = useId()

  return (
    <svg
      viewBox="0 0 100 120"
      className={[styles.egg, className].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={fillId} cx="38%" cy="32%" r="75%">
          <stop offset="0%" style={{ stopColor: 'var(--color-input-bg)' }} />
          <stop offset="65%" style={{ stopColor: 'var(--color-label-pill-bg)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-tint-peach)' }} />
        </radialGradient>
      </defs>

      {/* Ground shadow: stays still while the egg wobbles. */}
      <ellipse cx="50" cy="112" rx="28" ry="5" className={styles.shadow} />

      <g className={styles.body}>
        <path
          d="M50 6C74 6 90 46 90 72c0 24-18 38-40 38S10 96 10 72C10 46 26 6 50 6z"
          style={{ fill: `url(#${fillId})`, stroke: 'var(--color-card-border)' }}
          strokeWidth="2.5"
          strokeOpacity="0.75"
        />

        {/* Speckles */}
        <g style={{ fill: 'var(--color-title-rays)' }} fillOpacity="0.55">
          <ellipse cx="34" cy="40" rx="3.6" ry="3" />
          <ellipse cx="64" cy="30" rx="2.6" ry="2.2" />
          <ellipse cx="72" cy="58" rx="4" ry="3.2" />
          <ellipse cx="24" cy="70" rx="2.8" ry="2.4" />
          <ellipse cx="58" cy="96" rx="3.4" ry="2.6" />
        </g>
        <g style={{ fill: 'var(--color-logo-shadow)' }} fillOpacity="0.8">
          <circle cx="48" cy="22" r="2" />
          <circle cx="78" cy="78" r="2.2" />
          <circle cx="30" cy="92" r="2.4" />
          <circle cx="44" cy="54" r="1.6" />
          <circle cx="20" cy="54" r="1.8" />
        </g>

        {/* Shine */}
        <ellipse cx="34" cy="28" rx="6" ry="11" transform="rotate(28 34 28)" fill="#fff" fillOpacity="0.75" />

        {/* Sleepy face */}
        <g style={{ stroke: 'var(--color-card-border)' }} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M37 76q4 4 8 0" />
          <path d="M55 76q4 4 8 0" />
        </g>
        <ellipse cx="33" cy="84" rx="5" ry="3" style={{ fill: 'var(--color-tint-pink)' }} />
        <ellipse cx="67" cy="84" rx="5" ry="3" style={{ fill: 'var(--color-tint-pink)' }} />
      </g>
    </svg>
  )
}
