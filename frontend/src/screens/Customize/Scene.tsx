import type { ReactNode, Ref } from 'react'

/** Where the boat sails, in stage coordinates (1440 x 900): from the pier's end to Rene Island. */
const SAIL_PATH = 'M930 640 Q1060 610 1080 520 Q1090 486 1060 466'

const INK = '#5b3a22'
const TRUNK = '#8a5a34'
const LEAF = '#5cb85f'

/**
 * The Customize Bridge's scene, drawn on the 1440 x 900 stage (shapes from the
 * mockup, cb.tpl.html): sky, sun, clouds, sea, Rene Island (palms, campfire
 * tent, classroom house, lighthouse), the dotted sail path and a short pier.
 * The sky, sea and pier run far past the stage's edges (overflow visible), so
 * any window shape is filled with no bars.
 */
export function Scene({ className, pathRef, hidePath }: { className?: string; pathRef?: Ref<SVGPathElement>; hidePath?: boolean }) {
  return (
    <svg className={className} width="1440" height="900" viewBox="0 0 1440 900" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8fd0ee" />
          <stop offset="1" stopColor="#cdeefa" />
        </linearGradient>
        <linearGradient id="cb-sea" x1="0" y1="468" x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#63c0e3" />
          <stop offset="1" stopColor="#3ea7d4" />
        </linearGradient>
      </defs>

      {/* Sky and sea, extended well past the stage */}
      <rect x="-3000" y="-3000" width="7440" height="3470" fill="url(#cb-sky)" />
      <rect x="-3000" y="468" width="7440" height="3432" fill="url(#cb-sea)" />
      <path d="M-3000 468H4440" stroke="#bfe7f6" strokeWidth="5" />

      {/* Sun */}
      <g transform="translate(1300,96)">
        <path
          d="M0-78v-14M0 78v14M-78 0h-14M78 0h14M-55-55l-10-10M55 55l10 10M-55 55l-10 10M55-55l10-10"
          stroke="#f7d26a"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle r="52" fill="#fbe38a" />
        <circle r="40" cx="-6" cy="-6" fill="#fdeca6" />
      </g>

      {/* Clouds */}
      <g fill="#fff">
        <g transform="translate(980,120)">
          <ellipse rx="70" ry="22" />
          <ellipse cx="-28" cy="-16" rx="34" ry="24" />
          <ellipse cx="18" cy="-22" rx="38" ry="28" />
        </g>
        <g transform="translate(160,250)" opacity=".9">
          <ellipse rx="80" ry="20" />
          <ellipse cx="-20" cy="-14" rx="36" ry="22" />
          <ellipse cx="26" cy="-18" rx="34" ry="24" />
        </g>
      </g>

      {/* Little waves */}
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" fill="none">
        <path d="M90 520q10-6 20 0t20 0" />
        <path d="M1080 560q10-6 20 0t20 0" />
        <path d="M1300 600q10-6 20 0t20 0" />
        <path d="M640 540q10-6 20 0t20 0" />
        <path d="M1160 700q10-6 20 0t20 0" />
        <path d="M1350 760q10-6 20 0t20 0" />
      </g>

      {/* ---------- Rene Island ---------- */}
      <g>
        <ellipse cx="1150" cy="476" rx="292" ry="26" fill="#bfe7f6" opacity=".9" />
        <path
          d="M870 470 Q900 420 1000 404 Q1150 384 1300 400 Q1410 414 1430 470 Z"
          fill="#f3dca8"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M900 452 Q930 410 1010 398 Q1150 378 1290 394 Q1380 406 1400 452 Q1300 440 1150 444 Q1000 440 900 452Z"
          fill="#9ed36f"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Palms at the back */}
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M968 420 Q962 380 972 340" fill="none" stroke={TRUNK} strokeWidth="7" strokeLinecap="round" />
          <path
            d="M972 340 q-30-6-46 14 q24-4 46-14zM972 340 q28-10 46 8 q-24 0-46-8zM972 340 q-6-26 14-38 q2 22-14 38zM972 340 q-26-20-44-12 q22 2 44 12z"
            fill={LEAF}
          />
          <path d="M1398 426 Q1404 386 1392 350" fill="none" stroke={TRUNK} strokeWidth="7" strokeLinecap="round" />
          <path
            d="M1392 350 q-30-6-46 14 q24-4 46-14zM1392 350 q28-10 46 8 q-24 0-46-8zM1392 350 q-6-26 14-38 q2 22-14 38z"
            fill={LEAF}
          />
        </g>
        {/* Campfire tent + campfire */}
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M1000 432 L1042 370 L1084 432 Z" fill="#f29a4a" />
          <path d="M1042 370 L1084 432 L1104 424 L1064 364 Z" fill="#d97a2e" />
          <path d="M1034 432 L1042 404 L1050 432Z" fill={INK} />
        </g>
        <g transform="translate(1110,436)">
          <path d="M-12 2h24" stroke={TRUNK} strokeWidth="5" strokeLinecap="round" />
          <path d="M0-22 q10 10 6 18 q-6 6-12 0 q-4-8 6-18z" fill="#f6a03c" stroke={INK} strokeWidth="2.5" />
          <path d="M0-12 q4 4 2 8 q-3 2-5 0 q-1-4 3-8z" fill="#fbe38a" />
        </g>
        {/* Classroom house */}
        <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <rect x="1150" y="358" width="130" height="78" fill="#fbf1de" />
          <path d="M1138 362 L1215 306 L1292 362 Z" fill="#ec6d5c" />
          <rect x="1200" y="290" width="30" height="34" fill="#fbf1de" />
          <path d="M1194 292 L1215 272 L1236 292Z" fill="#ec6d5c" />
          <rect x="1202" y="392" width="26" height="44" fill="#6cbf6a" />
          <rect x="1162" y="376" width="26" height="22" fill="#9fd8ee" />
          <rect x="1242" y="376" width="26" height="22" fill="#9fd8ee" />
        </g>
        <path d="M1215 272 V252" stroke={INK} strokeWidth="3" />
        <path d="M1215 252 l18 6 -18 6z" fill="#f0a050" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        {/* Lighthouse */}
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M1326 432 L1334 336 L1358 336 L1366 432Z" fill="#fff" />
          <path d="M1330 386 L1362 386 L1364 408 L1328 408Z M1333 346 L1359 346 L1360 366 L1332 366Z" fill="#ec6d5c" stroke="none" />
          <path d="M1326 432 L1334 336 L1358 336 L1366 432Z" fill="none" />
          <rect x="1330" y="318" width="32" height="18" fill="#fbe38a" />
          <path d="M1326 320 L1346 302 L1366 320Z" fill="#ec6d5c" />
        </g>
        {/* Small palm in front */}
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M1112 444 Q1108 410 1118 380" fill="none" stroke={TRUNK} strokeWidth="6" strokeLinecap="round" />
          <path
            d="M1118 380 q-26-4-40 12 q20-2 40-12zM1118 380 q24-8 40 6 q-20 0-40-6zM1118 380 q-4-22 12-32 q2 18-12 32z"
            fill={LEAF}
          />
        </g>
      </g>

      {/* Dotted sail path, boat -> island */}
      <path
        ref={pathRef}
        d={SAIL_PATH}
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="1 16"
        opacity={hidePath ? 0 : 0.9}
        style={{ transition: 'opacity .4s' }}
      />

      {/* ---------- Short pier from the left (runs off the stage's left edge) ---------- */}
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <g fill="#a46b3f">
          {[-320, -130, 60, 250, 440, 630].map((x) => (
            <rect key={x} x={x} y="640" width="26" height="200" />
          ))}
          <rect x="760" y="640" width="26" height="160" />
        </g>
        <path d="M-3000 590 L800 590 L800 650 L-3000 650 Z" fill="#d9a066" />
        <path
          d="M-300 592 L-312 648M-210 592 L-220 648M-120 592 L-128 648M-30 592 L-36 648M60 592 L48 648M150 592 L140 648M240 592 L232 648M330 592 L324 648M420 592 L416 648M510 592 L508 648M600 592 L600 648M690 592 L692 648"
          stroke="#a46b3f"
          strokeWidth="3"
        />
        <path d="M-3000 590 L800 590" />
        <path d="M-3000 650 L800 650 L800 670 L-3000 670Z" fill="#b97c49" />
        <rect x="776" y="548" width="26" height="110" rx="6" fill="#a46b3f" />
        <path d="M790 566 Q830 600 870 600" fill="none" strokeWidth="3" />
      </g>
    </svg>
  )
}

/** The sailboat (mockup shapes). `seats` holds the small riders while it sails. */
export function Boat({ seats }: { seats?: ReactNode }) {
  return (
    <>
      <svg width="260" height="210" viewBox="0 0 260 210" style={{ overflow: 'visible', display: 'block' }} aria-hidden="true">
        <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <path d="M126 20 V150" fill="none" strokeWidth="5" />
          <path d="M120 30 L44 140 L120 140 Z" fill="#fbe7b0" />
          <path d="M132 24 L214 140 L132 140 Z" fill="#fff" />
          <path d="M126 20 L150 10 L126 2 Z" fill="#f0a050" />
          <path d="M20 148 L240 148 L214 196 L46 196 Z" fill="#f0a050" />
          <path d="M30 162 L232 162" stroke="#fff" strokeWidth="5" />
          <circle cx="80" cy="178" r="7" fill="#fff" />
          <circle cx="130" cy="178" r="7" fill="#fff" />
          <circle cx="180" cy="178" r="7" fill="#fff" />
        </g>
        <ellipse cx="130" cy="204" rx="120" ry="9" fill="#fff" opacity=".35" />
      </svg>
      {seats}
    </>
  )
}
