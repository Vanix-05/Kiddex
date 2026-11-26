import { useEffect, useState, useSyncExternalStore } from 'react'
import { PHONE_SIDEWAYS_QUERY } from '../hooks/usePhoneSideways'
import { useLobbySettings } from '../screens/Lobby/useLobbySettings'
import { onViewportChange } from '../hooks/viewportChange'

/**
 * The stage (top bar, board, strip, the buddy and the kid) is drawn at a fixed
 * design size and scaled as one group to fit the window, like the Teacher
 * planner. Short windows (under 600px tall, e.g. phones in landscape) use a
 * smaller design: no speech bubbles, the buddy and the kid small in the
 * corner, so the board can be bigger. The Buddy Help button stays.
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
 * takes most of the width; the strip is a card on its right, above the Buddy
 * Help button and the buddy and kid.
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
    strip: { x: 628, y: 62, w: 260, h: 178 },
  },
} as const

/** A place on the stage, in design px. */
export interface Slot {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The slots for this stage. A sideways phone narrower than the short design
 * (e.g. 667x375) gets a taller design (see fit): the board grows down by the
 * extra height, so its cards can stay 44px on screen.
 */
export function slotsFor(stage: StageFit): { board: Slot; tall: Slot; strip: Slot } {
  if (!stage.short) return SLOTS.normal
  const extra = stage.h - DESIGN.short.h
  if (extra <= 0) return SLOTS.short
  const { board, tall, strip } = SLOTS.short
  return { board: { ...board, h: board.h + extra }, tall: { ...tall, h: tall.h + extra }, strip }
}

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
  // A sideways phone narrower than the short design's shape (e.g. 667x375)
  // would leave empty bands above and below: the design gets as tall as the
  // screen's shape instead, and the board takes the extra height (slotsFor).
  const tall = short && window.matchMedia(PHONE_SIDEWAYS_QUERY).matches
  const designH = tall ? Math.max(design.h, Math.round((design.w * h) / w)) : design.h
  const scale = Math.min(w / design.w, h / designH)
  return { short, scale, left: (w - design.w * scale) / 2, top: (h - designH * scale) / 2, w: design.w, h: designH }
}

export function useStageFit() {
  const [stage, setStage] = useState(fit)
  useEffect(() => {
    return onViewportChange(() => setStage(fit()))
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
