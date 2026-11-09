import { Fragment, useId, useMemo, useRef } from 'react'
import type { AccessoryId } from '../setup/customizeData'
import { RigAccessories } from './rig/Accessories'
import { FaceOverlay } from './rig/FaceOverlay'
import {
  buildRecolor,
  isBuddyColorId,
  isDark,
  KEEP_GROUPS,
  recolorOne,
  type BuddyPalettes,
  type ColorKeys,
  type ColorTargets,
  type RigColors,
} from './rig/recolor'
import type { Emotion } from './rig/emotions'
import type { RigFace, RigPivots } from './rig/types'
import { useSpringRig } from './rig/useSpringRig'
import styles from './TracedRig.module.css'

export type { Emotion } from './rig/emotions'
export type { RigFace, RigPivots } from './rig/types'

/** One traced shape: [path data, fill colour, sub-group]. */
export type TracedPath = readonly [d: string, fill: string, group: string]
export type RigPart = 'head' | 'armLeft' | 'armRight' | 'legLeft' | 'legRight' | 'body' | 'belly'
export type RigParts = Record<RigPart, readonly TracedPath[]>

/** Head sub-groups that move on their own, and the data-rig name they get. */
const HEAD_GROUPS: Record<string, string> = {
  mouth: 'mouthTraced',
  hair: 'hair',
  earL: 'earLeft',
  earR: 'earRight',
  gillsL: 'earLeft', // the gills move like ears
  gillsR: 'earRight',
}

/** Which eye a traced eye shape belongs to: by where its outline starts. */
function eyeSide(d: string, face: RigFace): 'left' | 'right' | null {
  const start = /^M\s*(-?[\d.]+)[ ,](-?[\d.]+)/.exec(d)
  if (!start) return null
  const [x, y] = [Number(start[1]), Number(start[2])]
  for (const side of ['left', 'right'] as const) {
    const e = face.eyes[side]
    if (Math.abs(x - e.cx) <= e.rx + 15 && Math.abs(y - e.cy) <= e.ry + 15) return side
  }
  return null // a speck tagged as eyes: stays put
}

/** What a rig can wear and how it's colored (Customize Bridge). Rigs pass it straight to TracedRig. */
export interface RigLook {
  /** Avatar recolor (skin, hair, shirt). Needs the rig's colorKeys. */
  colors?: RigColors
  /** Accessories, drawn inside the head / body groups so they move with them. */
  extras?: readonly AccessoryId[]
  /** Buddy color: a customizeData buddyColor id (e.g. "mint"). Needs the rig's palettes; "original" = as drawn. */
  buddyColor?: string
  /** No animation: draw the resting pose once (small copies, e.g. icons). */
  still?: boolean
}

/** Draws traced shapes in their original order, wrapping runs of the same sub-group. */
function Shapes({
  paths,
  face,
  recolor,
}: {
  paths: readonly TracedPath[]
  face?: RigFace
  /** old fill -> new fill (Customize recolor) */
  recolor?: Map<string, string>
}) {
  // Eyes, nose and mouth always keep the art's colors.
  const shapes = (items: readonly TracedPath[]) =>
    items.map(([d, fill, group], j) => (
      <path key={j} d={d} fill={(!KEEP_GROUPS.has(group) && recolor?.get(fill)) || fill} />
    ))
  const runs: { group: string; items: TracedPath[] }[] = []
  for (const p of paths) {
    const last = runs.at(-1)
    if (last && last.group === p[2]) last.items.push(p)
    else runs.push({ group: p[2], items: [p] })
  }
  return (
    <>
      {runs.map(({ group, items }, i) => {
        if (face && group === 'eyes') {
          // Each eye in its own group, so it can glance, scale and fade.
          const left = items.filter(([d]) => eyeSide(d, face) === 'left')
          const right = items.filter(([d]) => eyeSide(d, face) === 'right')
          const other = items.filter(([d]) => eyeSide(d, face) === null)
          return (
            <Fragment key={i}>
              <g data-rig="eyeLeft">
                <g data-rig="eyesTraced">{shapes(left)}</g>
              </g>
              <g data-rig="eyeRight">
                <g data-rig="eyesTraced">{shapes(right)}</g>
              </g>
              {shapes(other)}
            </Fragment>
          )
        }
        const name = face && HEAD_GROUPS[group]
        return name ? (
          <g key={i} data-rig={name}>
            {shapes(items)}
          </g>
        ) : (
          <Fragment key={i}>{shapes(items)}</Fragment>
        )
      })}
    </>
  )
}

/**
 * A companion rigged from its PNG (cut into parts and traced with vtracer, see
 * scripts/rig-<animal>.mjs). Each companion passes its own traced parts, joint
 * positions and face (see rig/types.ts). All motion is springs, driven by
 * rig/useSpringRig.ts:
 *
 * - Always: breathing, a gentle sway with the head, arms, ears, gills and hair
 *   following a beat behind, blinks with an eyelid, and glances.
 * - A move (wave, dance or jump) soon after it appears, then every 5-7 s, and
 *   straight away when it's clicked or tapped.
 * - `emotion` (calm, happy, sad, surprised, sleepy) changes the face, posture
 *   and tempo, blending smoothly.
 * - With "reduce motion" on: breathing and blinks only (emotions still show).
 */
export function TracedRig({
  parts,
  pivots,
  face,
  label,
  className,
  emotion = 'calm',
  legsBehindBody = false,
  colorKeys,
  palettes,
  avatarEyes = false,
  colors,
  extras = [],
  buddyColor,
  still = false,
}: {
  parts: RigParts
  pivots: RigPivots
  face: RigFace
  label: string
  className?: string
  emotion?: Emotion
  /** Draw the legs behind the body, e.g. so a skirt stays over them when they step. */
  legsBehindBody?: boolean
  /** The rig's key colors (picked with scripts/list-fills.mjs): the avatar's for `colors`, a buddy's for its palettes. */
  colorKeys?: ColorKeys
  /** A buddy's tuned palette for each buddyColor. */
  palettes?: BuddyPalettes
  /** The boy and girl: a shine on the eyes, and a soft rim on the darkest skins. */
  avatarEyes?: boolean
} & RigLook) {
  const svgRef = useRef<SVGSVGElement>(null)
  const play = useSpringRig(svgRef, pivots, face, emotion, still)
  const id = 'rig' + useId().replace(/[^\w-]/g, '')

  // Customize recolor (avatar colors, or the buddy's palette): built once per look, not per frame.
  const { skin, hair, shirt } = colors ?? {}
  const targets = useMemo<ColorTargets>(
    () => (isBuddyColorId(buddyColor) && palettes ? palettes[buddyColor] : { skin, hair, shirt }),
    [buddyColor, palettes, skin, hair, shirt],
  )
  const recolor = useMemo(() => (colorKeys ? buildRecolor(parts, colorKeys, targets) : {}), [parts, colorKeys, targets])
  // The blink lid must match the recolored skin or fur, or blinks show the old color.
  const overlayFace = useMemo(() => {
    const lid = colorKeys ? recolorOne(face.colors.lid, colorKeys, targets) : face.colors.lid
    return lid === face.colors.lid ? face : { ...face, colors: { ...face.colors, lid } }
  }, [face, colorKeys, targets])
  // On the darkest skins the dark eyes need a soft rim to stand out.
  const eyeRim = avatarEyes && !!skin && isDark(skin)

  const eyePaths = useMemo(() => {
    const out = { left: [] as string[], right: [] as string[] }
    for (const [d, , group] of parts.head) {
      const side = group === 'eyes' && eyeSide(d, face)
      if (side) out[side].push(d)
    }
    return out
  }, [parts, face])

  const legs = (
    <>
      <g data-rig="legLeft">
        <Shapes paths={parts.legLeft} recolor={recolor.legLeft} />
      </g>
      <g data-rig="legRight">
        <Shapes paths={parts.legRight} recolor={recolor.legRight} />
      </g>
    </>
  )

  const svg = (
    <svg ref={svgRef} className={styles.svg} viewBox="0 0 5000 5000" aria-hidden="true" focusable="false">
      {/* root (hop, sway) > squash (landing) > parts */}
      <g data-rig="root">
        <g data-rig="squash">
          {legsBehindBody && legs}
          <g data-rig="body">
            <Shapes paths={parts.body} recolor={recolor.body} />
            <Shapes paths={parts.belly} recolor={recolor.belly} />
            <RigAccessories extras={extras} slot="body" face={face} pivots={pivots} />
          </g>
          {!legsBehindBody && legs}
          <g data-rig="head">
            <Shapes paths={parts.head} face={face} recolor={recolor.head} />
            <FaceOverlay face={overlayFace} eyePaths={eyePaths} id={id} shine={avatarEyes} rim={eyeRim} />
            <RigAccessories extras={extras} slot="head" face={face} pivots={pivots} />
          </g>
          {/* Arms in front, so the wave can pass over the cheek. */}
          <g data-rig="armLeft">
            <Shapes paths={parts.armLeft} recolor={recolor.armLeft} />
          </g>
          <g data-rig="armRight">
            <Shapes paths={parts.armRight} recolor={recolor.armRight} />
          </g>
        </g>
      </g>
    </svg>
  )

  // A still copy is just a picture: no button, nothing to tap or tab to.
  if (still) return <span className={[styles.root, styles.still, className].filter(Boolean).join(' ')}>{svg}</span>

  return (
    <button
      type="button"
      className={[styles.root, className].filter(Boolean).join(' ')}
      onClick={play}
      aria-label={`Your companion: ${label}. Tap to play!`}
    >
      {svg}
    </button>
  )
}
