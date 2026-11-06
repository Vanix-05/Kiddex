import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  /** Shown in the yellow pill at the top of the card. */
  title?: string
  subtitle?: ReactNode
  children: ReactNode
  className?: string
  /** Marks on each side of the title: sparkle rays (default) or chevrons. */
  titleMarks?: 'rays' | 'chevrons'
}

/** Cream rounded panel with the brown outline used on every screen. */
export function Card({ title, subtitle, children, className, titleMarks = 'rays' }: CardProps) {
  const Marks = titleMarks === 'chevrons' ? Chevron : Rays
  return (
    <section className={[styles.card, className].filter(Boolean).join(' ')}>
      {title && (
        <div className={styles.titleRow}>
          <Marks />
          <h1 className={styles.title}>{title}</h1>
          <Marks flip />
        </div>
      )}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {children}
    </section>
  )
}

/** The little sparkle marks on each side of the title. */
function Rays({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 32"
      width="20"
      height="28"
      aria-hidden="true"
      className={styles.rays}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M4 6l14 6M2 18h16M4 30l14-6" stroke="var(--color-title-rays)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

/** Small orange chevron on each side of the title, pointing at it. */
function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 20"
      width="14"
      height="18"
      aria-hidden="true"
      className={styles.rays}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M3 4l10 6-10 6"
        fill="none"
        stroke="var(--color-title-rays)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
