import { lazy, Suspense } from 'react'
import styles from './GameRoute.module.css'

const Play = lazy(() => import('./PlayScreen').then((m) => ({ default: m.PlayScreen })))

/** /play/:gameId, downloaded on demand (like the Lobby). */
export function LazyPlayScreen() {
  return (
    <Suspense
      fallback={
        <div className={styles.empty} role="status">
          <p className={styles.loading}>Getting the game ready…</p>
        </div>
      }
    >
      <Play />
    </Suspense>
  )
}
