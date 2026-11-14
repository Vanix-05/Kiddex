import type { Ref } from 'react'
import { LEFT_OPACITY, OWL, OWL_BOX } from './doodleLayout'
import styles from './Intro.module.css'

/*
 * The kid's pencil doodles on the right page: a little sun, a star, and an
 * owl that looks like Ollie (round head and body, ear tufts, big round eyes
 * with round glasses, a small beak, a scarf). Drawn in the right page's own
 * 572 x 698 pixels. They sit in a row along the bottom of the page: that is
 * as far as the hand can reach from the bottom of the screen before the end
 * of its sleeve would show (DRAW_ZONE_TOP in introTimeline.ts).
 */

/** The sun: a circle, then 8 rays. */
const SUN = { x: 456, y: 568 }
const SUN_PATHS = [
  `M${SUN.x + 26} ${SUN.y} a26 26 0 1 1 -52 0 a26 26 0 1 1 52 0`,
  ...Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4 - Math.PI / 2
    const p = (r: number) => `${(SUN.x + Math.cos(a) * r).toFixed(1)} ${(SUN.y + Math.sin(a) * r).toFixed(1)}`
    return `M${p(36)} L${p(52)}`
  }),
]

/** The star: five points, drawn in one go. */
const STAR = { x: 116, y: 572 }
const STAR_PATHS = [
  'M' +
    Array.from({ length: 11 }, (_, k) => {
      const a = (k * Math.PI) / 5 - Math.PI / 2
      const r = k % 2 ? 16 : 38
      return `${(STAR.x + Math.cos(a) * r).toFixed(1)} ${(STAR.y + Math.sin(a) * r).toFixed(1)}`
    }).join(' L'),
]

/** The owl is drawn in a 100 x 140 box with Ollie's own proportions; OWL (doodleLayout.ts) places it. */
const OWL_PATHS = [
  // head and body
  'M50 8 C76 8 92 26 92 48 C92 60 88 68 82 74 C90 88 90 110 79 122 C69 132 31 132 21 122 C10 110 10 88 18 74 C12 68 8 60 8 48 C8 26 24 8 50 8 Z',
  // ear tufts
  'M22 22 L16 5 L33 12',
  'M78 22 L84 5 L67 12',
  // round glasses, with the bridge between them
  'M48 46 a13 13 0 1 1 -26 0 a13 13 0 1 1 26 0',
  'M48 46 L53 46',
  'M79 46 a13 13 0 1 1 -26 0 a13 13 0 1 1 26 0',
  // beak
  'M47 59 L51 67 L55 59 Z',
  // scarf, with its end hanging down
  'M17 79 C34 90 66 90 83 79',
  'M60 87 L63 106 L72 104 L69 86',
  // wing and feet
  'M21 94 C15 103 17 115 25 119',
  'M40 131 L37 137 M44 132 L44 138 M58 132 L58 138 M62 131 L65 137',
]
/** The owl's eyes: two dots that can blink. */
const OWL_EYES = [
  [35, 46],
  [66, 46],
]

/** Small gold sparkles around the owl when it comes alive (page pixels). */
const SPARKLES = [
  [OWL.x - 22, OWL.y + 20],
  [OWL.x + OWL_BOX.width + 16, OWL.y + 6],
  [OWL.x + OWL_BOX.width + 26, OWL.y + 92],
  [OWL.x - 30, OWL.y + 110],
  [OWL.x + 60, OWL.y - 26],
]

interface DoodlesProps {
  ref?: Ref<SVGSVGElement>
  /**
   * draw: nothing shows yet; the clip draws each line (see useIntroClip.tsx).
   * left: what stays on the page afterwards: the sun and the star as faint
   * pencil lines. The owl is gone.
   */
  mode: 'draw' | 'left'
}

export function Doodles({ ref, mode }: DoodlesProps) {
  const draw = mode === 'draw'
  // pathLength 1: a dash offset of 1 hides a line, 0 shows all of it.
  const line = (d: string, i: number) => (
    <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={draw ? 1 : 0} opacity={draw ? 0 : 1} />
  )
  return (
    <svg ref={ref} className={styles.doodles} viewBox="0 0 572 698" aria-hidden="true">
      <g data-doodle="keep" opacity={draw ? 1 : LEFT_OPACITY}>
        <g data-doodle="sun">{SUN_PATHS.map(line)}</g>
        <g data-doodle="star">{STAR_PATHS.map(line)}</g>
      </g>
      {draw && (
        <>
          <g data-doodle="owl" data-x={OWL.x} data-y={OWL.y} data-scale={OWL.scale} transform={`translate(${OWL.x} ${OWL.y}) scale(${OWL.scale})`}>
            {OWL_PATHS.map(line)}
            <g data-doodle="eyes" className={styles.owlEyes} opacity={0}>
              {OWL_EYES.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={4.2} />
              ))}
            </g>
          </g>
          {SPARKLES.map(([x, y], i) => (
            <path
              key={i}
              data-doodle="sparkle"
              className={styles.sparkle}
              d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z"
              style={{ translate: `${x}px ${y}px` }}
              opacity={0}
            />
          ))}
        </>
      )}
    </svg>
  )
}
