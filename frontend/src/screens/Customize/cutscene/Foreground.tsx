/**
 * Out-of-focus pieces right in front of the camera (the cutscene blurs them a
 * little in CSS). Only these get a blur, to keep it fast on old laptops.
 */

const DARK = '#3d2716'

/** A big pier post with a rope, for the pier shot. Drawn in its own 520 x 900 box; the post is at x 60..180. */
export function PierPost() {
  return (
    <svg width="520" height="900" viewBox="0 0 520 900" aria-hidden="true">
      <path d="M120 330 Q300 420 500 360" stroke={DARK} strokeWidth="10" fill="none" />
      <rect x="60" y="300" width="120" height="640" rx="18" fill="#8a5a34" stroke={DARK} strokeWidth="8" />
      <rect x="74" y="304" width="26" height="632" fill="#a46b3f" />
      <path d="M60 420 h120 M60 560 h120" stroke="#6d4526" strokeWidth="8" />
    </svg>
  )
}

/** Shore rocks (bottom-left) and a palm leaf (top-left), for the arrival shot. On the 1440 x 900 stage. */
export function ShoreFront() {
  return (
    <svg width="1440" height="900" viewBox="0 0 1440 900" aria-hidden="true">
      <g stroke={DARK} strokeWidth="7" strokeLinejoin="round">
        <path d="M-80 960 L-80 700 Q40 640 140 670 Q210 610 300 660 Q380 690 400 760 Q440 800 430 960Z" fill="#9b8b7a" />
        <path d="M60 690 Q120 670 170 700" fill="none" stroke="#c9bba9" strokeWidth="8" />
        <path d="M300 960 Q330 780 420 770 Q520 760 560 840 L580 960Z" fill="#857563" />
      </g>
      <g stroke="#2f5b2e" strokeWidth="6" strokeLinejoin="round">
        <path d="M-80 50 Q200 40 420 170 Q260 150 220 200 Q180 150 120 190 Q90 140 30 170 Q10 120 -80 140Z" fill="#4fa352" />
        <path d="M-80 90 Q180 80 400 168" fill="none" strokeWidth="5" />
      </g>
    </svg>
  )
}
