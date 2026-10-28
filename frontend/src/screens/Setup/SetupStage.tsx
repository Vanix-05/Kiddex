import type { ReactNode } from 'react'
import { Ollie } from './Ollie'
import styles from './SetupStage.module.css'

interface SetupStageProps {
  /** Heading for screen readers (the page has no visible title pill). */
  title: string
  /** Ollie on the right, saying this. */
  ollieSays?: string
  /** Or something else on the right instead of Ollie (e.g. the pet on /setup/pet). */
  aside?: ReactNode
  /** Use more of the screen width (the pet page: its pet stands under the sun). */
  wide?: boolean
  /** The book or box on the left. */
  children: ReactNode
}

/** Setup screen layout: the book (or box) on the left, Ollie (or `aside`) on the right. */
export function SetupStage({ title, ollieSays, aside, wide = false, children }: SetupStageProps) {
  return (
    <div className={[styles.stage, wide && styles.wideStage].filter(Boolean).join(' ')}>
      <h1 className="visually-hidden">{title}</h1>
      <div className={styles.main}>{children}</div>
      <div className={styles.guide}>{aside ?? (ollieSays !== undefined && <Ollie says={ollieSays} />)}</div>
    </div>
  )
}

/** Plain bordered box, used for the reveal page. */
export function PlainBox({ children }: { children: ReactNode }) {
  return <section className={styles.plainBox}>{children}</section>
}
