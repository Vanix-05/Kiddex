import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import { buddyArms, type ArmShape } from '../../../companions/buddyRigData'
import type { BuddyId } from '../../../setup/quizData'
import styles from './PullIn.module.css'

/** Room around an arm's shapes in its picture (the buddy's own 5000 x 5000 pixels). */
const PAD = 40

/**
 * The picked buddy's two arms, reaching out of the page. They are the buddy's
 * own traced arm parts (shoulder at the top, paw at the bottom), so every
 * buddy works with no new art. Each arm is drawn twice, one on top of the
 * other: as a pencil sketch (grey lines with a little wobble) and in the
 * buddy's colors. usePullInClip.tsx moves the arms ([data-arm]) and
 * cross-fades the two copies ([data-arm-art]).
 */
export function BuddyArms({ buddy, buddyColor }: { buddy: BuddyId; buddyColor?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const wobble = useId().replace(/[^\w-]/g, '')
  const arms = useMemo(() => buddyArms(buddy, buddyColor), [buddy, buddyColor])

  // Before the first paint: fit each arm's picture to its shapes (both copies the same), and
  // straighten it. In its picture an arm hangs slanting outward, each buddy's by its own amount;
  // here every arm should point straight down from its shoulder (the clip then turns it).
  useLayoutEffect(() => {
    for (const arm of rootRef.current?.querySelectorAll<HTMLElement>('[data-arm]') ?? []) {
      const shapes = arm.querySelector<SVGGElement>('[data-arm-art=color] g')
      if (!shapes) continue
      const box = shapes.getBBox()
      // The slant: from the middle of the arm's top end to the middle of its bottom end.
      const points: DOMPoint[] = []
      for (const path of shapes.querySelectorAll('path')) {
        const length = path.getTotalLength()
        for (let i = 0; i < 48; i++) points.push(path.getPointAtLength((length * i) / 48))
      }
      const middleX = (from: number, to: number) => {
        const band = points.filter((p) => p.y >= box.y + box.height * from && p.y <= box.y + box.height * to)
        return band.length ? band.reduce((sum, p) => sum + p.x, 0) / band.length : box.x + box.width / 2
      }
      const slant = Math.atan2(middleX(0.8, 1) - middleX(0, 0.2), box.height * 0.8)
      arm.style.setProperty('--straighten', (slant * 180) / Math.PI + 'deg')
      const viewBox = `${box.x - PAD} ${box.y - PAD} ${box.width + 2 * PAD} ${box.height + 2 * PAD}`
      for (const svg of arm.querySelectorAll('svg')) svg.setAttribute('viewBox', viewBox)
    }
  }, [arms])

  const arm = (side: 'left' | 'right', shapes: ArmShape[]) => (
    <div data-arm={side} className={styles.arm}>
      <div className={styles.armArt}>
        <svg data-arm-art="color" className={styles.armPicture} viewBox="0 0 5000 5000">
          <g>
            {shapes.map((s, i) => (
              <path key={i} d={s.d} fill={s.fill} />
            ))}
          </g>
        </svg>
        <svg data-arm-art="sketch" className={`${styles.armPicture} ${styles.armSketch}`} viewBox="0 0 5000 5000">
          {/* A little static wobble, like a line drawn by hand. */}
          <filter id={`${wobble}-${side}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed={side === 'left' ? 3 : 8} />
            <feDisplacementMap in="SourceGraphic" scale="26" />
          </filter>
          <g filter={`url(#${wobble}-${side})`}>
            {shapes.map((s, i) => (
              <path key={i} d={s.d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )

  return (
    <div ref={rootRef} className={styles.arms}>
      {arm('left', arms.left)}
      {arm('right', arms.right)}
    </div>
  )
}
