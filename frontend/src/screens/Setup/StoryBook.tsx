import type { ReactNode } from 'react'
import styles from './StoryBook.module.css'

/** Length of a page turn. Must match `page-turn` in StoryBook.module.css. */
export const TURN_MS = 800

export type TurnDirection = 'forward' | 'back'

interface StoryBookProps {
  /** Play a page turn: forward (right page to the left) or back. */
  turning?: TurnDirection | null
  /** Small text in the bottom-left corner, e.g. "Page 2 of 5". */
  pageNumber?: string
  children: ReactNode
}

/** The open storybook used on every setup page: cover, two pages and the page turn. */
export function StoryBook({ turning = null, pageNumber, children }: StoryBookProps) {
  return (
    <div className={styles.book}>
      <div className={styles.pages}>
        <div className={styles.pageLeft} aria-hidden="true" />
        <div className={styles.pageRight} aria-hidden="true" />

        {children}

        {pageNumber && (
          <span className={styles.pageNumber} aria-hidden="true">
            {pageNumber}
          </span>
        )}

        {turning && (
          <div className={styles.flip} data-dir={turning} aria-hidden="true">
            <div className={styles.flipFront} />
            <div className={styles.flipBack} />
          </div>
        )}
      </div>
    </div>
  )
}

interface PageContentProps {
  children: ReactNode
  /** This content appears halfway through a page turn: wait until the page lands. */
  afterTurn?: boolean
  /** Fade in when first shown (e.g. arriving from the previous book page). */
  enter?: boolean
  /** Fade out (the page is about to turn away). */
  leaving?: boolean
  className?: string
}

/** What's written on the open book (spans both pages). */
export function PageContent({ children, afterTurn, enter, leaving, className }: PageContentProps) {
  return (
    <div
      className={[styles.content, className].filter(Boolean).join(' ')}
      data-after-turn={afterTurn || undefined}
      data-enter={enter || undefined}
      data-leaving={leaving || undefined}
    >
      {children}
    </div>
  )
}
