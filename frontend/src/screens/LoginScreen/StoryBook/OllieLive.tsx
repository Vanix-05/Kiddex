import { useEffect, useRef, type ReactNode } from 'react'
import { ollieLarge } from '../../../assets/art'
import styles from './OllieLive.module.css'

/** One blink: the eyelid slides down over the eye and back up. */
const BLINK: Keyframe[] = [
  { transform: 'translateY(-102%)' },
  { transform: 'translateY(0)', offset: 0.45 },
  { transform: 'translateY(0)', offset: 0.55 },
  { transform: 'translateY(-102%)' },
]
const BLINK_MS = 200
/** The second blink of a double blink starts this long after the first. */
const DOUBLE_AFTER_MS = 260
const DOUBLE_CHANCE = 0.25
const MIN_WAIT_MS = 2500
const MAX_WAIT_MS = 5000

interface OllieLiveProps {
  /** Goes up each time Ollie says a line: his beak opens and closes for ~1.7s. 0 = quiet. */
  talkKey?: number
  /** His picture. Default: ollieLarge. Any layers with the same 428:600 framing work. */
  art?: ReactNode
}

/**
 * Ollie, alive: he breathes, blinks every 2.5-5s (sometimes twice) and moves
 * his beak when he talks. The eyelids and mouth are small layers placed in %
 * of the picture, so they stay lined up at any size. The parent sets the width.
 * With reduce motion on he only blinks.
 */
export function OllieLive({ talkKey = 0, art }: OllieLiveProps) {
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let timer: number | undefined
    const blink = (delay = 0) => {
      rootRef.current?.querySelectorAll<HTMLElement>('[data-lid]').forEach((lid) => {
        lid.animate(BLINK, { duration: BLINK_MS, delay, easing: 'ease-in-out' })
      })
    }
    const wait = () => {
      timer = window.setTimeout(
        () => {
          if (!document.hidden) {
            blink()
            if (Math.random() < DOUBLE_CHANCE) blink(DOUBLE_AFTER_MS)
          }
          wait()
        },
        MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS),
      )
    }
    wait()
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <span ref={rootRef} className={styles.ollie}>
      <span className={styles.breathe}>
        {art ?? <img src={ollieLarge} alt="" className={styles.art} draggable={false} />}
        <span className={`${styles.lid} ${styles.lidLeft}`}>
          <i data-lid="" />
        </span>
        <span className={`${styles.lid} ${styles.lidRight}`}>
          <i data-lid="" />
        </span>
        {/* Remounted for each line, so the talking plays again from the start. */}
        {talkKey > 0 && <span key={talkKey} className={styles.mouth} />}
      </span>
    </span>
  )
}
