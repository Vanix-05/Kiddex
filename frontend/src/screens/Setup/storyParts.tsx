import type { CSSProperties } from 'react'
import styles from './StoryPage.module.css'

/*
 * The small drawn things on the setup storybook's picture pages (Boy or
 * Girl, the quiz): all still, plain inline SVG in the book's own pixels.
 * Colors are theme variables (theme.ts).
 */

const INK = 'var(--color-card-border)'

/** A 5-pointed star as polygon points, centered on (x, y). */
function starPoints(x: number, y: number, r: number) {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    points.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`)
  }
  return points.join(' ')
}

/** The gold star stamp with a ✓, on the picked card's top-right corner. */
export function PickStamp({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? `${styles.stamp} ${styles.stampSmall}` : styles.stamp} viewBox="0 0 80 80" aria-hidden="true">
      <polygon
        points={starPoints(40, 40, 37)}
        transform="rotate(-8 40 40)"
        style={{ fill: 'var(--color-story-star)', stroke: INK }}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M26 41l9 9 19-20" fill="none" style={{ stroke: INK }} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** One of the 5 stars beside "Question N of 5": gold up to N, white after. */
export function ProgressStar({ done }: { done: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true">
      <polygon
        points={starPoints(20, 20, 17)}
        style={{ fill: done ? 'var(--color-story-star)' : 'var(--color-sticker-fill, #fff)', stroke: INK }}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type DoodleKind = 'sparkle' | 'heart' | 'squiggle'

const DOODLE_PATHS: Record<DoodleKind, { viewBox: string; d: string; line?: boolean }> = {
  sparkle: { viewBox: '0 0 40 40', d: 'M20 2C22 14 26 18 38 20 26 22 22 26 20 38 18 26 14 22 2 20 14 18 18 14 20 2Z' },
  heart: {
    viewBox: '0 0 40 40',
    d: 'M20 35C8 26 3 19 3 12 3 6 8 3 12.5 3 16 3 18.5 5 20 8 21.5 5 24 3 27.5 3 32 3 37 6 37 12 37 19 32 26 20 35Z',
  },
  squiggle: { viewBox: '0 0 120 40', d: 'M4 30C20 4 34 4 40 20S62 36 70 18 96 2 116 14', line: true },
}

/**
 * A small still doodle on the page: a sparkle, a heart or a squiggle.
 * x, y, size in book pixels; color is a CSS color (a theme variable).
 */
export function Doodle({ kind, x, y, size, color, rotate = 0 }: { kind: DoodleKind; x: number; y: number; size: number; color: string; rotate?: number }) {
  const { viewBox, d, line } = DOODLE_PATHS[kind]
  const style: CSSProperties = { left: x, top: y, width: size, transform: rotate ? `rotate(${rotate}deg)` : undefined }
  return (
    <svg className={styles.doodle} style={style} viewBox={viewBox} aria-hidden="true">
      {line ? (
        <path d={d} fill="none" style={{ stroke: color }} strokeWidth="5" strokeLinecap="round" />
      ) : (
        <path d={d} style={{ fill: color, stroke: INK }} strokeWidth={kind === 'heart' ? 3 : 2.5} strokeLinejoin="round" />
      )}
    </svg>
  )
}

/** A strip of washi tape. Placed by the caller's class (left, top, rotation, color). */
export function Tape({ className }: { className: string }) {
  return <span className={`${styles.tape} ${className}`} aria-hidden="true" />
}

/** The small orange pencil arrow after "Pick one!". */
export function PencilArrow() {
  return (
    <svg width="54" height="30" viewBox="0 0 54 30" aria-hidden="true">
      <path
        d="M4 8c14 2 26 8 38 16M42 24l-2-11M42 24l-11 1"
        fill="none"
        style={{ stroke: 'var(--color-story-picked)' }}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The wavy orange pencil line under "This story is about…". */
export function WavyUnderline() {
  return (
    <svg className={styles.underline} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 7C30 2 50 11 80 6S140 3 198 7" fill="none" style={{ stroke: 'var(--color-story-underline)' }} strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
