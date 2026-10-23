import styles from './SceneBackground.module.css'

/*
 * The sea, drawn as one inline SVG that fills the scene from the horizon to
 * the bottom edge.
 *
 * Coordinates: 1600 wide (= 100% of the width), 480 tall (= the bottom 48% of
 * the scene), so 10 units = 1% of the scene's height. That is the same scale
 * as ground.svg (1600 x 300 for the bottom 30%), so the shoreline here can
 * follow the sand's edge exactly: a ground.svg y is this y minus 180.
 */

// Sand's top edge (ground.svg's first path, moved down by 180).
const SHORE = 'M0 250 C300 220 700 240 1000 250 C1250 258 1450 220 1600 200'
const shoreY = (x: number) => {
  // Same two curves, sampled; accurate to a unit or two, which is plenty.
  const seg = (p: number[][], t: number) =>
    (1 - t) ** 3 * p[0][1] + 3 * (1 - t) ** 2 * t * p[1][1] + 3 * (1 - t) * t ** 2 * p[2][1] + t ** 3 * p[3][1]
  const segX = (p: number[][], t: number) =>
    (1 - t) ** 3 * p[0][0] + 3 * (1 - t) ** 2 * t * p[1][0] + 3 * (1 - t) * t ** 2 * p[2][0] + t ** 3 * p[3][0]
  const a = [[0, 250], [300, 220], [700, 240], [1000, 250]]
  const b = [[1000, 250], [1250, 258], [1450, 220], [1600, 200]]
  const p = x <= 1000 ? a : b
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (segX(p, mid) < x) lo = mid
    else hi = mid
  }
  return seg(p, lo)
}

// Small seeded random, so the layout is the same on every render and build.
let seed = 11
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const r1 = (n: number) => Math.round(n * 10) / 10

// Places to keep clear: under the island (left) and the sailboat (right).
const busy = (x: number, y: number) => (x < 300 && y < 60) || (x > 1440 && x < 1570 && y < 50)

// Wave marks ("~"): small and sparse near the horizon, bigger and more
// frequent toward the shore. Split into two groups that drift out of step.
type Wave = { x: number; y: number; s: number; o: number }
const waves: Wave[] = []
for (let tries = 0; waves.length < 46 && tries < 4000; tries++) {
  const depth = Math.sqrt(rnd()) // biased toward 1 (= near the shore)
  const x = 20 + rnd() * 1560
  const y = 14 + depth * (shoreY(x) - 40 - 14)
  if (y < 10 || busy(x, y)) continue
  const s = 0.45 + 1.15 * (y / 230) // size grows toward the shore
  if (waves.some((w) => Math.abs(w.x - x) < 70 * Math.max(s, w.s) && Math.abs(w.y - y) < 16 * Math.max(s, w.s))) continue
  waves.push({ x, y, s, o: 0.5 + 0.35 * (y / 230) })
}
const wavePath = ({ x, y, s }: Wave) => {
  const w = 14 * s
  const h = 3.4 * s
  return `M${r1(x - w)} ${r1(y)} q${r1(w / 2)} ${r1(-h)} ${r1(w)} 0 t${r1(w)} 0`
}

// Sparkles: short white dashes, mostly under the sun (right side).
const sparkles: { x: number; y: number; w: number }[] = []
for (let tries = 0; sparkles.length < 14 && tries < 2000; tries++) {
  const underSun = sparkles.length < 11
  const x = underSun ? 1250 + rnd() * 320 : 450 + rnd() * 700
  const y = 12 + rnd() * (underSun ? 150 : 120)
  if (busy(x, y) || y > shoreY(x) - 45) continue
  sparkles.push({ x, y, w: 6 + rnd() * 10 })
}

// Foam line: the shore curve with a small scallop wobble.
const foamPath = (() => {
  const pts: [number, number][] = []
  for (let x = -20; x <= 1620; x += 24) pts.push([x, shoreY(Math.max(0, Math.min(1600, x))) - 5 + 2.4 * Math.sin(x / 24 * 2.1)])
  let d = `M${pts[0][0]} ${r1(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q${pts[i][0]} ${r1(pts[i][1])} ${r1(mx)} ${r1(my)}`
  }
  return d
})()

// Island (left: -2%, 19vw wide, base ~30 units below the horizon) and
// sailboat (right: 3%, 6vw wide, hull ~25 units below the horizon).
const reflections = [
  // island: soft green-tinted glow + ripple lines
  { kind: 'glow', cx: 120, cy: 40, rx: 160, ry: 12, fill: '#BFE6D2' },
  { kind: 'line', d: 'M10 44 h120 M160 44 h70 M40 54 h90 M150 55 h50 M70 64 h70' },
  // sailboat: pale glow + two short ripples
  { kind: 'glow', cx: 1504, cy: 28, rx: 52, ry: 7, fill: '#DDF3FB' },
  { kind: 'line', d: 'M1468 29 h34 M1512 30 h26 M1480 37 h44' },
] as const

const half = Math.ceil(waves.length / 2)

export function Sea() {
  return (
    <svg className={styles.sea} viewBox="0 0 1600 480" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* Hazy pale blue at the horizon -> deeper blue toward the shore. */}
        <linearGradient id="sea-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A8DDF1" />
          <stop offset="0.12" stopColor="#8ED1EE" />
          <stop offset="0.45" stopColor="#6CC2E8" />
          <stop offset="1" stopColor="#52B0DD" />
        </linearGradient>
        <filter id="sea-soft" x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <rect width="1600" height="480" fill="url(#sea-depth)" />

      {/* Soft pale line where the sea meets the sky */}
      <rect y="0" width="1600" height="7" fill="#E6F6FC" opacity="0.6" filter="url(#sea-soft)" />
      <rect y="0" width="1600" height="1.6" fill="#F2FBFE" opacity="0.9" />

      {/* Reflections under the island and the sailboat */}
      <g filter="url(#sea-soft)">
        {reflections.map((r, i) =>
          r.kind === 'glow' ? <ellipse key={i} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={r.fill} opacity="0.55" /> : null,
        )}
      </g>
      <g stroke="#EAF8FD" strokeWidth="2" strokeLinecap="round" opacity="0.75">
        {reflections.map((r, i) =>
          r.kind === 'line' ? <path key={i} d={r.d} vectorEffect="non-scaling-stroke" /> : null,
        )}
      </g>

      {/* Sparkles */}
      <g stroke="#FFFFFF" strokeLinecap="round" opacity="0.85">
        {sparkles.map((s, i) => (
          <path key={i} d={`M${r1(s.x)} ${r1(s.y)} h${r1(s.w)}`} strokeWidth={s.w > 11 ? 2 : 1.5} vectorEffect="non-scaling-stroke" />
        ))}
      </g>

      {/* Wave marks, in two groups that drift slowly out of step */}
      {[waves.slice(0, half), waves.slice(half)].map((group, g) => (
        <g key={g} className={g === 0 ? styles.waveDriftA : styles.waveDriftB} fill="none" stroke="#F4FBFE" strokeLinecap="round">
          {group.map((w, i) => (
            <path
              key={i}
              d={wavePath(w)}
              opacity={r1(w.o * 10) / 10}
              strokeWidth={r1(1.2 + w.s * 0.9)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}

      {/* Shoreline: soft light-cyan band, then a wavy white foam line.
          The sand (ground.svg) is drawn on top and hides everything below it. */}
      <path d={`${SHORE} L1600 480 L0 480 Z`} transform="translate(0 -26)" fill="#B9E8F4" opacity="0.75" filter="url(#sea-soft)" />
      <path d={foamPath} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" vectorEffect="non-scaling-stroke" />
      <path d={foamPath} transform="translate(0 -9)" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="14 22" opacity="0.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
