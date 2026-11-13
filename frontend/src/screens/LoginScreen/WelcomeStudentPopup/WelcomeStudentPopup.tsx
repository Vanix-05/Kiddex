import { useState, type Ref } from 'react'
import { companionArt, ollieLayers } from '../../../assets/art'
import { Icon } from '../../../components/Icon/Icon'
import { OllieLive } from '../StoryBook/OllieLive'
import styles from './WelcomeStudentPopup.module.css'

/** Which plate was picked: New Student ("Start here") or Returning Student ("Log in"). */
export type StudentKind = 'new' | 'returning'

interface WelcomeCoverProps {
  titleId: string
  /** The New Student plate: the popup's focus starts here. */
  firstPlateRef: Ref<HTMLButtonElement>
  onStart: (kind: StudentKind) => void
  onClose: () => void
  /** The book is opening: the tapped plate's button plays its press. */
  pressing?: StudentKind
}

/**
 * The "Welcome, Student!" popup, opened by "I'm a Student" on the Welcome
 * card. It is the closed storybook: this is the front of its hardcover
 * (StoryBook draws the book around it and swings it open). 608x748.
 * Back, Esc or a tap on the dark area closes the popup.
 */
export function WelcomeCover({ titleId, firstPlateRef, onStart, onClose, pressing }: WelcomeCoverProps) {
  return (
    <div className={styles.cover}>
      <span className={styles.spine} aria-hidden="true" />
      <span className={styles.frame} aria-hidden="true" />
      <span className={`${styles.cornerPiece} ${styles.cornerTopLeft}`} aria-hidden="true" />
      <span className={`${styles.cornerPiece} ${styles.cornerTopRight}`} aria-hidden="true" />
      <span className={`${styles.cornerPiece} ${styles.cornerBottomLeft}`} aria-hidden="true" />
      <span className={`${styles.cornerPiece} ${styles.cornerBottomRight}`} aria-hidden="true" />

      <h2 id={titleId} className={styles.title}>
        Welcome, Student!
      </h2>
      <p className={styles.question}>Is this your first time on KIDDEX?</p>

      <div className={styles.plates}>
        <button
          ref={firstPlateRef}
          type="button"
          className={`${styles.plate} ${styles.newStudent}`}
          onClick={() => onStart('new')}
        >
          <span className={styles.picture} aria-hidden="true">
            <MiniLoginCard />
          </span>
          <span className={styles.plateText}>
            <span className={styles.plateName}>New Student</span>
            <span className={pressing === 'new' ? `${styles.cta} ${styles.ctaPressing}` : styles.cta}>
              Start here <Icon name="arrowRight" size={26} />
            </span>
          </span>
        </button>

        <button type="button" className={`${styles.plate} ${styles.returning}`} onClick={() => onStart('returning')}>
          <span className={styles.picture} aria-hidden="true">
            <span className={styles.buddyHead}>
              <img src={companionArt.fox} alt="" draggable={false} />
            </span>
          </span>
          <span className={styles.plateText}>
            <span className={styles.plateName}>Returning Student</span>
            <span className={pressing === 'returning' ? `${styles.cta} ${styles.ctaPressing}` : styles.cta}>
              Log in <Icon name="arrowRight" size={26} />
            </span>
          </span>
        </button>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.back} onClick={onClose}>
          <Icon name="arrowLeft" size={24} />
          Back
        </button>
        <p className={styles.help}>
          No card? <strong>Ask your teacher</strong>
        </p>
      </div>
    </div>
  )
}

/** The little login card in the New Student picture. */
function MiniLoginCard() {
  return (
    <span className={styles.miniCard}>
      <span className={styles.miniTag}>KIDDEX</span>
      <span className={styles.miniField}>2026-0144</span>
      <span className={styles.miniField}>482-915</span>
    </span>
  )
}

interface CoverOllieProps {
  /** false = the book has just closed again: he drops back on, with no greeting wave. */
  intro: boolean
  /** The book is opening: his bubble fades and he is gone (the flying Ollie takes over). */
  leaving: boolean
}

/**
 * Ollie sitting on the top-right of the closed book, with "Hoo's here
 * today?" in a bubble on his left. He pops in, waves his feather wing 3
 * times, then breathes, blinks and hops now and then. Hover or tap him to
 * wave again. The wing is its own layer (ollie-wing) on top of ollie-body.
 */
export function CoverOllie({ intro, leaving }: CoverOllieProps) {
  // 0 = the greeting wave (waits for the pop-in); each hover/tap adds 1 and
  // remounts the wing so its wave animation plays again from the start.
  const [waves, setWaves] = useState(0)
  const waveAgain = () => setWaves((n) => n + 1)
  const className = [styles.ollie, !intro && styles.ollieBack, leaving && styles.ollieLeaving].filter(Boolean).join(' ')

  return (
    <div className={className} onMouseEnter={waveAgain} onClick={waveAgain}>
      <p className={styles.bubble}>Hoo’s here today?</p>
      <div className={styles.ollieBob} aria-hidden="true">
        <OllieLive
          art={
            <>
              <img src={ollieLayers.body} alt="" className={styles.ollieLayer} draggable={false} />
              <img
                key={waves}
                src={ollieLayers.wing}
                alt=""
                className={`${styles.ollieLayer} ${styles.wing} ${waves === 0 ? styles.waveIntro : styles.wave}`}
                draggable={false}
              />
            </>
          }
        />
      </div>
    </div>
  )
}
