/**
 * Match Up's room: the classroom's Match Corner, drawn at 1440x900 and filling
 * the window (cropped, never stretched): a cream wall with wood paneling, two
 * sea windows, bunting across the top, a wooden floor and a big round teal rug.
 */
const c = (name: string) => `var(--color-${name})`

const FLAGS = [
  'game-wrong',
  'game-bulb',
  'game-letter-b',
  'game-letter-d',
  'game-letter-c',
  'game-wrong',
  'game-bulb',
]

function Window({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="180" width="202" height="268" rx="14" fill={c('room-window')} stroke={c('card-border')} strokeWidth="4" />
      <rect x="16" y="196" width="170" height="236" rx="6" fill={c('sky')} stroke={c('card-border')} strokeWidth="3" />
      <circle cx="141" cy="250" r="24" fill={c('game-bulb')} />
      <path d="M16 318 H186 V432 H16 Z" fill={c('sea')} />
      <path d="M16 318 H186" stroke={c('card-border')} strokeWidth="3" />
      <ellipse cx="70" cy="340" rx="54" ry="11" fill={c('game-letter-b')} opacity="0.8" />
      <path d="M100 344 q18 -8 36 0 t36 0" stroke={c('room-window')} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M101 196 V432" stroke={c('card-border')} strokeWidth="5" />
      <rect x="-12" y="440" width="226" height="20" rx="6" fill={c('room-panel')} stroke={c('card-border')} strokeWidth="3" />
    </g>
  )
}

export function MatchCornerScene() {
  const flags = Array.from({ length: 17 }, (_, i) => i)
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1440" height="900" fill={c('room-wall')} />

      {/* Wood paneling */}
      <rect y="462" width="1440" height="148" fill={c('room-panel')} />
      {Array.from({ length: 30 }, (_, i) => (
        <path key={i} d={`M${24 + i * 50} 474 V600`} stroke={c('room-panel-line')} strokeWidth="2.5" />
      ))}
      <rect y="456" width="1440" height="14" fill={c('room-panel')} stroke={c('card-border')} strokeWidth="3" />
      <path d="M0 606 H1440" stroke={c('card-border')} strokeWidth="3" />

      {/* Floor */}
      <rect y="608" width="1440" height="292" fill={c('room-floor')} />
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M${120 * i - 40} 608 L${170 * i - 340} 900`} stroke={c('room-floor-line')} strokeWidth="2.5" opacity="0.7" />
      ))}

      <Window x={50} />
      <Window x={1180} />

      {/* Big round rug */}
      <ellipse cx="720" cy="770" rx="660" ry="104" fill={c('room-rug')} stroke={c('game-match-edge')} strokeWidth="4" />
      <ellipse cx="720" cy="766" rx="600" ry="80" fill="none" stroke={c('room-rug-light')} strokeWidth="2.5" />
      <ellipse cx="720" cy="770" rx="632" ry="92" fill="none" stroke={c('room-window')} strokeWidth="2.5" strokeDasharray="5 10" opacity="0.85" />

      {/* Bunting */}
      <path d="M-20 82 Q720 132 1460 82" stroke={c('card-border')} strokeWidth="3" fill="none" />
      {flags.map((i) => {
        const x = 40 + i * 85
        const t = x / 1440
        const y = 82 + 4 * 50 * t * (1 - t) // follows the string's sag
        return (
          <path
            key={i}
            d={`M${x - 24} ${y} L${x + 24} ${y} L${x} ${y + 46} Z`}
            fill={c(FLAGS[i % FLAGS.length])}
            stroke={c('card-border')}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
}
