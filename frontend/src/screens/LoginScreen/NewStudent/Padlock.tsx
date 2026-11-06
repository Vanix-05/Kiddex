import styles from './Padlock.module.css'

/**
 * Yellow padlock on the Create PIN code page. The shackle pops open with a
 * little bounce once the PIN code is complete, and closes again if a digit is
 * deleted. Drawn at 104x72 (body) in a 120x132 box; CSS sets the size.
 */
export function Padlock({ open }: { open: boolean }) {
  return (
    <svg className={styles.lock} viewBox="0 0 120 132" aria-hidden="true">
      {/* Shackle: a brown outline under the gold, so it reads 11px thick with a border. */}
      <g className={open ? `${styles.shackle} ${styles.open}` : styles.shackle}>
        <path d="M34 70 V40 a26 26 0 0 1 52 0 V70" fill="none" stroke="var(--color-card-border)" strokeWidth="19" />
        <path d="M34 70 V40 a26 26 0 0 1 52 0 V70" fill="none" stroke="var(--color-padlock-shackle)" strokeWidth="11" />
      </g>

      {/* Body */}
      <rect
        x="8"
        y="56"
        width="104"
        height="72"
        rx="18"
        fill="var(--color-padlock-body)"
        stroke="var(--color-card-border)"
        strokeWidth="4"
      />

      {/* Keyhole */}
      <circle cx="60" cy="85" r="8" fill="var(--color-card-border)" />
      <path d="M55 88 h10 l3 20 h-16 z" fill="var(--color-card-border)" strokeLinejoin="round" />
    </svg>
  )
}
