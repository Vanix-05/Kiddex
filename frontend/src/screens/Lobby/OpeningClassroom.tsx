import styles from './OpeningClassroom.module.css'

/**
 * A short cream screen while the Lobby is on its way: first its download (if
 * it wasn't ready yet), then while the characters are drawn. Never a blank one.
 */
export function OpeningClassroom() {
  return (
    <p className={styles.opening} role="status">
      Opening your classroom…
    </p>
  )
}
