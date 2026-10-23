import type { ReactNode } from 'react'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import styles from './SetupLayout.module.css'

interface SetupLayoutProps {
  children: ReactNode
  /** Wider card (for big grids, e.g. Choose Your Companion). */
  wide?: boolean
}

/** Logo top-left + one centered card, on the same beach scene as Login. */
export function SetupLayout({ children, wide = false }: SetupLayoutProps) {
  return (
    <SceneBackground>
      <div className={[styles.layout, wide && styles.wide].filter(Boolean).join(' ')}>
        <header className={styles.brand}>
          <KiddexLogo size="sm" />
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </SceneBackground>
  )
}
