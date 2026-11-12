import { useEffect, useRef, useState } from 'react'
import { LogOut, Play, RotateCcw } from 'lucide-react'
import styles from './PauseCard.module.css'

/**
 * Pause: Resume, Start over, Leave game. Leave asks first, because the round
 * isn't saved. Escape resumes (or steps back from "Leave this game?").
 */
export function PauseCard({ onResume, onRestart, onLeave }: { onResume: () => void; onRestart: () => void; onLeave: () => void }) {
  const [asking, setAsking] = useState(false)
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    first.current?.focus()
  }, [asking])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (asking) setAsking(false)
      else onResume()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asking, onResume])

  return (
    <div className={styles.dim}>
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="pause-title">
        {asking ? (
          <>
            <h2 id="pause-title" className={styles.title}>
              Leave this game?
            </h2>
            <p className={styles.text}>This round won’t be saved.</p>
            <div className={styles.buttons}>
              <button ref={first} type="button" className={`${styles.button} ${styles.primary}`} onClick={() => setAsking(false)}>
                Keep playing
              </button>
              <button type="button" className={styles.button} onClick={onLeave}>
                <LogOut size={20} aria-hidden="true" /> Leave game
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="pause-title" className={styles.title}>
              Paused
            </h2>
            <div className={styles.buttons}>
              <button ref={first} type="button" className={`${styles.button} ${styles.primary}`} onClick={onResume}>
                <Play size={20} fill="currentColor" aria-hidden="true" /> Resume
              </button>
              <button type="button" className={styles.button} onClick={onRestart}>
                <RotateCcw size={20} aria-hidden="true" /> Start over
              </button>
              <button type="button" className={styles.button} onClick={() => setAsking(true)}>
                <LogOut size={20} aria-hidden="true" /> Leave game
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
