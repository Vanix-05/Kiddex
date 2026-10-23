import type { ReactNode } from 'react'
import { sceneArt } from '../../assets/art'
import styles from './SignPost.module.css'

/** Wooden sign standing on the beach, with optional hand-written text. */
export function SignPost({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={[styles.sign, className].filter(Boolean).join(' ')}>
      <img src={sceneArt.sign} alt="" />
      {children && <p className={styles.text}>{children}</p>}
    </div>
  )
}
