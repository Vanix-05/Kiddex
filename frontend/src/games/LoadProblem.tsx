import { errorMessage } from '../teacher/api/client'
import styles from './GameRoute.module.css'

/** The Student's games data is on its way (the free server can take up to a minute to wake up). */
export function GamesLoading({ text }: { text: string }) {
  return (
    <div className={styles.empty} role="status">
      <p className={styles.loading}>{text}</p>
    </div>
  )
}

/** The games data couldn't load: the friendly message and Try again. */
export function LoadProblem({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.card} role="alert">
        <h1>{title}</h1>
        <p>{errorMessage(error)}</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}
