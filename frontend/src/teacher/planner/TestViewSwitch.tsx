import { useTestData, type TestMode } from '../data/testDataContext'
import styles from './TestViewSwitch.module.css'

// TESTING TOOL: delete this file (and TestViewSwitch.module.css) together with
// src/mock/teacherMock.ts when the database is connected.

const MODES: { mode: TestMode; label: string }[] = [
  { mode: 'sample', label: 'Sample data' },
  { mode: 'empty', label: 'Empty' },
]

/**
 * "Test view: Sample data | Empty", at the top of the stage between the
 * section tabs and the Ms. Cruz chip. Swaps the fake data right away (no
 * flip, no reload).
 */
export function TestViewSwitch() {
  const { mode, setMode } = useTestData()
  return (
    <div className={styles.slot}>
      <div className={styles.switch} role="group" aria-label="Test view (testing tool)">
        <span className={styles.label} title="Testing tool. Removed when the database is connected.">
          Test view:
        </span>
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            className={m.mode === mode ? `${styles.option} ${styles.on}` : styles.option}
            aria-pressed={m.mode === mode}
            onClick={() => setMode(m.mode)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
