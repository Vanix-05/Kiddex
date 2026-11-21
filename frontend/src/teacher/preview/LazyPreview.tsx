import { lazy, Suspense } from 'react'
import styles from '../../games/GameRoute.module.css'

const Preview = lazy(() => import('./TeacherPreviewScreen').then((m) => ({ default: m.TeacherPreviewScreen })))

/** /teacher/lessons/:id/preview/:gameId, downloaded on demand (like /play), so the Teacher bundle does not grow. */
export function LazyTeacherPreviewScreen() {
  return (
    <Suspense
      fallback={
        <div className={styles.empty} role="status">
          <p className={styles.loading}>Getting the game ready…</p>
        </div>
      }
    >
      <Preview />
    </Suspense>
  )
}
