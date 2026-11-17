import { useLayoutEffect, useMemo, useRef } from 'react'
import { buddyArms } from '../../../companions/buddyRigData'
import type { BuddyId } from '../../../setup/quizData'
import styles from './PullIn.module.css'

/**
 * One stubby arm, coming toward the camera (80 x 273, shoulder at the top
 * middle, x = 40): a short tube, narrow where it comes out of the glow and
 * wider at the paw end (coming toward the camera). Its top end is inside the
 * glow, so it never shows.
 */
const TUBE = 'M24 -14 L56 -14 C66 60 76 150 78 252 L2 252 C4 150 14 60 24 -14 Z'
/** Soft light down one side and shade down the other: painted once, never animated. */
const LIGHT = 'M28 -6 C22 80 17 160 14 244 L26 244 C28 160 32 80 36 -6 Z'
const SHADE = 'M52 -6 C59 80 65 160 67 244 L74 244 C72 160 66 80 56 -6 Z'

/**
 * A paw, seen from above as it closes around the kid's hand: a round mitten
 * with four toes along its front edge (100 x 80).
 */
const PAW =
  'M10 30 C10 8 90 8 90 30 L90 48 C90 60 83 66 77 66 C73 75 62 77 57 70 C53 78 45 78 42 70 C37 77 26 75 23 66 C16 66 10 60 10 48 Z'
const TOES = 'M42 70 L43 59 M57 70 L57 59 M23 66 L27 57 M77 66 L73 57'

/** The sketch's second pencil line: a little off the first, differently on each arm. */
const SKETCH_OFFSET = {
  left: { tube: 'translate(1.6 -1.2) rotate(0.6 40 130)', paw: 'translate(1.3 -1) rotate(1 50 40)' },
  right: { tube: 'translate(-1.4 1) rotate(-0.5 40 130)', paw: 'translate(-1.2 1) rotate(-1 50 40)' },
} as const

/** Relative brightness of a #rrggbb color (0..1). */
const lightness = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return Number.isNaN(n) ? 1 : (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255
}

/**
 * The picked buddy's two arms, reaching out of the page: short, thick buddy
 * arms (273px long, 80px wide) with a clear paw on each end. They are drawn
 * here, the same shape for every buddy, in that buddy's own arm colors (its
 * fur, its paw tip and its outline, read from its traced arm parts, so a
 * buddy color recolors them too). Each arm is drawn twice, one on top of the
 * other: as a pencil sketch (grey lines, each drawn twice a little apart) and in color.
 * usePullInClip.tsx moves the arms ([data-arm]) and cross-fades the two
 * copies ([data-arm-art]).
 */
export function BuddyArms({ buddy, buddyColor }: { buddy: BuddyId; buddyColor?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const shapes = useMemo(() => buddyArms(buddy, buddyColor).right, [buddy, buddyColor])

  // Before the first paint: the buddy's arm colors, from its traced arm (measured once, hidden).
  useLayoutEffect(() => {
    const root = rootRef.current
    const traced = root?.querySelector<SVGSVGElement>('[data-arm-measure]')
    if (!root || !traced) return
    const parts = [...traced.querySelectorAll('path')].map((path) => {
      const b = path.getBBox()
      return { fill: path.getAttribute('fill') ?? '', bottom: b.y + b.height, area: b.width * b.height }
    })
    if (!parts.length) return
    // The outline and the arm's whole silhouette reach the very bottom; the outline is the darker.
    const lowest = Math.max(...parts.map((p) => p.bottom))
    const full = parts.filter((p) => p.bottom >= lowest - 1)
    const outline = full.reduce((a, b) => (lightness(b.fill) < lightness(a.fill) ? b : a))
    // The fur: the biggest shape after the outline.
    const others = parts.filter((p) => p !== outline)
    const fur = others.reduce((a, b) => (b.area > a.area ? b : a), others[0] ?? outline)
    // The paw tip: of the rest, the one reaching lowest (the biggest, if several do); else the fur.
    const tip = others
      .filter((p) => p !== fur && p.area > 1000)
      .reduce<(typeof parts)[number] | null>((a, b) => (!a || b.bottom > a.bottom + 1 || (b.bottom >= a.bottom - 1 && b.area > a.area) ? b : a), null)
    root.style.setProperty('--arm-line', outline.fill)
    root.style.setProperty('--arm-fur', fur.fill)
    root.style.setProperty('--arm-paw', (tip ?? fur).fill)
  }, [shapes])

  const arm = (side: 'left' | 'right') => (
    <div data-arm={side} className={styles.arm}>
      <svg data-arm-art="color" className={styles.armTube} viewBox="0 0 80 273">
        <path d={TUBE} className={styles.armFur} />
        <path d={LIGHT} className={styles.armLight} />
        <path d={SHADE} className={styles.armShade} />
        <path d={TUBE} className={styles.armOutline} />
      </svg>
      {/* The pencil sketch: each line drawn twice, a little apart (no filter: growing the arms costs nothing). */}
      <svg data-arm-art="sketch" className={`${styles.armTube} ${styles.armSketch}`} viewBox="0 0 80 273">
        <path d={TUBE} />
        <path d={TUBE} className={styles.sketchAgain} transform={SKETCH_OFFSET[side].tube} />
      </svg>
      <svg data-arm-art="color" className={styles.paw} viewBox="0 0 100 80">
        <path d={PAW} className={styles.pawFill} />
        <path d={TOES} className={styles.pawToes} />
      </svg>
      <svg data-arm-art="sketch" className={`${styles.paw} ${styles.armSketch}`} viewBox="0 0 100 80">
        <path d={PAW} />
        <path d={TOES} />
        <path d={PAW} className={styles.sketchAgain} transform={SKETCH_OFFSET[side].paw} />
      </svg>
    </div>
  )

  return (
    <div ref={rootRef} className={styles.arms}>
      {/* The buddy's traced arm: never seen, only measured for its colors. */}
      <svg data-arm-measure="" className={styles.armMeasure} viewBox="0 0 5000 5000" aria-hidden="true">
        {shapes.map((s, i) => (
          <path key={i} d={s.d} fill={s.fill} />
        ))}
      </svg>
      {arm('left')}
      {arm('right')}
    </div>
  )
}
