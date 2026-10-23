import styles from './KiddexLogo.module.css'

/** "KIDDEX" wordmark with the "Learn · Play · Grow" tagline. */
export function KiddexLogo({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <div
      className={[styles.logo, size === 'sm' && styles.small, className].filter(Boolean).join(' ')}
      role="img"
      aria-label="KIDDEX: Learn, Play, Grow"
    >
      <span className={styles.word} aria-hidden="true">
        KIDDEX
      </span>
      <span className={styles.tagline} aria-hidden="true">
        Learn <span className={styles.dot}>·</span> Play <span className={styles.dot}>·</span> Grow
      </span>
    </div>
  )
}
