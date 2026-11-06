import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ollieLarge } from '../../../assets/art'
import { KiddexLogo } from '../../../components/KiddexLogo/KiddexLogo'
import { SceneBackground } from '../../../components/SceneBackground/SceneBackground'
import { SignPost } from '../../../components/SignPost/SignPost'
import { NotebookPage } from '../NotebookPage/NotebookPage'
import { ChoiceNotebook, type PopupRects } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { SchoolIdStep } from './SchoolIdStep'
import styles from './SchoolIdScreen.module.css'

/** How long the "Start here" transition runs (see SchoolIdScreen.module.css). */
export const ENTER_MS = 1800
/** How long Back takes to fade this page out. */
export const LEAVE_MS = 250

export type SchoolIdScreenMode = 'enter' | 'shown' | 'leave'

interface SchoolIdScreenProps {
  /** enter = playing the transition from the popup; leave = fading out (Back). */
  mode: SchoolIdScreenMode
  /** Where the popup's notebook and Ollie were, for the enter transition. */
  from: PopupRects | null
  onBack: () => void
}

/**
 * New Student, step 1 (School ID), drawn over the login screen. It has its
 * own copy of the beach scene, with Ollie standing on the left and the
 * notebook on the right. The URL doesn't change, same as the popup.
 *
 * Layers, bottom to top: scene, dim overlay (enter only), page (notebook +
 * Ollie), tap blocker (enter only).
 */
export function SchoolIdScreen({ mode, from, onBack }: SchoolIdScreenProps) {
  const titleId = useId()
  const pageRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const ollieRef = useRef<HTMLDivElement>(null)
  const blockerRef = useRef<HTMLDivElement>(null)
  const entering = mode === 'enter' && from !== null

  // Enter: start the notebook and Ollie where the popup's were (FLIP). Runs
  // before the first paint, then turns the animations on.
  useLayoutEffect(() => {
    const page = pageRef.current
    const slot = slotRef.current
    const ollie = ollieRef.current
    if (!entering || !page || !slot || !ollie || !from) return

    const nb = from.notebook
    const tw = slot.offsetWidth
    const th = slot.offsetHeight
    slot.style.setProperty('--gx', `${nb.left - slot.offsetLeft}px`)
    slot.style.setProperty('--gy', `${nb.top - (slot.offsetTop - page.scrollTop)}px`)
    slot.style.setProperty('--gsx', `${nb.width / tw}`)
    slot.style.setProperty('--gsy', `${nb.height / th}`)
    // The popup copy is drawn at the popup's size, then stretched to fill the
    // slot, so after the slot's start scale it looks exactly like the popup.
    slot.style.setProperty('--isx', `${tw / nb.width}`)
    slot.style.setProperty('--isy', `${th / nb.height}`)

    if (ollie.offsetWidth > 0) {
      ollie.style.setProperty('--fx', `${from.ollie.left - ollie.offsetLeft}px`)
      ollie.style.setProperty('--fy', `${from.ollie.top - (ollie.offsetTop - page.scrollTop)}px`)
      ollie.style.setProperty('--fs', `${from.ollie.width / ollie.offsetWidth}`)
    }
    page.classList.add(styles.go)
  }, [entering, from])

  // Keyboard focus: on the blocker while animating, then on the page.
  useEffect(() => {
    if (mode === 'enter') blockerRef.current?.focus({ preventScroll: true })
    else if (mode === 'shown') pageRef.current?.focus({ preventScroll: true })
  }, [mode])

  // Tab stays on this page (the login screen is still underneath).
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !pageRef.current) return
    const focusable = pageRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === pageRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const modeClass = mode === 'enter' ? styles.entering : mode === 'leave' ? styles.leaving : ''

  return createPortal(
    <>
      <div className={`${styles.scene} ${modeClass}`} aria-hidden="true">
        <SceneBackground>{null}</SceneBackground>
        <div className={styles.brand}>
          <KiddexLogo />
        </div>
        <SignPost className={styles.sign} />
      </div>

      {mode === 'enter' && <div className={styles.dim} aria-hidden="true" />}

      <div
        ref={pageRef}
        className={`${styles.page} ${modeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div ref={slotRef} className={styles.slot}>
          <NotebookPage
            title="Hi, Student!"
            titleId={titleId}
            subtitle="Let’s set up your account."
            step={1}
            onBack={onBack}
          >
            <SchoolIdStep active={mode === 'shown'} />
          </NotebookPage>

          {/* The popup's page, lying on top and flipping up out of the way. */}
          {entering && (
            <div className={styles.front} aria-hidden="true" inert>
              <div className={styles.frontInner} style={{ width: from.notebook.width, height: from.notebook.height }}>
                <ChoiceNotebook pressingStart />
              </div>
            </div>
          )}
        </div>

        <div ref={ollieRef} className={styles.ollie} aria-hidden="true">
          <div className={styles.ollieLand}>
            <div className={styles.ollieBob}>
              <Wing side="left" />
              <img src={ollieLarge} alt="" className={styles.ollieImg} draggable={false} />
              <Wing side="right" />
            </div>
          </div>
        </div>

        <p className={styles.bubble}>
          <strong>
            First, your School ID! <span aria-hidden="true">🪪</span>
          </strong>
          <span>Look at the top of your card.</span>
        </p>
      </div>

      {/* Swallows taps and keys while the transition plays (no double taps). */}
      {mode === 'enter' && (
        <div
          ref={blockerRef}
          className={styles.blocker}
          tabIndex={-1}
          aria-hidden="true"
          onKeyDown={(e) => e.preventDefault()}
        />
      )}
    </>,
    document.body,
  )
}

/** One of Ollie's flying wings; they open from his shoulders and flap. */
function Wing({ side }: { side: 'left' | 'right' }) {
  return (
    <span className={side === 'left' ? `${styles.wing} ${styles.wingLeft}` : `${styles.wing} ${styles.wingRight}`}>
      <svg viewBox="-20 -70 230 200">
        <g stroke="var(--color-card-border)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M-6 0 C30 -40 120 -66 196 -50 C188 -30 176 -18 160 -10 C170 4 160 16 140 18 C150 34 136 46 114 44 C120 62 102 72 80 66 C82 86 60 96 38 88 C30 108 4 110 -8 96 C-18 70 -18 30 -6 0 Z"
            fill="var(--color-ollie-wing-fill)"
          />
          <path
            d="M150 -44 C130 -30 112 -24 92 -20 M136 12 C116 12 98 10 80 6 M106 40 C88 40 72 34 58 26 M72 62 C56 60 42 52 32 42"
            fill="none"
            stroke="var(--color-ollie-wing-line)"
            strokeWidth="4"
          />
        </g>
        <g fill="var(--color-ollie-wing-spot)">
          <ellipse cx="22" cy="20" rx="7" ry="5" />
          <ellipse cx="44" cy="4" rx="6" ry="4" />
          <ellipse cx="30" cy="52" rx="6" ry="4" />
          <ellipse cx="62" cy="-10" rx="5" ry="3.5" />
        </g>
      </svg>
    </span>
  )
}
