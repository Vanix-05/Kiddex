import { useEffect, useRef, type RefObject } from 'react'

/**
 * A part inside the tilted element (a head, a pair of eyes) that turns to
 * look at the cursor. Each part has its own spring, so parts can lag
 * behind each other.
 */
export interface LookPart {
  ref: RefObject<HTMLElement | null>
  /** Point the part looks from, as a fraction (0-1) of the tilted element's box. */
  aimX: number
  aimY: number
  /** Spring stiffness and damping. */
  k: number
  d: number
  /**
   * Builds the part's transform. `ax`/`ay` run -1..1 (cursor left/up ..
   * right/down). `width` is the tilted element's displayed width in px,
   * for scaling px offsets.
   */
  transform: (ax: number, ay: number, width: number) => string
}

export interface MouseTiltOptions {
  /** Largest rotation, in degrees, when the cursor is far to one side. */
  maxRotate?: number
  /** Largest horizontal shift, in px. */
  maxShift?: number
  /** Largest lean (skewX), in degrees. */
  maxSkew?: number
  /** Idle bob height, in px. */
  bobHeight?: number
  /** Idle bob cycle length, in ms. */
  bobPeriod?: number
  /** How fast it eases toward the target (0-1 per 60fps frame). */
  smoothing?: number
  /**
   * Parts that follow the cursor in x and y (the lean only follows x).
   * Pass a stable array (e.g. from useMemo) so the effect doesn't restart.
   */
  lookAt?: readonly LookPart[]
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n))

// Only on a real mouse/trackpad, and never when the user asked for less motion.
const POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Makes an element lean gently toward the mouse, with a soft idle bob.
 *
 * - Desktop only: does nothing on touch devices or with reduced motion on.
 * - Writes `transform` straight to the element each frame (no React
 *   re-renders, no layout changes). Set `transform-origin` in CSS to choose
 *   the pivot, e.g. the feet.
 * - Eases back to neutral when the mouse leaves the window.
 * - Optional `lookAt` parts (heads, eyes) run in the same frame loop.
 *
 * Usage: `const ref = useMouseTilt<HTMLImageElement>(); <img ref={ref} />`
 */
export function useMouseTilt<T extends HTMLElement>({
  maxRotate = 4,
  maxShift = 8,
  maxSkew = 1.5,
  bobHeight = 3,
  bobPeriod = 3000,
  smoothing = 0.12,
  lookAt,
}: MouseTiltOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const pointerMq = window.matchMedia(POINTER_QUERY)
    const motionMq = window.matchMedia(REDUCED_MOTION_QUERY)

    let frame = 0
    let lastTime = 0
    let centerX = 0
    let halfWidth = 1
    let box = { left: 0, top: 0, width: 1, height: 1 } // without our transform
    let target = 0 // -1 (cursor far left) .. 1 (cursor far right)
    let current = 0
    let pointer: { x: number; y: number } | null = null // null = mouse is away

    // One spring per axis for each look part.
    const parts = (lookAt ?? []).map((part) => ({
      part,
      sx: { x: 0, v: 0, target: 0 },
      sy: { x: 0, v: 0, target: 0 },
    }))

    // The element's box without our transform applied.
    const measure = () => {
      const saved = el.style.transform
      el.style.transform = 'none'
      const rect = el.getBoundingClientRect()
      el.style.transform = saved
      centerX = rect.left + rect.width / 2
      box = { left: rect.left, top: rect.top, width: Math.max(rect.width, 1), height: rect.height }
      // Full tilt once the cursor is about half a screen away from the center.
      halfWidth = Math.max(window.innerWidth / 2, 1)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      target = clamp((e.clientX - centerX) / halfWidth)
      pointer = { x: e.clientX, y: e.clientY }
    }
    const reset = () => {
      target = 0
      pointer = null
    }
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) reset() // left the window
    }

    const tick = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 100) : 16.7
      lastTime = time
      // Frame-rate independent ease toward the target.
      current += (target - current) * (1 - Math.pow(1 - smoothing, dt / 16.7))
      if (Math.abs(target - current) < 0.0005) current = target

      // Bob: 0 -> -bobHeight -> 0, smooth (cosine) so there is no snap.
      const bob = (-bobHeight / 2) * (1 - Math.cos((2 * Math.PI * time) / bobPeriod))

      el.style.transform =
        `translate3d(${(current * maxShift).toFixed(2)}px, ${bob.toFixed(2)}px, 0) ` +
        `rotate(${(current * maxRotate).toFixed(3)}deg) ` +
        `skewX(${(-current * maxSkew).toFixed(3)}deg)`

      // Look parts: aim each at the cursor, then step its springs.
      const dts = Math.min(dt / 1000, 0.05)
      for (const { part, sx, sy } of parts) {
        if (pointer) {
          const aimX = box.left + part.aimX * box.width
          const aimY = box.top + part.aimY * box.height
          sx.target = clamp((pointer.x - aimX) / (window.innerWidth * 0.35))
          sy.target = clamp((pointer.y - aimY) / (window.innerHeight * 0.4))
        } else {
          sx.target = sy.target = 0
        }
        for (const s of [sx, sy]) {
          const a = part.k * (s.target - s.x) - part.d * s.v
          s.v += a * dts
          s.x += s.v * dts
        }
        if (part.ref.current) {
          part.ref.current.style.transform = part.transform(sx.x, sy.x, box.width)
        }
      }

      frame = requestAnimationFrame(tick)
    }

    let running = false
    const start = () => {
      if (running) return
      running = true
      measure()
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('resize', measure)
      window.addEventListener('scroll', measure, { passive: true, capture: true })
      window.addEventListener('blur', reset)
      document.addEventListener('mouseout', onMouseOut)
      lastTime = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (!running) return
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, { capture: true })
      window.removeEventListener('blur', reset)
      document.removeEventListener('mouseout', onMouseOut)
      target = current = 0
      pointer = null
      el.style.transform = ''
      for (const { part, sx, sy } of parts) {
        sx.x = sx.v = sx.target = 0
        sy.x = sy.v = sy.target = 0
        if (part.ref.current) part.ref.current.style.transform = ''
      }
    }

    const update = () => (pointerMq.matches && !motionMq.matches ? start() : stop())
    update()
    pointerMq.addEventListener('change', update)
    motionMq.addEventListener('change', update)

    return () => {
      pointerMq.removeEventListener('change', update)
      motionMq.removeEventListener('change', update)
      stop()
    }
  }, [maxRotate, maxShift, maxSkew, bobHeight, bobPeriod, smoothing, lookAt])

  return ref
}
