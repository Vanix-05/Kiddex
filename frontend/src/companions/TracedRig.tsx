import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
// The otter's rig animations, reused as-is (no new animation code per animal).
import styles from './otter/OtterRig.module.css'
// The one addition: a small hair bounce (for companions with hair).
import rigStyles from './TracedRig.module.css'

/** One traced shape: [path data, fill colour, sub-group]. */
export type TracedPath = readonly [d: string, fill: string, group: string]
export type RigPart = 'head' | 'armLeft' | 'armRight' | 'legLeft' | 'legRight' | 'body' | 'belly'
export type RigParts = Record<RigPart, readonly TracedPath[]>

type Point = readonly [x: number, y: number]

/** Joint positions in PNG pixels (5000 x 5000 canvas), used as each layer's transform-origin. */
export interface RigPivots {
  feet: Point // bob + landing squash
  middle: Point // sway
  body: Point // hips
  belly: Point // breathing
  neck: Point // head nod and tilt
  eyeLine: Point // blink
  hair?: Point // hair bounce (only companions with a hair group)
  earLeft?: Point // ear twitch (only companions with earL / earR groups): base of each ear
  earRight?: Point
  gillsLeft?: Point // gill wiggle (the ear twitch, on gillsL / gillsR groups): base of each side's gills
  gillsRight?: Point
  shoulderLeft: Point
  shoulderRight: Point
  hipLeft: Point
  hipRight: Point
}

type Move = 'wave' | 'dance' | 'jump'
const MOVES: Move[] = ['wave', 'dance', 'jump']
// Must match the animation lengths in otter/OtterRig.module.css.
const MOVE_MS: Record<Move, number> = { wave: 1800, dance: 2400, jump: 1300 }
const FIRST_MOVE_MS = 1200

const between = (min: number, max: number) => min + Math.random() * (max - min)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const pivot = ([x, y]: Point): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })

/** Draws traced shapes in their original order, wrapping runs of the same sub-group. */
function Shapes({
  paths,
  groups = {},
  groupPivots = {},
}: {
  paths: readonly TracedPath[]
  groups?: Record<string, string>
  groupPivots?: Record<string, CSSProperties | undefined>
}) {
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
          <g key={i} className={cls} data-part={run.group} style={groupPivots[run.group]}>
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
 * A companion rigged from its PNG (cut into parts and traced with vtracer, see
 * scripts/rig-<animal>.mjs), animated with the otter's rig animations.
 * Each companion passes its own traced parts and joint positions.
 *
 * - Always: sway, bob, breathing, small arm swings, and a blink every 3-5 s.
 *   Companions with a hair group (the kids) also get a small hair bounce, and
 *   companions with separate ears (earL / earR, the kitty) an ear twitch. The
 *   axolotl's gills (gillsL / gillsR) use the same twitch as a gill wiggle.
 * - A random move (wave, dance or jump) soon after it appears, then every
 *   5-7 s, and straight away when it's clicked or tapped.
 * - With "reduce motion" on: the idle motion only.
 */
export function TracedRig({
  parts,
  pivots,
  label,
  className,
  legsBehindBody = false,
}: {
  parts: RigParts
  pivots: RigPivots
  label: string
  className?: string
  /** Draw the legs behind the body, e.g. so a skirt stays over them when they step. */
  legsBehindBody?: boolean
}) {
  const [move, setMove] = useState<Move | null>(null)
  const rootRef = useRef<HTMLButtonElement>(null)
  const clearTimer = useRef(0)

  const play = useCallback(() => {
    if (reducedMotion()) return
    const next = MOVES[Math.floor(Math.random() * MOVES.length)]
    window.clearTimeout(clearTimer.current)
    // Clear first, then set on a later frame, so the same move can restart.
    setMove(null)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setMove(next)
        clearTimer.current = window.setTimeout(() => setMove(null), MOVE_MS[next])
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

  const headGroups = {
    eyes: styles.eyes,
    ears: styles.ears,
    nose: styles.nose,
    mouth: styles.mouth,
    hair: rigStyles.hair,
    earL: rigStyles.earL,
    earR: rigStyles.earR,
    // Gills reuse the ear twitch, as a gill wiggle.
    gillsL: rigStyles.earL,
    gillsR: rigStyles.earR,
  }
  const headPivots = {
    eyes: pivot(pivots.eyeLine),
    hair: pivots.hair && pivot(pivots.hair),
    earL: pivots.earLeft && pivot(pivots.earLeft),
    earR: pivots.earRight && pivot(pivots.earRight),
    gillsL: pivots.gillsLeft && pivot(pivots.gillsLeft),
    gillsR: pivots.gillsRight && pivot(pivots.gillsRight),
  }

  const legs = (
    <>
      <g className={styles.legLeft} style={pivot(pivots.hipLeft)}>
        <Shapes paths={parts.legLeft} />
      </g>
      <g className={styles.legRight} style={pivot(pivots.hipRight)}>
        <Shapes paths={parts.legRight} />
      </g>
    </>
  )

  return (
    <button
      ref={rootRef}
      type="button"
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-move={move ?? undefined}
      onClick={play}
      aria-label={`Your companion: ${label}. Tap to play!`}
    >
      <svg className={styles.svg} viewBox="0 0 5000 5000" aria-hidden="true" focusable="false">
        {/* bob (idle) > move (sway, hop) > squash (landing) > parts */}
        <g className={styles.bob} style={pivot(pivots.feet)}>
          <g className={styles.move} style={pivot(pivots.middle)}>
            <g className={styles.squash} style={pivot(pivots.feet)}>
              {legsBehindBody && legs}
              <g className={styles.body} style={pivot(pivots.body)}>
                <Shapes paths={parts.body} />
                <g className={styles.belly} style={pivot(pivots.belly)}>
                  <Shapes paths={parts.belly} />
                </g>
              </g>
              {!legsBehindBody && legs}
              <g className={styles.head} style={pivot(pivots.neck)}>
                <Shapes paths={parts.head} groups={headGroups} groupPivots={headPivots} />
              </g>
              {/* Arms in front, so the wave can pass over the cheek. */}
              <g className={styles.armLeft} style={pivot(pivots.shoulderLeft)}>
                <Shapes paths={parts.armLeft} />
              </g>
              <g className={styles.armRight} style={pivot(pivots.shoulderRight)}>
                <Shapes paths={parts.armRight} />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}
