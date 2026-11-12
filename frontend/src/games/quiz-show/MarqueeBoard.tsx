import type { ReactNode } from 'react'
import styles from './QuizShow.module.css'

/** Bulb centers along the purple band (`band` px wide), evenly spaced on every side. */
function bulbs(w: number, h: number, band: number) {
  const step = band * 1.6
  const points: [number, number][] = []
  const c = band / 2
  const along = (length: number) => {
    const n = Math.max(2, Math.round((length - 2 * c) / step))
    return Array.from({ length: n + 1 }, (_, i) => c + ((length - 2 * c) * i) / n)
  }
  const xs = along(w)
  const ys = along(h)
  for (const x of xs) points.push([x, c], [x, h - c])
  for (const y of ys.slice(1, -1)) points.push([c, y], [w - c, y])
  return points
}

/** Quiz Show's board: a purple frame with marquee bulbs, cream inside, hanging on 2 ropes. */
export function MarqueeBoard({ w, h, band = 24, ropes = true, children }: { w: number; h: number; band?: number; ropes?: boolean; children: ReactNode }) {
  return (
    <div className={styles.marquee} style={{ width: w, height: h }}>
      {ropes && (
        <>
          <span className={styles.rope} style={{ left: w * 0.14 }} aria-hidden="true" />
          <span className={styles.rope} style={{ right: w * 0.14 }} aria-hidden="true" />
        </>
      )}
      <svg className={styles.frameArt} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <rect x="2" y="2" width={w - 4} height={h - 4} rx={band + 6} fill="var(--color-game-quiz)" stroke="var(--color-card-border)" strokeWidth="4" />
        {bulbs(w, h, band).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={band * 0.27} fill="var(--color-game-bulb)" stroke="var(--color-game-bulb-edge)" strokeWidth="2" />
        ))}
      </svg>
      <div className={styles.panel} style={{ inset: band }}>
        {children}
      </div>
    </div>
  )
}
