import styles from './BridgeCutscene.module.css'

const INK = '#5b3a22'

/** The sea set's moving layers (the cutscene's clock moves them). */
export type SeaPart = 'clouds' | 'farIsland' | 'gulls' | 'gull0' | 'gull1' | 'gull2' | 'wavesFar' | 'wavesMid' | 'wavesNear'
export type Bind<Name extends string> = (name: Name) => (el: HTMLElement | SVGElement | null) => void

/** A row of little white wave marks, wide enough to scroll a long way. */
function WaveRow({ y, gap, opacity, width }: { y: number; gap: number; opacity: number; width: number }) {
  return (
    <svg className={styles.waveRow} width="4400" height="900" viewBox="0 0 4400 900" aria-hidden="true">
      <g stroke="#fff" strokeWidth={width} strokeLinecap="round" fill="none" opacity={opacity}>
        {Array.from({ length: Math.ceil(4400 / gap) }, (_, i) => (
          <path key={i} d={`M${i * gap + ((i * 37) % 60)} ${y + ((i * 53) % 40)} q12 -8 24 0 t24 0`} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The open sea for the sailing shot, on the 1440 x 900 stage. Layers scroll at
 * different speeds for depth: clouds and far Rene Island slowly, the gulls a
 * bit faster, and three rows of waves faster and faster toward the camera.
 */
export function SeaSet({ bind }: { bind: Bind<SeaPart> }) {
  return (
    <>
      <svg className={`${styles.layer} ${styles.moving}`} width="1440" height="900" viewBox="0 0 1440 900" aria-hidden="true">
        <defs>
          <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0ee" />
            <stop offset="1" stopColor="#d6f1fb" />
          </linearGradient>
          <linearGradient id="cs-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ac4e5" />
            <stop offset="1" stopColor="#3499c9" />
          </linearGradient>
        </defs>
        <rect x="-200" y="-200" width="1840" height="620" fill="url(#cs-sky)" />
        <rect x="-200" y="418" width="1840" height="700" fill="url(#cs-sea)" />
        <path d="M-200 419H1640" stroke="#c4e9f7" strokeWidth="6" />
        <g transform="translate(250,175)">
          <circle r="56" fill="#fbe38a" />
          <circle r="44" cx="-6" cy="-6" fill="#fdeca6" />
        </g>
      </svg>

      <div ref={bind('clouds')} className={`${styles.layer} ${styles.moving}`}>
        <svg width="2400" height="400" viewBox="0 0 2400 400" aria-hidden="true">
          <g fill="#fff">
            {[
              [520, 150, 1],
              [1100, 90, 0.8],
              [1700, 190, 1.1],
              [2200, 110, 0.9],
            ].map(([x, y, s]) => (
              <g key={x} transform={`translate(${x},${y}) scale(${s})`}>
                <ellipse rx="80" ry="22" />
                <ellipse cx="-28" cy="-16" rx="36" ry="24" />
                <ellipse cx="20" cy="-22" rx="40" ry="30" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Rene Island, far away on the horizon, in a soft haze */}
      <div ref={bind('farIsland')} className={styles.farIsland}>
        <svg width="260" height="80" viewBox="0 0 260 80" aria-hidden="true">
          <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
            <path d="M0 68 Q40 40 130 36 Q220 38 260 68Z" fill="#9ed36f" />
            <path d="M120 40 L150 18 L180 40Z" fill="#ec6d5c" />
            <rect x="126" y="40" width="48" height="24" fill="#fbf1de" />
            <path d="M44 56 Q42 36 48 22" stroke="#8a5a34" strokeWidth="5" fill="none" />
            <path d="M48 22 q-18-2-26 8 q14 0 26-8z M48 22 q16-6 26 4 q-14 0-26-4z" fill="#5cb85f" />
            <path d="M222 62 L226 26 L238 26 L242 62Z" fill="#fff" />
            <rect x="224" y="18" width="16" height="9" fill="#fbe38a" />
          </g>
        </svg>
      </div>

      <div ref={bind('gulls')} className={`${styles.layer} ${styles.moving}`}>
        <svg width="1440" height="900" viewBox="0 0 1440 900" aria-hidden="true">
          <g stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path ref={bind('gull0')} className={styles.gull} d="M900 210 q14-14 26 0 q12-14 26 0" />
            <path ref={bind('gull1')} className={styles.gull} d="M980 250 q10-10 20 0 q10-10 20 0" />
            <path ref={bind('gull2')} className={styles.gull} d="M1060 190 q8-8 16 0 q8-8 16 0" />
          </g>
        </svg>
      </div>

      <div ref={bind('wavesFar')} className={`${styles.layer} ${styles.moving}`}>
        <WaveRow y={470} gap={140} opacity={0.5} width={2.5} />
      </div>
      <div ref={bind('wavesMid')} className={`${styles.layer} ${styles.moving}`}>
        <WaveRow y={600} gap={170} opacity={0.6} width={3.5} />
      </div>
      <div ref={bind('wavesNear')} className={`${styles.layer} ${styles.moving}`}>
        <WaveRow y={780} gap={220} opacity={0.75} width={5} />
      </div>
    </>
  )
}

/** The big front waves, closest to the camera: drawn in front of the boat, moving fastest. */
export function FrontWaves() {
  const crests = Array.from({ length: 34 }, () => 'q40 -34 80 0 t80 0').join(' ')
  return (
    <svg width="5600" height="900" viewBox="0 0 5600 900" aria-hidden="true">
      <path d={`M0 800 ${crests} V1000 H0Z`} fill="#3a9dcb" />
      <path d={`M0 800 ${crests}`} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".85" />
    </svg>
  )
}
