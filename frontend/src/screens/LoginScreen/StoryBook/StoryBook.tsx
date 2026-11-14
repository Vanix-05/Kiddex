import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { ollieLarge } from '../../../assets/art'
import { fitStage, FULL_STAGE as FULL, type StageView as View } from '../../../components/StoryBook/fitStage'
import { OllieLive } from '../../../components/StoryBook/OllieLive'
import { StepTabs } from '../../../components/StoryBook/StepTabs'
import { Wing } from './Wing'
import type { BookPhase, Step } from './timing'
import styles from './StoryBook.module.css'

// Laptops: the whole stage (FULL), so the open book is about 85% of the screen.
/** Upright tablets and phones: just the closed book and Ollie... */
const CLOSED: View = { x: 420, y: 10, w: 600, h: 890 }
/** ...then just the right page and its tabs (Ollie's page is off screen). */
const OPEN: View = { x: 690, y: 84, w: 750, h: 790 }
/** Windows narrower than this (width / height) use the two zoomed views. */
const WIDE = 1.2

interface StoryBookProps {
  phase: BookPhase
  /** The front of the cover: the "Welcome, Student!" choices. */
  cover: ReactNode
  /** The cover's title, which names the dialog while the book is closed. */
  coverTitleId: string
  /** Ollie sitting on the closed book. */
  coverOllie: ReactNode
  /** Gets the focus whenever the closed book is shown (the New Student plate). */
  coverFocusRef: RefObject<HTMLButtonElement | null>
  /** The step names on the tabs, e.g. ["School ID", "PIN code"]. */
  tabs: readonly string[]
  step: Step
  /** While Next turns the page: the step whose right page is turning over. */
  turningFrom: Step | null
  /** Ollie has just landed: everything is in place, but taps are still ignored. */
  settling: boolean
  /** true when the current step came back with Back (both pages fade in). */
  fadedIn: boolean
  /**
   * Done! was tapped: the book goes blank (Ollie winks and fades into the
   * paper, the writing fades, the tabs slide back behind the book). The
   * bedroom intro clip starts from exactly that blank book.
   */
  finishing?: boolean
  /** Goes up each time Ollie lands on a page: he does his small hop. */
  bounceKey: number
  /** Goes up each time Ollie says a line (see OllieLive). */
  talkKey: number
  /** Draws a step's left page (a BookLeftPage) around the given Ollie. */
  renderLeft: (step: Step, ollie: ReactNode) => ReactNode
  /** Draws a step's right page. live = false for still copies and while anything animates. */
  renderRight: (step: Step, live: boolean, titleId?: string) => ReactNode
  /** Esc or a tap on the dark area, while the book is closed. */
  onClose: () => void
}

/**
 * The Student login storybook, drawn over the dimmed, blurred login screen
 * (a portal; the URL doesn't change). Closed, it is the "Welcome, Student!"
 * popup. "Start here" / "Log in" opens it into a two-page spread: Ollie's
 * page on the left, the step on the right, step tabs on the right edge.
 *
 * Everything is laid out on a 1440x900 stage (the book is 1216x748 on it)
 * and the stage is scaled as one piece to fit the window.
 *
 * The cover is a flap that swings around the spine: its front is the closed
 * cover, its back is step 1's left page. Next turns the right page the same
 * way: its back is the next step's left page.
 */
export function StoryBook({
  phase,
  cover,
  coverTitleId,
  coverOllie,
  coverFocusRef,
  tabs,
  step,
  turningFrom,
  settling,
  fadedIn,
  finishing = false,
  bounceKey,
  talkKey,
  renderLeft,
  renderRight,
  onClose,
}: StoryBookProps) {
  const titleId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const blockerRef = useRef<HTMLDivElement>(null)

  const closed = phase === 'choose'
  // Taps and keys are ignored while the book opens or closes or a page turns.
  const busy = phase === 'enter' || phase === 'back' || turningFrom !== null || settling || finishing
  const live = phase === 'steps' && !busy
  // During a page turn the old left page stays put until the new one lands on it.
  const leftStep = turningFrom ?? step

  // Scale the stage to fit the window (before the first paint, then on resize).
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const fit = () => {
      const w = overlay.clientWidth
      const h = overlay.clientHeight
      const wide = w / h >= WIDE
      const show = (name: string, view: View) => overlay.style.setProperty(name, fitStage(w, h, view))
      show('--view-closed', wide ? FULL : CLOSED)
      show('--view-open', wide ? FULL : OPEN)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Keyboard focus: on the blocker while animating, on the New Student plate
  // when the book is closed, on the book itself for each step.
  useEffect(() => {
    if (busy) blockerRef.current?.focus({ preventScroll: true })
    else if (closed) coverFocusRef.current?.focus({ preventScroll: true })
    else dialogRef.current?.focus({ preventScroll: true })
  }, [busy, closed, step, coverFocusRef])

  // Esc closes the closed book; Tab stays inside.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (closed) onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')].filter(
      (el) => !el.closest('[inert]'),
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Only a tap on the dark area closes, not one on the book or Ollie.
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closed && (e.target as HTMLElement).dataset.backdrop !== undefined) onClose()
  }

  /** Ollie standing in the picture frame: he hops when he lands, and talks. */
  const pageOllie = (
    <div key={bounceKey} className={styles.hop}>
      <OllieLive talkKey={talkKey} wink={finishing} />
    </div>
  )

  return createPortal(
    <div
      ref={overlayRef}
      className={finishing ? `${styles.overlay} ${styles[phase]} ${styles.finishing}` : `${styles.overlay} ${styles[phase]}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-backdrop=""
    >
      <div
        ref={dialogRef}
        className={styles.stage}
        role="dialog"
        aria-modal="true"
        aria-labelledby={closed ? coverTitleId : titleId}
        tabIndex={-1}
        data-backdrop=""
      >
        <div className={styles.rise} data-backdrop="">
          <div className={styles.book} data-backdrop="">
            <span className={styles.floorShadow} />
            <span className={`${styles.ribbon} ${styles.ribbonUnder}`} />
            <span className={`${styles.board} ${styles.boardRight}`} />
            {/* The closed book's block of pages, showing at the right and bottom. */}
            <span className={styles.pageBlock} />

            {!closed && <StepTabs steps={tabs} step={step} className={styles.tabs} />}

            <span className={`${styles.stack} ${styles.stackRight}`} />
            {!closed && (
              // Keyed by step, so Back's fade plays on each change.
              <div
                key={step}
                className={fadedIn ? `${styles.pageRight} ${styles.arriveFade}` : styles.pageRight}
                inert={!live}
              >
                {renderRight(step, live, titleId)}
              </div>
            )}

            {phase === 'steps' && (
              <>
                <span className={`${styles.board} ${styles.boardLeft}`} />
                <span className={`${styles.stack} ${styles.stackLeft}`} />
                <div key={leftStep} className={fadedIn ? `${styles.pageLeft} ${styles.arriveFade}` : styles.pageLeft}>
                  {renderLeft(leftStep, pageOllie)}
                </div>
              </>
            )}
            {!closed && <span className={styles.gutter} />}
            {!closed && <span className={`${styles.ribbon} ${styles.ribbonTop}`} />}

            {/* The cover. Front: the closed book. Back: step 1's left page. */}
            {phase !== 'steps' && (
              <div className={styles.flap}>
                <div className={`${styles.face} ${styles.faceBack}`} aria-hidden="true" inert>
                  <span className={`${styles.board} ${styles.boardLeft}`} />
                  <span className={`${styles.stack} ${styles.stackLeft}`} />
                  <div className={styles.pageLeft}>
                    {/* Opening: the frame is empty, Ollie is flying to it.
                        Closing: he slips away, and comes back on the cover. */}
                    {renderLeft(
                      1,
                      phase === 'back' ? (
                        <div className={styles.ollieGone}>
                          <OllieLive />
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
                <div className={`${styles.face} ${styles.faceFront}`} inert={!closed}>
                  {cover}
                </div>
              </div>
            )}

            {/* Next: the step just finished, turning over the spine. Its back
                is the next step's left page; the next right page is underneath. */}
            {turningFrom !== null && (
              <div className={styles.turn} aria-hidden="true" inert>
                <div className={styles.turnLift}>
                  <div className={`${styles.face} ${styles.faceBack}`}>
                    {renderLeft(step, <OllieLive />)}
                    <span className={`${styles.shade} ${styles.shadeBack}`} />
                  </div>
                  <div className={`${styles.face} ${styles.faceFront}`}>
                    {renderRight(turningFrom, false)}
                    <span className={`${styles.shade} ${styles.shadeFront}`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {(closed || phase === 'enter') && coverOllie}

          {/* Opening: Ollie hops off the cover and flies into the picture frame. */}
          {phase === 'enter' && (
            <>
              <svg className={styles.trail} viewBox="0 0 1440 900" aria-hidden="true">
                <path d="M880 126 C852 60 700 40 590 150 C520 220 462 300 426 372" />
              </svg>
              <div className={styles.flyer} aria-hidden="true">
                <div className={styles.flyY}>
                  <div className={styles.flyGrow}>
                    <div className={styles.flyTilt}>
                      <Wing side="left" />
                      <img src={ollieLarge} alt="" className={styles.flyImg} draggable={false} />
                      <Wing side="right" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Swallows taps and keys while anything animates (no double taps). */}
      {busy && (
        <div
          ref={blockerRef}
          className={styles.blocker}
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.preventDefault()}
        />
      )}
    </div>,
    document.body,
  )
}
