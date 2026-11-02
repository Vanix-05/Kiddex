import { useMemo, useRef, type CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { SignPost } from '../../components/SignPost/SignPost'
import { BeachCrab } from '../../components/BeachCrab/BeachCrab'
import { girlFoxLayers } from '../../assets/art'
import { useMouseTilt, type LookPart } from '../../hooks/useMouseTilt'
import styles from './LoginScreen.module.css'

// The layer images are all 371x474. Aim points are in those pixels.
const ART_W = 371
const ART_H = 474

/** px offset in the art's own pixels, scaled to the displayed width. */
const px = (n: number, width: number) => `${((n * width) / ART_W).toFixed(2)}px`

/**
 * The beach scene shared by every login step. Only the card on the right
 * changes: each step (steps/*.tsx) renders its own <LoginCard> into <Outlet />.
 * The scene stays mounted between steps, so it never flickers.
 */
export function LoginScreen() {
  const girlHeadRef = useRef<HTMLDivElement>(null)
  const girlEyesRef = useRef<HTMLImageElement>(null)
  const foxHeadRef = useRef<HTMLDivElement>(null)
  const foxEyesRef = useRef<HTMLImageElement>(null)

  // Heads and eyes follow the cursor. Eyes are fastest, then the girl's
  // head, then the fox's (slower, bouncier). Keep angles at or below ~6deg,
  // or the painted patches behind the heads start to show.
  const lookAt = useMemo<LookPart[]>(
    () => [
      {
        ref: girlHeadRef,
        aimX: 246 / ART_W,
        aimY: 150 / ART_H,
        k: 120,
        d: 13,
        transform: (ax, ay, w) =>
          `translate(${px(ax * 5, w)}, ${px(ay * 3, w)}) rotate(${(ax * 6).toFixed(3)}deg)`,
      },
      {
        ref: foxHeadRef,
        aimX: 118 / ART_W,
        aimY: 300 / ART_H,
        k: 70,
        d: 9,
        transform: (ax, ay, w) =>
          `translate(${px(ax * 4, w)}, ${px(ay * 3, w)}) rotate(${(ax * 4).toFixed(3)}deg)`,
      },
      {
        ref: girlEyesRef,
        aimX: 242 / ART_W,
        aimY: 170 / ART_H,
        k: 260,
        d: 26,
        transform: (ax, ay, w) => `translate(${px(ax * 3.5, w)}, ${px(ay * 3, w)})`,
      },
      {
        ref: foxEyesRef,
        aimX: 128 / ART_W,
        aimY: 311 / ART_H,
        k: 220,
        d: 24,
        transform: (ax, ay, w) => `translate(${px(ax * 3, w)}, ${px(ay * 2.5, w)})`,
      },
    ],
    [],
  )

  const kidsRef = useMouseTilt<HTMLDivElement>({ lookAt })

  // The eye area masks keep the eyes on the face as they move.
  const girlEyeMask = maskStyle(girlFoxLayers.girlEyeArea)
  const foxEyeMask = maskStyle(girlFoxLayers.foxEyeArea)

  return (
    <SceneBackground decor={<BeachCrab />}>
      <div className={styles.layout}>
        <header className={styles.brand}>
          <KiddexLogo />
        </header>

        <div className={styles.hero} aria-hidden="true">
          <SignPost className={styles.sign} />
          {/* Girl and fox, stacked in layers (see assets/characters/girlfox/). */}
          <div ref={kidsRef} className={styles.kids} role="img" aria-label="A girl and her fox">
            <img src={girlFoxLayers.body} alt="" className={styles.layer} draggable={false} />

            <div ref={girlHeadRef} className={`${styles.layer} ${styles.girlHead}`}>
              <img src={girlFoxLayers.girlHead} alt="" className={styles.layer} draggable={false} />
              <div className={styles.layer} style={girlEyeMask}>
                <img ref={girlEyesRef} src={girlFoxLayers.girlEyes} alt="" className={styles.layer} draggable={false} />
              </div>
            </div>

            {/* On top of the girl's head: the fox's ear overlaps her hair. */}
            <div ref={foxHeadRef} className={`${styles.layer} ${styles.foxHead}`}>
              <img src={girlFoxLayers.foxHead} alt="" className={styles.layer} draggable={false} />
              <div className={styles.layer} style={foxEyeMask}>
                <img ref={foxEyesRef} src={girlFoxLayers.foxEyes} alt="" className={styles.layer} draggable={false} />
              </div>
            </div>
          </div>
        </div>

        {/* The login card for the current step (see steps/ and router.tsx). */}
        <Outlet />
      </div>
    </SceneBackground>
  )
}

function maskStyle(src: string): CSSProperties {
  const url = `url(${src})`
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  }
}
