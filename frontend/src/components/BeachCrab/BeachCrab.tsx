import { useEffect, useRef } from 'react'
import styles from './BeachCrab.module.css'

/**
 * Where the crab's feet touch the sand, in % of the scene box (measured on
 * the 1440x900 design). It walks back and forth between these two points.
 */
const POINT_A = { left: 39.9, top: 80.2 } // beside the girl
const POINT_B = { left: 85.1, top: 97.8 } // by the lower part of the pier

/** Walking speed in px per second on a 1440px-wide screen; scales with width. */
const WALK_SPEED = 80
const DESIGN_WIDTH = 1440

/** How long the crab stops and waves at each end, in ms. */
const STOP_MS = 1500

type Point = { left: number; top: number }
type Phase = 'walk' | 'wave'

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * A small crab that walks back and forth along the beach, stopping at each
 * end to wave. Decoration only: it never takes clicks and sits behind the
 * page content. Must be placed inside the scene box (SceneBackground's decor).
 */
export function BeachCrab() {
  const crabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const crab = crabRef.current
    if (!crab) return

    const place = (p: Point) => {
      crab.style.left = `${p.left}%`
      crab.style.top = `${p.top}%`
    }

    // Reduced motion: stand still at point B, no animation at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      place(POINT_B)
      crab.dataset.phase = 'still'
      return
    }

    let from = POINT_B
    let to = POINT_A
    let phase: Phase = 'walk'
    let t = 0 // ms spent in the current phase
    let walkMs = -1 // measured when a walk starts; -1 = not measured yet
    let last = performance.now()
    let raf = 0

    const setPhase = (next: Phase) => {
      phase = next
      t = 0
      crab.dataset.phase = next
    }

    const walkDuration = () => {
      const box = (crab.offsetParent as HTMLElement | null) ?? document.body
      const { width, height } = box.getBoundingClientRect()
      const dist = Math.hypot(((to.left - from.left) / 100) * width, ((to.top - from.top) / 100) * height)
      const speed = (WALK_SPEED * width) / DESIGN_WIDTH
      return speed > 0 ? (dist / speed) * 1000 : 0
    }

    place(from)
    setPhase('walk')

    const tick = (now: number) => {
      // Cap the step so a hidden tab just pauses the crab instead of skipping.
      const dt = Math.min(now - last, 100)
      last = now
      t += dt

      if (phase === 'walk') {
        if (walkMs < 0) walkMs = walkDuration()
        const p = walkMs > 0 ? Math.min(t / walkMs, 1) : 1
        const e = easeInOut(p)
        place({
          left: from.left + (to.left - from.left) * e,
          top: from.top + (to.top - from.top) * e,
        })
        if (p >= 1) setPhase('wave')
      } else if (t >= STOP_MS) {
        // Turn around and walk back.
        ;[from, to] = [to, from]
        walkMs = -1
        setPhase('walk')
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.layer} aria-hidden="true">
      <div
        ref={crabRef}
        className={styles.crab}
        data-phase="walk"
        style={{ left: `${POINT_B.left}%`, top: `${POINT_B.top}%` }}
      >
        <CrabArt />
      </div>
    </div>
  )
}

function CrabArt() {
  return (
    <svg viewBox="0 0 120 100" className="crabSvg" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="92" rx="34" ry="4.5" fill="rgba(140,100,50,.18)" />
      <g className="leg a" style={{ transformOrigin: '34px 62px' }}>
        <path d="M34,62 Q14,58 11,88" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M34,62 Q14,58 11,88" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="leg b" style={{ transformOrigin: '34px 68px' }}>
        <path d="M34,68 Q19,70 20,92" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M34,68 Q19,70 20,92" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="leg a" style={{ transformOrigin: '39px 73px' }}>
        <path d="M39,73 Q30,80 30,93" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M39,73 Q30,80 30,93" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="leg b" style={{ transformOrigin: '86px 62px' }}>
        <path d="M86,62 Q106,58 109,88" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M86,62 Q106,58 109,88" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="leg a" style={{ transformOrigin: '86px 68px' }}>
        <path d="M86,68 Q101,70 100,92" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M86,68 Q101,70 100,92" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="leg b" style={{ transformOrigin: '81px 73px' }}>
        <path d="M81,73 Q90,80 90,93" stroke="#6b4a33" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M81,73 Q90,80 90,93" stroke="#ea7258" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g className="bob">
        <g className="claw l" style={{ transformOrigin: '33px 52px' }}>
          <path d="M33,52 Q20,48 18,36" stroke="#6b4a33" strokeWidth="7.5" fill="none" strokeLinecap="round" />
          <path d="M33,52 Q20,48 18,36" stroke="#f4836a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <g transform="translate(17,29) scale(1.05,1.05) rotate(-8)">
            <g className="nip">
              <path
                d="M-9,5 C-15,-5 -9,-16 -2,-15 L1,-6 L4,-16 C12,-15 14,-2 8,5 C3,10 -5,10 -9,5 Z"
                fill="#f4836a"
                stroke="#6b4a33"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
        <g className="claw r" style={{ transformOrigin: '87px 52px' }}>
          <path d="M87,52 Q100,48 102,36" stroke="#6b4a33" strokeWidth="7.5" fill="none" strokeLinecap="round" />
          <path d="M87,52 Q100,48 102,36" stroke="#f4836a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <g transform="translate(103,29) scale(-1.05,1.05) rotate(-8)">
            <g className="nip">
              <path
                d="M-9,5 C-15,-5 -9,-16 -2,-15 L1,-6 L4,-16 C12,-15 14,-2 8,5 C3,10 -5,10 -9,5 Z"
                fill="#f4836a"
                stroke="#6b4a33"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
        <path d="M52,44 L49,27 M68,44 L71,27" stroke="#6b4a33" strokeWidth="6" strokeLinecap="round" />
        <path d="M52,44 L49,27 M68,44 L71,27" stroke="#f4836a" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M27,63 C27,42 44,37 60,37 C76,37 93,42 93,63 C93,75 78,81 60,81 C42,81 27,75 27,63Z"
          fill="#f4836a"
          stroke="#6b4a33"
          strokeWidth="2.6"
        />
        <ellipse cx="60" cy="72" rx="20" ry="6.5" fill="#ffb59a" />
        <ellipse cx="45" cy="47" rx="7" ry="3.2" fill="#fff" opacity=".55" transform="rotate(-22 45 47)" />
        <circle cx="70" cy="45" r="1.6" fill="#e0664c" />
        <circle cx="76" cy="49" r="1.2" fill="#e0664c" />
        <ellipse cx="41" cy="64" rx="5.5" ry="3.2" fill="#ff8b8b" opacity=".75" />
        <ellipse cx="79" cy="64" rx="5.5" ry="3.2" fill="#ff8b8b" opacity=".75" />
        <path
          d="M55,64 q2.5,3.2 5,0 q2.5,3.2 5,0"
          stroke="#6b4a33"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="eye" style={{ transformOrigin: '49px 25px' }}>
          <circle cx="49" cy="25" r="7.2" fill="#fff" stroke="#6b4a33" strokeWidth="2.4" />
          <circle cx="50" cy="26" r="3.7" fill="#4a3426" />
          <circle cx="51.4" cy="24.4" r="1.4" fill="#fff" />
        </g>
        <g className="eye" style={{ transformOrigin: '71px 25px' }}>
          <circle cx="71" cy="25" r="7.2" fill="#fff" stroke="#6b4a33" strokeWidth="2.4" />
          <circle cx="70" cy="26" r="3.7" fill="#4a3426" />
          <circle cx="71.4" cy="24.4" r="1.4" fill="#fff" />
        </g>
      </g>
    </svg>
  )
}
