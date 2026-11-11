import styles from './ui.module.css'

/** A short message above the emote bar. It fades out by itself, then calls onDone. */
export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  return (
    <div className={styles.toast} role="status" onAnimationEnd={onDone}>
      {text}
    </div>
  )
}
