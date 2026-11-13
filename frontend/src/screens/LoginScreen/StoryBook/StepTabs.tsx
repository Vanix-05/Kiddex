import { Icon } from '../../../components/Icon/Icon'
import styles from './StepTabs.module.css'

interface StepTabsProps {
  /** The step names, e.g. ["School ID", "PIN code"]. */
  steps: readonly string[]
  /** Which tab is the current one (1 = the first). */
  step: number
  className?: string
}

/**
 * Index tabs sticking out of the right edge of the storybook, one per step.
 * Current = orange and longer, done = green with a check, next = pale.
 */
export function StepTabs({ steps, step, className }: StepTabsProps) {
  return (
    <ol className={[styles.tabs, className].filter(Boolean).join(' ')} aria-label="Steps">
      {steps.map((label, i) => {
        const current = i + 1 === step
        const done = i + 1 < step
        const tabClass = current ? `${styles.tab} ${styles.on}` : done ? `${styles.tab} ${styles.done}` : styles.tab
        return (
          <li key={label} className={tabClass}>
            <span className={styles.number}>
              {i + 1}
              {done && <Icon name="check" size={20} />}
            </span>
            {label}
            {current && <span className="visually-hidden"> (this step)</span>}
            {done && <span className="visually-hidden"> (done)</span>}
          </li>
        )
      })}
    </ol>
  )
}
