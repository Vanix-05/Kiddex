import { lazy, Suspense } from 'react'
import styles from '../GameRoute.module.css'

const AllGames = lazy(() => import('./AllGamesScreen').then((m) => ({ default: m.AllGamesScreen })))

/** /games, downloaded on demand (like the Lobby and the games). */
export function LazyAllGamesScreen() {
  return (
    <Suspense
      fallback={
        <div className={styles.empty} role="status">
          <p className={styles.loading}>Getting the games ready…</p>
        </div>
      }
    >
      <AllGames />
    </Suspense>
  )
}
