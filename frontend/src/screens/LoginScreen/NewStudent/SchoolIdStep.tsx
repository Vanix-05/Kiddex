import { useEffect, useState } from 'react'
import { Icon } from '../../../components/Icon/Icon'
import styles from './SchoolIdStep.module.css'

/** School IDs look like 2026-0144: 4 digits, a dash, 4 digits. */
const LENGTH = 8
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'] as const

interface SchoolIdStepProps {
  /** Off while the page is animating in or out, so typing is ignored. */
  active: boolean
}

/**
 * New Student, step 1: type the School ID from the login card, with the
 * number pad or the keyboard. Next turns on once all 8 digits are in.
 */
export function SchoolIdStep({ active }: SchoolIdStepProps) {
  const [digits, setDigits] = useState('')
  const full = digits.length === LENGTH

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'back') setDigits((d) => d.slice(0, -1))
    else if (key === 'clear') setDigits('')
    else setDigits((d) => (d.length < LENGTH ? d + key : d))
  }

  const next = () => {
    if (!full) return
    // TODO: save the School ID and go to the one-time code page (not built yet).
  }

  // Typing on a keyboard works too: digits, Backspace, Delete, Enter.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) setDigits((d) => (d.length < LENGTH ? d + e.key : d))
      else if (e.key === 'Backspace') setDigits((d) => d.slice(0, -1))
      else if (e.key === 'Delete') setDigits('')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <div className={styles.step}>
      <div className={styles.hint}>
        <LoginCardPicture />
        <p className={styles.hintText}>
          Find your <strong>School ID</strong>
          <br />
          on your login card.
        </p>
      </div>

      <div className={styles.boxes} role="group" aria-label="School ID">
        {Array.from({ length: LENGTH }, (_, i) => {
          const digit = digits[i]
          const className = digit
            ? styles.box
            : i === digits.length
              ? `${styles.box} ${styles.current}`
              : `${styles.box} ${styles.empty}`
          return (
            <span key={i} className={styles.slot}>
              {i === 4 && (
                <span className={styles.dash} aria-hidden="true">
                  -
                </span>
              )}
              <span className={className} aria-hidden="true">
                {digit}
              </span>
            </span>
          )
        })}
        <span className="visually-hidden" aria-live="polite">
          {digits ? `School ID: ${digits.split('').join(' ')}` : 'School ID is empty'}
        </span>
      </div>

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

      <button type="button" className={styles.next} disabled={!full} onClick={next}>
        Next <Icon name="arrowRight" size={22} />
      </button>
    </div>
  )
}

/** The login card, taped onto the page, with the School ID line lit up. */
function LoginCardPicture() {
  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.tape} />
      <span className={styles.cardTop}>
        <span className={styles.cardTag}>KIDDEX</span>
        <span className={styles.cardName}>My Login Card</span>
      </span>
      <span className={`${styles.cardField} ${styles.cardFieldOn}`}>
        <small>School ID</small>
        <b>2026-0144</b>
      </span>
      <span className={styles.cardField}>
        <small>One-time code</small>
        <b>482-915</b>
      </span>
    </div>
  )
}
