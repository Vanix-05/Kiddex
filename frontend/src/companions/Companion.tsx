import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { companionRegistry, type CompanionId } from './registry'
import type { CompanionDefinition } from './types'
import type { Emotion } from './rig/emotions'
import styles from './Companion.module.css'

export type { Emotion } from './rig/emotions'

type Move = 'hop' | 'wiggle' | 'turn'
const MOVES: Move[] = ['hop', 'wiggle', 'turn']
// Must match the animation lengths in Companion.module.css.
const MOVE_MS: Record<Move, number> = { hop: 900, wiggle: 1600, turn: 800 }
const FIRST_MOVE_MS = 1500

const between = (min: number, max: number) => min + Math.random() * (max - min)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface CompanionProps {
  id: CompanionId
  className?: string
  /** How a traced companion feels (default calm). PNG-only companions ignore it. */
  emotion?: Emotion
}

/**
 * Any companion in registry.ts. A companion with a traced rig shows its rig,
 * with an optional emotion; the others are animated from their PNG
 * (PngCompanion below).
 */
export function Companion({ id, className, emotion }: CompanionProps) {
  const def: CompanionDefinition = companionRegistry[id]
  if (def.Rig) return <def.Rig label={def.name} className={className} emotion={emotion} />
  return <PngCompanion def={def} className={className} />
}

/**
 * A companion from its PNG + anchors. The image is used as-is;
 * all motion is shared CSS (transforms only), so every companion gets it for free.
 *
 * - Always: an idle bounce, with a soft shadow under the feet.
 * - A random move (hop, wiggle-dance or turn around) soon after it appears, then
 *   every 5-7 s, and straight away when it's clicked or tapped.
 * - With "reduce motion" on: the idle bounce only.
 */
function PngCompanion({ def, className }: { def: CompanionDefinition; className?: string }) {
  const { name, image, anchors } = def
  const [move, setMove] = useState<Move | null>(null)
  const moveTimer = useRef(0)

  const play = useCallback(() => {
    if (reducedMotion()) return
    const next = MOVES[Math.floor(Math.random() * MOVES.length)]
    window.clearTimeout(moveTimer.current)
    // Clear first, then set on a later frame, so the same move can restart.
    setMove(null)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setMove(next)
        moveTimer.current = window.setTimeout(() => setMove(null), MOVE_MS[next])
      }),
    )
  }, [])

  // A random move soon after appearing, then every 5-7 s.
  useEffect(() => {
    let timer = window.setTimeout(function tick() {
      play()
      timer = window.setTimeout(tick, between(5000, 7000))
    }, FIRST_MOVE_MS)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(moveTimer.current)
    }
  }, [play])

  const vars = {
    '--feet-x': `${anchors.feet.x}%`,
    '--feet-y': `${anchors.feet.y}%`,
  } as CSSProperties

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} style={vars}>
      <button
        type="button"
        className={styles.root}
        data-move={move ?? undefined}
        onClick={play}
        aria-label={`Your companion: ${name}. Tap to play!`}
      >
        <span className={styles.shadow} aria-hidden="true" />
        <span className={styles.idle}>
          <span className={styles.move}>
            <span className={styles.spin}>
              <span className={styles.squash}>
                <img src={image} alt="" className={styles.image} draggable={false} />
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  )
}
