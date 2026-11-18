import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Icon } from '../../../components/Icon/Icon'
import styles from './CodeStep.module.css'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'] as const

export interface CodeStepProps {
  /** One line right under the title. */
  hint: ReactNode
  /** What the boxes hold, for screen readers, e.g. "School ID". */
  label: string
  /** Box groups with a dash between them, e.g. [4, 4] for 2026-0144. */
  groups: number[]
  /** The digits typed so far (kept by StudentFlow, so Back keeps them). */
  value: string
  /** A state setter, so fast typing never drops a digit (updates build on the latest value). */
  onChange: Dispatch<SetStateAction<string>>
  /** PIN code: show dots, with a "Show numbers" toggle under the boxes. */
  masked?: boolean
  /** PIN code: 4 bigger boxes, slightly shorter number keys. */
  large?: boolean
  submitLabel: string
  onSubmit: () => void
  /** Off while the page is animating or is a still copy, so typing is ignored. */
  active: boolean
}

const totalLength = (groups: number[]) => groups.reduce((a, b) => a + b, 0)

/** The step's size class: PIN code (large), 6 roomy boxes, or 8 boxes. */
function stepClass(groups: number[], large: boolean) {
  if (large) return `${styles.step} ${styles.large}`
  return totalLength(groups) <= 6 ? `${styles.step} ${styles.roomy}` : styles.step
}

/**
 * A step on the storybook's right page: big digit boxes, a number pad (or the keyboard:
 * digits, Backspace, Delete) and a button that turns on once all the boxes
 * are filled.
 */
export function CodeStep(props: CodeStepProps) {
  return (
    <div className={stepClass(props.groups, props.large ?? false)}>
      <p className={styles.hint}>{props.hint}</p>

      <div className={styles.entry}>
        <CodeBoxes {...props} />
        <CodePad {...props} />
      </div>
    </div>
  )
}

/**
 * Phone held sideways, on Ollie's page: the hint and the digit boxes (and
 * "Show numbers"). The number pad is on the other page (CodePadPage).
 */
export function CodeEntry(props: Omit<CodeStepProps, 'active'>) {
  return (
    <div className={`${stepClass(props.groups, props.large ?? false)} ${styles.phoneEntry}`}>
      <p className={styles.hint}>{props.hint}</p>
      <CodeBoxes {...props} />
    </div>
  )
}

/** Phone held sideways: the number pad and Next, filling the right page. */
export function CodePadPage(props: CodeStepProps) {
  return (
    <div className={`${stepClass(props.groups, props.large ?? false)} ${styles.phonePad}`}>
      <CodePad {...props} />
    </div>
  )
}

/** The digit boxes, plus "Show numbers" under them for a PIN code. */
function CodeBoxes({ label, groups, value, masked = false }: Omit<CodeStepProps, 'active'>) {
  const length = totalLength(groups)
  const [showNumbers, setShowNumbers] = useState(false)
  const dashBefore = new Set(groups.slice(0, -1).map((_, g) => groups.slice(0, g + 1).reduce((a, b) => a + b, 0)))

  const hidden = masked && !showNumbers
  const spoken = !value
    ? `${label} is empty`
    : hidden
      ? `${value.length} of ${length} numbers typed`
      : `${label}: ${value.split('').join(' ')}`

  return (
    <div className={styles.boxArea}>
      <div className={styles.boxes} role="group" aria-label={label}>
        {Array.from({ length }, (_, i) => {
          const digit = value[i]
          const className = digit
            ? styles.box
            : i === value.length
              ? `${styles.box} ${styles.current}`
              : `${styles.box} ${styles.empty}`
          return (
            <span key={i} className={styles.slot}>
              {dashBefore.has(i) && (
                <span className={styles.dash} aria-hidden="true">
                  -
                </span>
              )}
              <span className={className} aria-hidden="true">
                {digit && (hidden ? <span className={styles.dot} /> : digit)}
              </span>
            </span>
          )
        })}
        <span className="visually-hidden" aria-live="polite">
          {spoken}
        </span>
      </div>

      {masked && (
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={showNumbers}
          onClick={() => setShowNumbers((s) => !s)}
        >
          <Icon name={showNumbers ? 'eyeOff' : 'eye'} size={18} />
          {showNumbers ? 'Hide numbers' : 'Show numbers'}
        </button>
      )}
    </div>
  )
}

/** The number pad and the Next / Done! / Log in button. Typing on a keyboard works too. */
function CodePad({ groups, value, onChange, submitLabel, onSubmit, active }: CodeStepProps) {
  const length = totalLength(groups)
  const full = value.length === length

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'back') onChange((v) => v.slice(0, -1))
    else if (key === 'clear') onChange('')
    else onChange((v) => (v.length < length ? v + key : v))
  }

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        onChange((v) => (v.length < length ? v + e.key : v))
      } else if (e.key === 'Backspace') onChange((v) => v.slice(0, -1))
      else if (e.key === 'Delete') onChange('')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, length, onChange])

  return (
    <>
      <div className={styles.pad}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={key === 'back' || key === 'clear' ? `${styles.key} ${styles.keySmall}` : styles.key}
            onClick={() => press(key)}
            aria-label={key === 'back' ? 'Delete last number' : key === 'clear' ? 'Clear all' : undefined}
          >
            {key === 'back' ? <Icon name="backspace" size={22} /> : key === 'clear' ? 'Clear' : key}
          </button>
        ))}
      </div>

      <button type="button" className={styles.next} disabled={!full} onClick={() => full && onSubmit()}>
        {submitLabel}
        {submitLabel === 'Next' && <Icon name="arrowRight" size={22} />}
      </button>
    </>
  )
}
