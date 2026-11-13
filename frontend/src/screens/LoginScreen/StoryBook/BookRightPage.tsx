import type { ReactNode } from 'react'
import { Icon } from '../../../components/Icon/Icon'
import styles from './BookPage.module.css'

interface BookRightPageProps {
  /** Big title with the yellow highlighter stroke, e.g. "Hi, Student!". */
  title: ReactNode
  titleId?: string
  /** A small picture in the top-right corner (the PIN code padlock). */
  corner?: ReactNode
  onBack: () => void
  /** The help line next to Back. Default: "No card? Ask your teacher". */
  help?: ReactNode
  pageNumber: number
  /** The step itself (a CodeStep: hint, digit boxes, number pad, button). */
  children: ReactNode
}

/**
 * The right page of the storybook: the step title, the step, and Back /
 * "Ask your teacher" at the bottom. 572x698, placed by its parent.
 */
export function BookRightPage({ title, titleId, corner, onBack, help, pageNumber, children }: BookRightPageProps) {
  return (
    <div className={`${styles.paper} ${styles.right}`}>
      {corner && (
        <div className={styles.corner} aria-hidden="true">
          {corner}
        </div>
      )}

      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>

      {children}

      <footer className={styles.footer}>
        <button type="button" className={styles.back} onClick={onBack}>
          <Icon name="arrowLeft" size={20} />
          Back
        </button>
        <p className={styles.help}>
          {help ?? (
            <>
              No card? <strong>Ask your teacher</strong>
            </>
          )}
        </p>
      </footer>

      <span className={styles.pageNumber} aria-hidden="true">
        {pageNumber}
      </span>
    </div>
  )
}
