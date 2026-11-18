import { useEffect, useRef, type PointerEvent } from 'react'
import styles from './ui.module.css'

/** How far the knob's middle can go from the base's middle (px). Further out = the same full speed. */
const REACH = 40
/** A tiny push near the middle does nothing, so a resting thumb doesn't drift. */
const DEAD = 0.12

/**
 * The walking joystick, bottom left, on phones and tablets (MainLobby shows
 * it). Drag the knob any way: the further from the middle, the faster, up to
 * normal walking speed. Let go and the knob springs back and the Student
 * stops. It follows one finger (pointer capture), so a second finger can
 * still tap buttons, and it is its own element, so a drag is never a floor tap.
 */
export function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const finger = useRef<number | null>(null)

  const place = (dx: number, dy: number, springBack: boolean) => {
    const knob = knobRef.current
    if (!knob) return
    knob.classList.toggle(styles.joyBack, springBack)
    knob.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`
  }

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current
    if (!base) return
    const r = base.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > REACH) {
      dx *= REACH / d
      dy *= REACH / d
    }
    place(dx, dy, false)
    // Speed 0..1 from the dead zone to the edge, in the knob's direction.
    const push = Math.min(1, d / REACH)
    if (push < DEAD) {
      onMove(0, 0)
      return
    }
    const speed = (push - DEAD) / (1 - DEAD)
    onMove((dx / Math.hypot(dx, dy)) * speed, (dy / Math.hypot(dx, dy)) * speed)
  }

  const letGo = () => {
    finger.current = null
    place(0, 0, true)
    onMove(0, 0)
  }

  // Hidden mid-drag (a card opened): the Student stops.
  useEffect(() => () => onMove(0, 0), [onMove])

  return (
    <div
      ref={baseRef}
      className={styles.joy}
      role="presentation"
      aria-hidden="true"
      onPointerDown={(e) => {
        if (finger.current !== null) return
        finger.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
        follow(e)
      }}
      onPointerMove={(e) => {
        if (e.pointerId === finger.current) follow(e)
      }}
      onPointerUp={(e) => {
        if (e.pointerId === finger.current) letGo()
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === finger.current) letGo()
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === finger.current) letGo()
      }}
    >
      <span className={`${styles.joyMark} ${styles.joyUp}`} />
      <span className={`${styles.joyMark} ${styles.joyDown}`} />
      <span className={`${styles.joyMark} ${styles.joyLeft}`} />
      <span className={`${styles.joyMark} ${styles.joyRight}`} />
      <span ref={knobRef} className={styles.knob} />
    </div>
  )
}
