// Eye styles for FaceOverlay (the wardrobe kids' Sparkly and Lashes eyes).
// All sizes are in SVG units of the 5000 x 5000 rig canvas.

/** Extra shine for Sparkly eyes: inside the eye's lid clip (so a blink covers it). */
export function EyeSparkle({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const star = (x: number, y: number, r: number) =>
    `M${x},${y - r} Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y} Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r} Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y} Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r} Z`
  return (
    <>
      <ellipse cx={cx} cy={cy + ry * 0.62} rx={rx * 0.78} ry={ry * 0.28} fill="#ffffff" opacity={0.22} />
      <path d={star(cx + rx * 0.32, cy + ry * 0.18, rx * 0.36)} fill="#fff" />
      <circle cx={cx - rx * 0.38} cy={cy + ry * 0.48} r={rx * 0.1} fill="#fff" opacity={0.85} />
    </>
  )
}

/** Lashes at the outer top corner of each eye (outside the lid clip: they stay on a blink), in the outline color. */
export function EyeLashes({
  side,
  cx,
  cy,
  rx,
  ry,
  ink,
}: {
  side: 'left' | 'right'
  cx: number
  cy: number
  rx: number
  ry: number
  ink: string
}) {
  const s = side === 'left' ? -1 : 1
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return [cx + s * rx * Math.cos(a) * 1.02, cy - ry * Math.sin(a) * 1.02] as const
  }
  const lash = (deg: number, len: number, tilt: number, key: number) => {
    const [x, y] = at(deg)
    const a = (tilt * Math.PI) / 180
    const ex = x + s * Math.cos(a) * len
    const ey = y - Math.sin(a) * len
    return (
      <path
        key={key}
        d={`M${x},${y} Q${(x + ex) / 2 + s * 10},${(y + ey) / 2 + 30} ${ex},${ey}`}
        fill="none"
        stroke={ink}
        strokeWidth={34}
        strokeLinecap="round"
      />
    )
  }
  return <>{[lash(28, 150, 20, 0), lash(55, 130, 48, 1)]}</>
}
