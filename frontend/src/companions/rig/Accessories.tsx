import type { ReactNode } from 'react'
import type { AccessoryId } from '../../setup/customizeData'
import type { RigFace, RigPivots } from './types'

/** Where an accessory is drawn: inside the rig's head group, or its body group (so it moves with it). */
const ACCESSORY_SLOT: Record<AccessoryId, 'head' | 'body' | null> = {
  glasses: 'head',
  starClip: 'head',
  flowerYellow: 'head',
  bow: 'head',
  flowerPink: 'head',
  scarf: 'body',
  cap: null, // locked: tile icon only for now
  crown: null,
}

const INK = '#5b3a22'

/**
 * Accessories drawn in the rig's own 5000 x 5000 space. Every size comes from
 * the eye distance, so they fit every companion. Shapes from the Customize
 * mockup (cb.tpl.html), each drawn in its own small box and scaled up.
 */
export function RigAccessories({
  extras,
  slot,
  face,
  pivots,
}: {
  extras: readonly AccessoryId[]
  slot: 'head' | 'body'
  face: RigFace
  pivots: RigPivots
}) {
  const { left, right } = face.eyes
  const d = right.cx - left.cx // eye distance
  const midX = (left.cx + right.cx) / 2
  const eyeY = (left.cy + right.cy) / 2
  const [neckX, neckY] = pivots.neck

  /** Draws a small box's shapes with its centre at (x, y), `width` wide. */
  const place = (x: number, y: number, width: number, box: [w: number, h: number], children: ReactNode) => {
    const s = width / box[0]
    return (
      <g transform={`translate(${x - (box[0] * s) / 2} ${y - (box[1] * s) / 2}) scale(${s})`}>{children}</g>
    )
  }

  const flower = (petals: string) => (
    <>
      <g fill={petals} stroke={INK} strokeWidth="3">
        <circle cx="24" cy="10" r="9" />
        <circle cx="38" cy="22" r="9" />
        <circle cx="31" cy="38" r="9" />
        <circle cx="16" cy="38" r="9" />
        <circle cx="10" cy="22" r="9" />
      </g>
      <circle cx="24" cy="25" r="8" fill="#fbd34d" stroke={INK} strokeWidth="3" />
    </>
  )

  const draw = (id: AccessoryId) => {
    switch (id) {
      case 'glasses': {
        // Lens centres 80 apart in the mockup's box = the eye distance.
        const s = d / 80
        return (
          <g transform={`translate(${left.cx - 40 * s} ${eyeY - 32 * s}) scale(${s})`}>
            <g fill="rgba(255,255,255,.25)" stroke={INK} strokeWidth="6">
              <circle cx="40" cy="32" r="28" />
              <circle cx="120" cy="32" r="28" />
            </g>
            <path d="M68 30 q12-8 24 0" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          </g>
        )
      }
      case 'starClip':
        return place(
          midX - 0.7 * d,
          eyeY - 0.84 * d,
          0.5 * d,
          [44, 44],
          <path
            d="M22 3l5 12 13 1-10 8 4 13-12-7-12 7 4-13-10-8 13-1z"
            fill="#fbd34d"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />,
        )
      case 'flowerYellow':
        return place(midX - 0.7 * d, eyeY - 0.84 * d, 0.56 * d, [48, 48], flower('#fff'))
      case 'flowerPink':
        return place(midX + 0.7 * d, eyeY - 0.82 * d, 0.56 * d, [48, 48], flower('#ffb3c7'))
      case 'bow':
        return place(
          midX,
          eyeY - 0.9 * d,
          0.85 * d,
          [84, 50],
          <>
            <path
              d="M42 25 L6 6 Q0 25 6 44 Z M42 25 L78 6 Q84 25 78 44Z"
              fill="#7aa8f0"
              stroke={INK}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <circle cx="42" cy="25" r="9" fill="#9cc0f7" stroke={INK} strokeWidth="4" />
          </>,
        )
      case 'scarf': {
        // Band across the neck, tail hanging on the right.
        const width = 1.35 * d
        const s = width / 112
        return (
          <g transform={`translate(${neckX - 62 * s} ${neckY - 22 * s}) scale(${s})`}>
            <path
              d="M6 16 Q62 40 118 16 L118 34 Q62 58 6 34Z"
              fill="#7fd1b0"
              stroke={INK}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M78 40 L70 90 L92 86 L92 38Z" fill="#7fd1b0" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M20 24 Q62 44 104 24" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="6 8" opacity=".8" />
          </g>
        )
      }
      default:
        return null
    }
  }

  const mine = extras.filter((id) => ACCESSORY_SLOT[id] === slot)
  if (!mine.length) return null
  return (
    <g data-accessories={slot}>
      {mine.map((id) => (
        <g key={id}>{draw(id)}</g>
      ))}
    </g>
  )
}
