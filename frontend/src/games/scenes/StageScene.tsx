/**
 * Quiz Show's theater stage, drawn at 1440x900 and filling the window
 * (cropped, never stretched): red curtains with gold tie-backs, a scalloped
 * valance with gold dots, a purple back wall with light rays, a wooden floor,
 * a purple rug and footlights.
 */
const c = (name: string) => `var(--color-${name})`

function Curtain({ flip }: { flip?: boolean }) {
  return (
    <g transform={flip ? 'translate(1440 0) scale(-1 1)' : undefined}>
      {/* The gold edge of the stage, behind the curtain. */}
      <path d="M0 548 L250 540 L250 590 L0 600 Z" fill={c('stage-gold')} stroke={c('card-border')} strokeWidth="3" />
      <path
        d="M0 60 H232 C206 210 160 360 196 520 C204 556 178 584 150 592 C176 650 212 780 236 900 H0 Z"
        fill={c('stage-curtain')}
        stroke={c('card-border')}
        strokeWidth="3.5"
      />
      {/* Folds */}
      <path d="M58 70 C70 260 64 430 84 560 C96 680 100 800 92 900" stroke={c('stage-curtain-dark')} strokeWidth="9" fill="none" opacity="0.55" />
      <path d="M128 70 C136 230 118 400 136 560" stroke={c('stage-curtain-dark')} strokeWidth="7" fill="none" opacity="0.5" />
      <path d="M170 600 C186 700 196 800 204 900" stroke={c('stage-curtain-dark')} strokeWidth="7" fill="none" opacity="0.45" />
      <path d="M24 70 C36 300 26 600 40 900" stroke={c('stage-curtain-light')} strokeWidth="10" fill="none" opacity="0.6" />
      <path d="M98 80 C104 260 92 440 108 560" stroke={c('stage-curtain-light')} strokeWidth="6" fill="none" opacity="0.55" />
      {/* Gold tie-back */}
      <path d="M8 560 C60 600 120 606 196 572 L204 594 C130 632 56 628 2 588 Z" fill={c('stage-gold')} stroke={c('card-border')} strokeWidth="3" />
      <circle cx="196" cy="584" r="13" fill={c('stage-gold')} stroke={c('card-border')} strokeWidth="3" />
    </g>
  )
}

export function StageScene() {
  const rays = [-62, -40, -18, 4, 26, 48]
  const footlights = Array.from({ length: 12 }, (_, i) => 60 + i * 120)
  const scallops = Array.from({ length: 17 }, (_, i) => i * 90)
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* Back wall and light rays */}
      <rect width="1440" height="900" fill={c('stage-wall')} />
      {rays.map((a) => (
        <path key={a} d="M720 40 L-80 640 L60 640 Z" fill={c('stage-wall-light')} opacity="0.55" transform={`rotate(${a + 20} 720 40)`} />
      ))}

      {/* Stage floor */}
      <path d="M0 590 H1440 V900 H0 Z" fill={c('stage-floor')} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${160 + i * 140} 590 L${-60 + i * 195} 900`} stroke={c('stage-floor-dark')} strokeWidth="2.5" opacity="0.55" />
      ))}
      <path d="M0 590 H1440" stroke={c('card-border')} strokeWidth="3" />

      {/* Purple rug */}
      <path d="M262 664 H1180 L1330 850 H110 Z" fill={c('stage-rug')} stroke={c('stage-rug-edge')} strokeWidth="4" />
      <path d="M286 684 H1158 L1286 832 H156 Z" fill="none" stroke={c('input-bg')} strokeWidth="2.5" strokeDasharray="5 9" opacity="0.8" />

      {/* Footlights */}
      <rect y="862" width="1440" height="38" fill={c('stage-foot-base')} />
      <path d="M0 862 H1440" stroke={c('card-border')} strokeWidth="3" />
      {footlights.map((x) => (
        <g key={x}>
          <circle cx={x} cy="886" r="25" fill={c('stage-floor-dark')} opacity="0.55" />
          <circle cx={x} cy="886" r="10" fill={c('game-bulb')} stroke={c('card-border')} strokeWidth="2.5" />
        </g>
      ))}

      <Curtain />
      <Curtain flip />

      {/* Valance: red band, gold trim, scallops with gold dots */}
      <rect width="1440" height="58" fill={c('stage-curtain')} />
      <path d="M0 58 H1440" stroke={c('stage-gold')} strokeWidth="6" />
      {scallops.map((x) => (
        <g key={x}>
          <path d={`M${x} 60 Q${x + 45} 122 ${x + 90} 60 Z`} fill={c('stage-curtain')} stroke={c('card-border')} strokeWidth="3" />
          <circle cx={x + 45} cy="95" r="7" fill={c('stage-gold')} stroke={c('card-border')} strokeWidth="2.5" />
        </g>
      ))}
    </svg>
  )
}
