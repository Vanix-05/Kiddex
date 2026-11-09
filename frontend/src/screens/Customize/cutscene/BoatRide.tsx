import { useId, type Ref } from 'react'
import { Companion } from '../../../companions/Companion'
import { lookBuddyExtras, lookColors, lookHue, lookYouExtras } from '../../../setup/customizeData'
import { BoatHull, BoatSails } from '../Scene'
import { SEATS, type Cast, type Who } from './motion'
import styles from './BridgeCutscene.module.css'

/** The Student's character or their buddy, dressed in their Customize picks. */
export function Figure({ who, cast }: { who: Who; cast: Cast }) {
  const { avatar, buddy, look } = cast
  return who === 'you' ? (
    <Companion id={avatar} emotion="happy" className={styles.fill} colors={lookColors(look)} extras={lookYouExtras(look)} />
  ) : (
    <Companion id={buddy} emotion="happy" className={styles.fill} hue={lookHue(look)} extras={lookBuddyExtras(look)} />
  )
}

/** Behind the riders: the hull's faint, wobbling reflection, then the sails. */
export function BoatBack({ reflectRef }: { reflectRef?: Ref<SVGGElement> }) {
  const fade = 'cs-reflect' + useId().replace(/[^\w-]/g, '')
  return (
    <>
      <svg className={styles.boatArt} viewBox="0 0 260 210" aria-hidden="true">
        <defs>
          <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0a050" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f0a050" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* The hull mirrored under the waterline */}
        <g ref={reflectRef} className={styles.reflect}>
          <path d="M46 196 L214 196 L238 244 L22 244 Z" fill={`url(#${fade})`} />
        </g>
      </svg>
      <BoatSails />
    </>
  )
}

/** In front of the riders: the hull, sunk a little in the sea, with a sliding foam line. */
export function BoatFront({ foamRef }: { foamRef?: Ref<SVGGElement> }) {
  const wave = 'q11-7 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0'
  return (
    <>
      <BoatHull />
      <svg className={styles.boatArt} viewBox="0 0 260 210" aria-hidden="true">
        <g ref={foamRef}>
          {/* The sea over the hull's bottom edge, so the boat floats in it, not on it */}
          <path d={`M24 190 ${wave} L222 206 L24 206 Z`} fill="#5ab6de" opacity=".8" />
          <path d={`M24 190 ${wave}`} stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".9" />
        </g>
      </svg>
    </>
  )
}

/** The whole boat with both riders tucked between the sails and the hull (sailing + arrival shots). */
export function BoatRide({
  cast,
  reflectRef,
  foamRef,
}: {
  cast: Cast
  reflectRef?: Ref<SVGGElement>
  foamRef?: Ref<SVGGElement>
}) {
  const seat = (who: Who) => {
    const s = SEATS[who]
    return (
      <div className={styles.rider} style={{ left: s.left, top: s.top, width: s.size, height: s.size }}>
        <Figure who={who} cast={cast} />
      </div>
    )
  }
  return (
    <div className={styles.boatBox}>
      <BoatBack reflectRef={reflectRef} />
      {seat('buddy')}
      {seat('you')}
      <BoatFront foamRef={foamRef} />
    </div>
  )
}

