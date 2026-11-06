import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { companionArt, ollieLayers } from '../../../assets/art'
import { Icon } from '../../../components/Icon/Icon'
import styles from './WelcomeStudentPopup.module.css'

interface WelcomeStudentPopupProps {
  onClose: () => void
}

/**
 * "Welcome, Student!" popup, opened by "I'm a Student" on the Welcome card.
 * A notebook floats over the dimmed login scene (no route change), and
 * Ollie pops onto its corner and waves. Back, ✕, Esc or a tap on the dark
 * overlay closes it.
 */
export function WelcomeStudentPopup({ onClose }: WelcomeStudentPopupProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstCardRef = useRef<HTMLButtonElement>(null)

  // Start on the suggested choice, so Enter right away means "New Student".
  useEffect(() => {
    firstCardRef.current?.focus({ preventScroll: true })
  }, [])

  // Esc closes; Tab stays inside the popup.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Only a tap on the overlay itself closes, not one inside the notebook.
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.notebook}>
          <Rings />

          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <span aria-hidden="true">✕</span>
          </button>

          <h2 id={titleId} className={styles.title}>
            <span className={styles.highlight}>Welcome, Student!</span>
          </h2>
          <p className={styles.question}>Is this your first time on KIDDEX?</p>

          <div className={styles.choices}>
            <button
              ref={firstCardRef}
              type="button"
              className={`${styles.photo} ${styles.newStudent}`}
              onClick={() => {
                // TODO: go to the School ID step of the New Student flow (not built yet).
              }}
            >
              <span className={styles.tape} aria-hidden="true" />
              <span className={styles.picture} aria-hidden="true">
                <MiniLoginCard />
              </span>
              <span className={styles.cardTitle}>New Student</span>
              <span className={styles.cta}>
                Start here <Icon name="arrowRight" size={18} />
              </span>
            </button>

            <button
              type="button"
              className={`${styles.photo} ${styles.returning}`}
              onClick={() => {
                // TODO: go to the Returning Student login (School ID + PIN code, not built yet).
              }}
            >
              <span className={styles.tape} aria-hidden="true" />
              <span className={styles.picture} aria-hidden="true">
                <span className={styles.buddyHead}>
                  <img src={companionArt.fox} alt="" draggable={false} />
                </span>
              </span>
              <span className={styles.cardTitle}>Returning Student</span>
              <span className={styles.cta}>
                Log in <Icon name="arrowRight" size={18} />
              </span>
            </button>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.back} onClick={onClose}>
              <Icon name="arrowLeft" size={18} />
              Back
            </button>
            <p className={styles.help}>
              No card? <strong>Ask your teacher</strong> <span aria-hidden="true">🙋</span>
            </p>
          </div>
        </div>

        <WavingOllie />
      </div>
    </div>,
    document.body,
  )
}

/** Spiral rings along the top of the notebook. */
function Rings() {
  return (
    <span className={styles.rings} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={styles.ring} />
      ))}
    </span>
  )
}

/** The little login card in the New Student photo. */
function MiniLoginCard() {
  return (
    <span className={styles.miniCard}>
      <span className={styles.miniTag}>KIDDEX</span>
      <span className={styles.miniField}>2026-0144</span>
      <span className={styles.miniField}>482-915</span>
    </span>
  )
}

/**
 * Ollie on the notebook's corner. He pops in, waves his feather wing 3 times
 * and then just bobs now and then. Hover or tap him to wave again.
 * The wing is its own layer (ollie-wing.png) on top of ollie-body.png.
 */
function WavingOllie() {
  // 0 = the greeting wave (waits for the pop-in); each hover/tap adds 1 and
  // remounts the wing so its wave animation plays again from the start.
  const [waves, setWaves] = useState(0)
  const waveAgain = () => setWaves((n) => n + 1)

  return (
    <div className={styles.ollie} onMouseEnter={waveAgain} onClick={waveAgain}>
      <p className={styles.bubble}>
        Hoo’s here today? <span aria-hidden="true">🦉</span>
      </p>
      <div className={styles.ollieBob} aria-hidden="true">
        <div className={styles.ollieArt}>
          <img src={ollieLayers.body} alt="" className={styles.ollieLayer} draggable={false} />
          <img
            key={waves}
            src={ollieLayers.wing}
            alt=""
            className={`${styles.ollieLayer} ${styles.wing} ${waves === 0 ? styles.waveIntro : styles.wave}`}
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
