import type { ReactNode } from 'react'
import { sceneArt } from '../../../assets/art'
import styles from './BookPage.module.css'

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
}

/**
 * The left page of the storybook (Ollie's page): the chapter, a picture frame
 * with a rounded-arch top showing a small beach, Ollie standing in it, his
 * title and line, and a small star divider. 572x698, placed by its parent.
 */
export function BookLeftPage({ chapter, title, line, pageNumber, ollie }: BookLeftPageProps) {
  return (
    <div className={`${styles.paper} ${styles.left}`}>
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

      <span className={styles.pageNumber} aria-hidden="true">
        {pageNumber}
      </span>
    </div>
  )
}
