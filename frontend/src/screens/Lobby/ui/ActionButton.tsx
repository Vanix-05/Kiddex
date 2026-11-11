import type { Ref } from 'react'
import { IS_TOUCH } from './touch'
import styles from './ui.module.css'

/**
 * What the Student can do right here ("Sit", "Talk to Ollie", ...). The game
 * keeps it over their head; keyboard users press E instead.
 */
export function ActionButton({ label, anchorRef, onRun }: { label: string; anchorRef: Ref<HTMLButtonElement>; onRun: () => void }) {
  return (
    <button ref={anchorRef} type="button" className={`${styles.action} ${IS_TOUCH ? styles.actionTouch : ''}`} onClick={onRun}>
      {!IS_TOUCH && (
        <kbd className={styles.key} aria-hidden="true">
          E
        </kbd>
      )}
      {label}
    </button>
  )
}
