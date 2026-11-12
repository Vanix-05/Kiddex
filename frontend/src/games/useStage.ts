import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLobbySettings } from '../screens/Lobby/useLobbySettings'

/**
 * The stage (top bar, board, strip, Ollie and the kid) is drawn at a fixed
 * design size and scaled as one group to fit the window, like the Teacher
 * planner. Short windows (under 600px tall, e.g. phones in landscape) use a
 * smaller design without Ollie, so the board can be bigger.
 * Tap targets use max(N, 44px / --s) so they stay 44px or more on screen.
 */
export const DESIGN = {
  normal: { w: 1440, h: 900 },
  // Close to a phone held sideways (844x390 scales by ~0.93), so 48px
  // buttons and cards stay at least 44px on screen.
  short: { w: 900, h: 420 },
} as const

/**
 * Where the board and the strip sit, in design px. On short windows the board
 * takes most of the width; the strip is a card on its right, above the kid.
 */
export const SLOTS = {
  normal: {
    board: { x: 322, y: 118, w: 796, h: 544 },
    tall: { x: 322, y: 100, w: 796, h: 606 },
    strip: { x: 322, y: 692, w: 796, h: 130 },
  },
  short: {
    board: { x: 12, y: 62, w: 604, h: 350 },
    tall: { x: 12, y: 62, w: 604, h: 350 },
    strip: { x: 628, y: 62, w: 260, h: 230 },
  },
} as const

export interface StageFit {
  short: boolean
  scale: number
  left: number
  top: number
  w: number
  h: number
}

function fit(): StageFit {
  const w = window.innerWidth
  const h = window.innerHeight
  const short = h < 600
  const design = short ? DESIGN.short : DESIGN.normal
  const scale = Math.min(w / design.w, h / design.h)
  return { short, scale, left: (w - design.w * scale) / 2, top: (h - design.h * scale) / 2, w: design.w, h: design.h }
}

export function useStageFit() {
  const [stage, setStage] = useState(fit)
  useEffect(() => {
    const onResize = () => setStage(fit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return stage
}

const query = '(prefers-reduced-motion: reduce)'
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** Less motion: the OS setting, or the Lobby's Moving effects = Less. No confetti, jumps or shakes. */
export function useCalmMotion() {
  const [settings] = useLobbySettings()
  const os = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
  return os || settings.motion === 'less'
}
