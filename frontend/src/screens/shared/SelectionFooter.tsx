import { Button } from '../../components/Button/Button'
import styles from './SelectionFooter.module.css'

interface SelectionFooterProps {
  label: string
  hasSelection: boolean
  /** Shown while nothing is selected, to explain why the button is disabled. */
  hint: string
  onContinue: () => void
}

/** Continue button that stays disabled until something is picked. */
export function SelectionFooter({ label, hasSelection, hint, onContinue }: SelectionFooterProps) {
  return (
    <div className={styles.footer}>
      <Button withArrow disabled={!hasSelection} onClick={onContinue} className={styles.button}>
        {label}
      </Button>
      <p className={styles.hint} aria-live="polite">
        {hasSelection ? '' : hint}
      </p>
    </div>
  )
}
