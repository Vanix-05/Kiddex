import styles from './Desk.module.css'

/**
 * What the setup storybook lies on, for now: a wooden desk with a soft lamp
 * glow from the top-left and darker edges. The bedroom replaces it in a
 * later step: swap out <Desk> and <DeskProps> (and this file) together.
 */
export function Desk() {
  return <div className={styles.desk} aria-hidden="true" />
}

/**
 * A few small things half under the book: a sticky note, an eraser and a
 * pencil. Drawn on the 1440 x 900 stage, under the book, so they scale with it.
 */
export function DeskProps() {
  return (
    <div className={styles.props} aria-hidden="true">
      <span className={styles.note} />
      <span className={styles.eraser} />
      <svg className={styles.pencil} viewBox="0 0 300 40">
        <path
          d="M40 6h220l30 14-30 14H40z"
          fill="var(--color-pencil-body)"
          stroke="var(--color-card-border)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M260 6l30 14-30 14z"
          fill="var(--color-pencil-wood)"
          stroke="var(--color-card-border)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M280 15l10 5-10 5z" fill="var(--color-card-border)" />
        <path d="M40 13h220M40 27h220" stroke="var(--color-pencil-stripe)" strokeWidth="3" />
        <rect
          x="6"
          y="6"
          width="36"
          height="28"
          rx="6"
          fill="var(--color-eraser-pink)"
          stroke="var(--color-card-border)"
          strokeWidth="4"
        />
      </svg>
    </div>
  )
}
