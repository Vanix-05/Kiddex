import type { ReactNode } from 'react'
import { Ollie } from './Ollie'
import styles from './SetupStage.module.css'

interface SetupStageProps {
  /** Heading for screen readers (the page has no visible title pill). */
  title: string
  ollieSays: string
  /** The book or box on the left. */
  children: ReactNode
}

/** Setup screen layout: the book (or box) on the left, Ollie on the right. */
export function SetupStage({ title, ollieSays, children }: SetupStageProps) {
  return (
    <div className={styles.stage}>
      <h1 className="visually-hidden">{title}</h1>
      <div className={styles.main}>{children}</div>
      <div className={styles.guide}>
        <Ollie says={ollieSays} />
      </div>
    </div>
  )
}

/** Plain bordered box, used for the reveal and the placeholder pages. */
export function PlainBox({ children }: { children: ReactNode }) {
  return <section className={styles.plainBox}>{children}</section>
}
