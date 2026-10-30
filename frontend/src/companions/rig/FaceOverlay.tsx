import type { EyeBox, RigFace } from './types'

const LASH = 30 // lash line along the lid's bottom edge, in SVG units
const TONGUE = '#F2858F'

/**
 * Drawn on top of a traced head, inside the head group (so it moves with it).
 * Everything starts hidden; useSpringRig sets the opacities and transforms
 * through the data-rig names.
 *
 * - Eyelids: a face-coloured rectangle with a lash line, clipped to each eye's
 *   own traced shapes, that slides down to blink.
 * - Happy eyes (^ ^), blush, simple drawn mouths, and the sleepy z's.
 */
export function FaceOverlay({
  face,
  eyePaths,
  id,
}: {
  face: RigFace
  /** Each eye's traced path data, for the lid's clip. */
  eyePaths: { left: string[]; right: string[] }
  /** Unique per rig, for the clip and gradient ids. */
  id: string
}) {
  const { outline, lid, blush } = face.colors
  const { x: mx, y: my } = face.mouth
  const w = Math.min(Math.max(face.mouth.w, 80), 140) // the axolotl's traced mouth is very wide
  const h = 55
  const smile = `M${mx - w},${my - h * 0.4} Q${mx},${my + h * 2.1} ${mx + w},${my - h * 0.4} Z`

  const eye = (side: 'left' | 'right', box: EyeBox) => {
    const name = side === 'left' ? 'Left' : 'Right'
    return (
      <g key={side} data-rig={`eye${name}`}>
        <g data-rig="eyesTraced" clipPath={`url(#${id}-lid-${side})`}>
          <g data-rig={`lid${name}`} transform={`translate(${box.cx} ${box.cy - box.ry - 30})`}>
            <rect x={-box.rx * 2.4} y={-box.ry * 2.6} width={box.rx * 4.8} height={box.ry * 2.6} fill={lid} />
            <rect x={-box.rx * 2.4} y={-LASH} width={box.rx * 4.8} height={LASH} fill={outline} />
          </g>
        </g>
      </g>
    )
  }

  return (
    <>
      <defs>
        {(['left', 'right'] as const).map((side) => (
          <clipPath key={side} id={`${id}-lid-${side}`}>
            {eyePaths[side].map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        ))}
        <clipPath id={`${id}-smile`}>
          <path d={smile} />
        </clipPath>
        <radialGradient id={`${id}-blush`}>
          <stop offset="0" stopColor={blush} stopOpacity="0.85" />
          <stop offset="0.6" stopColor={blush} stopOpacity="0.5" />
          <stop offset="1" stopColor={blush} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-rig="blush" opacity="0">
        {[face.cheeks.left, face.cheeks.right].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={150} ry={85} fill={`url(#${id}-blush)`} />
        ))}
      </g>

      {eye('left', face.eyes.left)}
      {eye('right', face.eyes.right)}

      <g data-rig="eyesHappy" opacity="0" fill="none" stroke={outline} strokeWidth={46} strokeLinecap="round">
        {[face.eyes.left, face.eyes.right].map((e, i) => (
          <g key={i} data-rig={i ? 'eyeRight' : 'eyeLeft'}>
            <path d={`M${e.cx - e.rx * 0.8},${e.cy + 40} Q${e.cx},${e.cy - e.ry * 0.75} ${e.cx + e.rx * 0.8},${e.cy + 40}`} />
          </g>
        ))}
      </g>

      <g data-rig="mouth-happy" opacity="0">
        <path d={smile} fill={outline} />
        <ellipse cx={mx} cy={my + h * 1.05} rx={w * 0.5} ry={h * 0.55} fill={TONGUE} clipPath={`url(#${id}-smile)`} />
      </g>
      <g data-rig="mouth-sad" opacity="0">
        <path
          d={`M${mx - w * 0.6},${my + h * 0.45} Q${mx},${my - h * 0.75} ${mx + w * 0.6},${my + h * 0.45}`}
          fill="none"
          stroke={outline}
          strokeWidth={34}
          strokeLinecap="round"
        />
      </g>
      <g data-rig="mouth-surprised" opacity="0">
        <ellipse cx={mx} cy={my + 10} rx={w * 0.34} ry={h * 0.8} fill={outline} />
      </g>
      <g data-rig="mouth-sleepy" opacity="0">
        <ellipse cx={mx} cy={my} rx={w * 0.2} ry={h * 0.32} fill={outline} />
      </g>

      {[0, 1, 2].map((i) => (
        <text
          key={i}
          data-rig="z"
          opacity="0"
          fill={outline}
          fontSize={420}
          fontWeight={800}
          fontFamily="inherit"
          textAnchor="middle"
        >
          z
        </text>
      ))}
    </>
  )
}
