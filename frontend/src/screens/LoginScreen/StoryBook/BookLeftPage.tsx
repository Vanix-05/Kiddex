import type { ReactNode } from 'react'
import { sceneArt } from '../../../assets/art'
import { PageFooter } from './BookRightPage'
import styles from './BookPage.module.css'

/** Phone held sideways: the step's title, hint, boxes and Back, on Ollie's page. */
export interface LeftPageStep {
  title: ReactNode
  titleId?: string
  /** A small picture in the top-right corner (the PIN code padlock). */
  corner?: ReactNode
  onBack: () => void
  help?: ReactNode
  /** The hint and digit boxes (a CodeEntry). */
  entry: ReactNode
}

interface BookLeftPageProps {
  /** "CHAPTER 1", "CHAPTER 2", ... */
  chapter: number
  /** Ollie's title, e.g. "Hi, I'm Ollie!". */
  title: string
  /** His one line under it. */
  line: string
  pageNumber: number
  /** Ollie, standing in the picture frame (the book decides how he moves). Nothing = an empty frame. */
  ollie?: ReactNode
  /**
   * Phone held sideways: the picture frame is smaller and higher, Ollie's
   * story is left out (the hint says the same), and the step (if given) sits
   * under the picture.
   */
  phone?: boolean
  step?: LeftPageStep
}

/**
 * The left page of the storybook (Ollie's page): the chapter, a picture frame
 * with a rounded-arch top showing a small beach, Ollie standing in it, his
 * title and line, and a small star divider. 572x698, placed by its parent.
 */
export function BookLeftPage({ chapter, title, line, pageNumber, ollie, phone = false, step }: BookLeftPageProps) {
  return (
    <div className={phone ? `${styles.paper} ${styles.left} ${styles.phoneLeft}` : `${styles.paper} ${styles.left}`}>
      <p className={styles.chapter}>CHAPTER {chapter}</p>

      {/* The beach picture, made from the scene art: sky, cloud, island, sea. */}
      <div className={styles.picture} aria-hidden="true">
        <img src={sceneArt.cloud} alt="" className={styles.cloud} draggable={false} />
        <span className={styles.sea} />
        <img src={sceneArt.island} alt="" className={styles.island} draggable={false} />
      </div>
      <div className={styles.ollieSpot} aria-hidden="true">
        {ollie}
      </div>

      {!phone && (
        <>
          <p className={styles.story}>
            <strong>{title}</strong>
            <span>{line}</span>
          </p>

          <svg className={styles.divider} width="150" height="26" viewBox="0 0 150 26" aria-hidden="true">
            <path d="M6 13h46M98 13h46" stroke="var(--color-input-border)" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M75 3l3.2 6.4 7 1-5.1 5 1.2 7L75 19l-6.3 3.4 1.2-7-5.1-5 7-1z"
              fill="var(--color-padlock-body)"
              stroke="var(--color-card-border)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="58" cy="13" r="3" fill="var(--color-button-bg)" />
            <circle cx="92" cy="13" r="3" fill="var(--color-button-bg)" />
          </svg>
        </>
      )}

      {phone && step && (
        <div className={styles.phoneStep} data-page-step="">
          {step.corner && (
            <div className={styles.corner} aria-hidden="true">
              {step.corner}
            </div>
          )}
          <div className={styles.phoneStepMain}>
            <h2 id={step.titleId} className={styles.title}>
              {step.title}
            </h2>
            {step.entry}
          </div>
          <PageFooter onBack={step.onBack} help={step.help} />
        </div>
      )}

      <span className={styles.pageNumber} aria-hidden="true">
        {pageNumber}
      </span>
    </div>
  )
}
