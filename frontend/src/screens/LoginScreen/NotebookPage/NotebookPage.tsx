import type { ReactNode } from 'react'
import { Icon } from '../../../components/Icon/Icon'
import styles from './NotebookPage.module.css'

/** The New Student set-up steps, shown as sticky notes. */
const STEPS = ['School ID', 'One-time code', 'PIN code'] as const

interface NotebookPageProps {
  /** Big title with the yellow highlighter stroke, e.g. "Hi, Student!". */
  title: ReactNode
  /** A longer title (e.g. "Type your PIN code"): a little smaller, so the
      sticky notes stay beside it instead of wrapping onto their own line. */
  longTitle?: boolean
  titleId?: string
  subtitle?: ReactNode
  /** Which sticky note is the current one (1-3). */
  step: 1 | 2 | 3
  onBack: () => void
  children: ReactNode
  className?: string
}

/**
 * A spiral-notebook page: lined cream paper with a red margin line, rings
 * along the top, the step sticky notes, and Back / "Ask your teacher" at the
 * bottom. Used by the New Student steps (School ID, one-time code, PIN code).
 * It fills its parent, which sets its size and position.
 */
export function NotebookPage({ title, longTitle = false, titleId, subtitle, step, onBack, children, className }: NotebookPageProps) {
  return (
    <div className={[styles.page, className].filter(Boolean).join(' ')}>
      <span className={styles.rings} aria-hidden="true" data-notebook-rings="">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={styles.ring} />
        ))}
      </span>

      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={longTitle ? `${styles.title} ${styles.titleLong}` : styles.title}>
            <span className={styles.highlight}>{title}</span>
          </h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        <ol className={styles.notes} aria-label="Steps">
          {STEPS.map((label, i) => {
            // Done steps are green with a ✓, the current one orange, later ones pale.
            const current = i + 1 === step
            const done = i + 1 < step
            const className = current
              ? `${styles.note} ${styles.noteOn}`
              : done
                ? `${styles.note} ${styles.noteDone}`
                : styles.note
            return (
              <li key={label} className={className}>
                <span className={styles.noteNumber}>
                  {i + 1}
                  {done && <span aria-hidden="true"> ✓</span>}
                </span>
                {label}
                {current && <span className="visually-hidden"> (this step)</span>}
                {done && <span className="visually-hidden"> (done)</span>}
              </li>
            )
          })}
        </ol>
      </header>

      <div className={styles.body}>{children}</div>

      <footer className={styles.footer}>
        <button type="button" className={styles.back} onClick={onBack}>
          <Icon name="arrowLeft" size={18} />
          Back
        </button>
        <p className={styles.help}>
          No card? <strong>Ask your teacher</strong> <span aria-hidden="true">🙋</span>
        </p>
      </footer>
    </div>
  )
}
