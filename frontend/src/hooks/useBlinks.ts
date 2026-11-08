import { useEffect, type RefObject } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** One blink: the eye layer squashes flat (a closed-eye line) and opens. */
const BLINK: Keyframe[] = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(0.1)', offset: 0.45 },
  { transform: 'scaleY(1)' },
]
const BLINK_MS = 140
/** Pause between the two blinks of a double blink. */
const DOUBLE_GAP_MS = 90
/** Nobody starts a blink this soon after another one ends. */
const APART_MS = 400
const MIN_WAIT_MS = 2500
const MAX_WAIT_MS = 6000
/** About 1 blink in 5 is a quick double blink. */
const DOUBLE_CHANCE = 0.2

const between = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * Makes each pair of eyes blink on its own random timer (every 2.5-6 s),
 * never at the same time as another, sometimes twice in a row.
 *
 * Each ref is a wrapper around an eye layer; its transform-origin (CSS)
 * should be that character's eye centre. Uses the Web Animations API on the
 * wrapper only, so it never fights other transforms (like the eye follow).
 * Nothing happens with reduced motion on; timers stop while the tab is
 * hidden and are cleared on unmount.
 */
export function useBlinks(...eyes: RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    const motionMq = window.matchMedia(REDUCED_MOTION_QUERY)
    const timers: number[] = []
    let busyUntil = 0 // the end of the latest blink, plus APART_MS

    const schedule = (i: number, ms = between(MIN_WAIT_MS, MAX_WAIT_MS)) => {
      window.clearTimeout(timers[i])
      timers[i] = window.setTimeout(() => blink(i), ms)
    }

    const blink = (i: number) => {
      const el = eyes[i].current
      const now = performance.now()
      // Someone else is blinking (or just did): wait a moment, then try again.
      if (now < busyUntil) {
        schedule(i, busyUntil - now + between(150, 600))
        return
      }
      if (el) {
        const double = Math.random() < DOUBLE_CHANCE
        el.animate(BLINK, { duration: BLINK_MS, easing: 'ease-in-out' })
        if (double) el.animate(BLINK, { duration: BLINK_MS, delay: BLINK_MS + DOUBLE_GAP_MS, easing: 'ease-in-out' })
        busyUntil = now + (double ? BLINK_MS * 2 + DOUBLE_GAP_MS : BLINK_MS) + APART_MS
      }
      schedule(i)
    }

    const stop = () => timers.forEach((t) => window.clearTimeout(t))
    const start = () => {
      stop()
      if (motionMq.matches || document.hidden) return
      // Start each on its own clock, a little apart.
      eyes.forEach((_, i) => schedule(i, between(MIN_WAIT_MS, MAX_WAIT_MS) + i * 900))
    }

    start()
    document.addEventListener('visibilitychange', start)
    motionMq.addEventListener('change', start)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', start)
      motionMq.removeEventListener('change', start)
    }
    // The refs are stable objects; their .current is read at blink time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
