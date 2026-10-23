import { useEffect, useRef } from 'react'

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
}

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
    let target = 0 // -1 (cursor far left) .. 1 (cursor far right)
    let current = 0

    // The element's center without our transform applied.
    const measure = () => {
      const saved = el.style.transform
      el.style.transform = 'none'
      const rect = el.getBoundingClientRect()
      el.style.transform = saved
      centerX = rect.left + rect.width / 2
      // Full tilt once the cursor is about half a screen away from the center.
      halfWidth = Math.max(window.innerWidth / 2, 1)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      target = Math.max(-1, Math.min(1, (e.clientX - centerX) / halfWidth))
    }
    const reset = () => {
      target = 0
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

      frame = requestAnimationFrame(tick)
    }

    let running = false
    const start = () => {
      if (running) return
      running = true
      measure()
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('resize', measure)
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
      window.removeEventListener('blur', reset)
      document.removeEventListener('mouseout', onMouseOut)
      target = current = 0
      el.style.transform = ''
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
  }, [maxRotate, maxShift, maxSkew, bobHeight, bobPeriod, smoothing])

  return ref
}
