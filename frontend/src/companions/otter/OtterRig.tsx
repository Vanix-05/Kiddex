import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { otterParts, type TracedPath } from './otterParts.generated'
import styles from './OtterRig.module.css'

type Move = 'wave' | 'dance' | 'jump'
const MOVES: Move[] = ['wave', 'dance', 'jump']
// Must match the animation lengths in OtterRig.module.css.
const MOVE_MS: Record<Move, number> = { wave: 1800, dance: 2400, jump: 1300 }
const FIRST_MOVE_MS = 1200 // first move soon after the page opens

const between = (min: number, max: number) => min + Math.random() * (max - min)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Draws traced shapes in their original order, wrapping runs of the same sub-group. */
function Shapes({ paths, groups = {} }: { paths: readonly TracedPath[]; groups?: Record<string, string> }) {
  const runs: { group: string; items: TracedPath[] }[] = []
  for (const p of paths) {
    const last = runs.at(-1)
    if (last && last.group === p[2]) last.items.push(p)
    else runs.push({ group: p[2], items: [p] })
  }
  return (
    <>
      {runs.map((run, i) => {
        const body = run.items.map(([d, fill], j) => <path key={j} d={d} fill={fill} />)
        const cls = groups[run.group]
        return cls ? (
          <g key={i} className={cls} data-part={run.group}>
            {body}
          </g>
        ) : (
          <Fragment key={i}>{body}</Fragment>
        )
      })}
    </>
  )
}

/**
 * The otter companion, rigged from pet_otter.png: the PNG was cut into parts
 * and each part traced with vtracer (scripts/rig-otter.mjs). Nothing is drawn
 * by hand. Parts: head (eyes, ears, nose, mouth), body, belly, both arms, both legs.
 *
 * - Always: a sway, a bob, breathing, small arm swings, and a blink every 3-5 s.
 * - A random move (wave, dance or jump) ~1 s after it appears, then every
 *   5-7 s, and straight away when it's clicked or tapped.
 * - With "reduce motion" on: the idle motion only.
 *
 * Drawn on the PNG's 5000 x 5000 canvas, so it replaces the PNG at the same size.
 */
export function OtterRig({ className, label = 'Otter' }: { className?: string; label?: string }) {
  const [move, setMove] = useState<Move | null>(null)
  const rootRef = useRef<HTMLButtonElement>(null)
  const clearTimer = useRef(0)

  const play = useCallback((next?: Move) => {
    if (reducedMotion()) return
    const name = next ?? MOVES[Math.floor(Math.random() * MOVES.length)]
    window.clearTimeout(clearTimer.current)
    // Clear first, then set on a later frame, so the same move can restart.
    setMove(null)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setMove(name)
        clearTimer.current = window.setTimeout(() => setMove(null), MOVE_MS[name])
      }),
    )
  }, [])

  // First move soon after appearing, then one every 5-7 s.
  useEffect(() => {
    let timer = window.setTimeout(function tick() {
      play()
      timer = window.setTimeout(tick, between(5000, 7000))
    }, FIRST_MOVE_MS)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearTimer.current)
    }
  }, [play])

  // Blink every 3-5 s: add a class that runs a short CSS animation.
  useEffect(() => {
    const eyes = () => rootRef.current?.querySelectorAll<SVGGElement>('[data-part="eyes"]') ?? []
    let timer = 0
    const blink = () => {
      eyes().forEach((g) => {
        g.classList.remove(styles.blink)
        void g.getBBox() // restart the animation
        g.classList.add(styles.blink)
      })
      timer = window.setTimeout(blink, between(3000, 5000))
    }
    timer = window.setTimeout(blink, between(1500, 3000))
    return () => window.clearTimeout(timer)
  }, [])

  const headGroups = { eyes: styles.eyes, ears: styles.ears, nose: styles.nose, mouth: styles.mouth }

  return (
    <button
      ref={rootRef}
      type="button"
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-move={move ?? undefined}
      onClick={() => play()}
      aria-label={`Your companion: ${label}. Tap to play!`}
    >
      <svg className={styles.svg} viewBox="0 0 5000 5000" aria-hidden="true" focusable="false">
        {/* bob (idle) > move (sway, hop, spin) > squash (landing) > parts */}
        <g className={styles.bob}>
          <g className={styles.move}>
            <g className={styles.squash}>
              <g className={styles.body}>
                <Shapes paths={otterParts.body} />
                <g className={styles.belly}>
                  <Shapes paths={otterParts.belly} />
                </g>
              </g>
              <g className={styles.legLeft}>
                <Shapes paths={otterParts.legLeft} />
              </g>
              <g className={styles.legRight}>
                <Shapes paths={otterParts.legRight} />
              </g>
              <g className={styles.head}>
                <Shapes paths={otterParts.head} groups={headGroups} />
              </g>
              {/* Arms in front, so the wave can pass over the cheek. */}
              <g className={styles.armLeft}>
                <Shapes paths={otterParts.armLeft} />
              </g>
              <g className={styles.armRight}>
                <Shapes paths={otterParts.armRight} />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}
