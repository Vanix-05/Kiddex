import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { bedroomArt } from '../../assets/art'
import { fitStage } from '../../components/StoryBook/fitStage'
import { Companion } from '../../companions/Companion'
import { rigSettings } from '../../companions/rig/useSpringRig'
import type { BuddyId } from '../../setup/quizData'
import letterbox from '../Setup/intro/Intro.module.css'
import styles from './MagicFall.module.css'

/** If the video gives an error or never starts playing, move on after this long (as LoadingVideo does). */
const FALLBACK_MS = 10_000
/** With no video file: the start frame is held this long, with the falling buddy on top. */
const NO_VIDEO_SECONDS = 2
/** The cross-fade from the start frame to the video's first frame. */
const VIDEO_FADE = 0.5
/** The buddy starts as a pencil sketch and fills with color over this long. */
const SKETCH_SECONDS = 1.5
/** Over the last 2 s the buddy eases down and to the right, toward where the pier will be. */
const DRIFT_SECONDS = 2
/** The cross-fade into the Customize Bridge. Must match .leaving in MagicFall.module.css. */
const LEAVE_MS = 800

/** The buddy: a square picture this big on the 1440 x 900 stage (about 35% of its height), a bit right of the middle. */
const BUDDY = { size: 320, x: 790, y: 480 }
/** Where the buddy's paw (on our right) is, from the middle of its picture, as a share of its size. */
const PAW = { x: 0.105, y: 0.2 }
/**
 * The Student's hand: this wide; turned so the arm comes up from the bottom and its cut end stays
 * under the bar. fingertip: where the fingertips are in the (unmirrored) picture; the hand is placed
 * and flipped around that point, so the fingertips stay on the buddy's paw.
 */
const HAND = { width: 300, rot: 30, fingertip: { x: 0.6, y: 0.235 } }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const ease = (e: number) => e * e * e * (e * (e * 6 - 15) + 10)

export interface MagicFallProps {
  /** The Student's picked buddy, and its color if they have one. */
  buddy: BuddyId
  buddyColor?: string
  /** The magic video's address, or null if the file isn't there. */
  video: string | null
  /**
   * It is over (or skipped): time to show what comes next underneath. The fall then fades out
   * (unless skipped), once the returned promise settles: when what comes next is on screen.
   */
  onLeave: (skipped: boolean) => void | Promise<unknown>
  /** It has faded out completely. */
  onGone: () => void
  /** Dev only: hold this moment (seconds); the video is held there too. */
  freezeAt?: number
}

/**
 * The magic fall, after the buddy has pulled the Student into the page: the
 * magic video (only the background: pages, pencil lines, sky, sea, island)
 * with the Student's own buddy drawn on top in code, falling along with the
 * camera and holding the Student's hand.
 *
 * It starts on the start frame (where the pull-in clip ended) and cross-fades
 * to the video. The buddy starts as a pencil sketch and fills with color. At
 * the end it calls onLeave and fades out over what is underneath (0.8 s).
 * With no video file it holds the start frame for 2 s instead. Skip (the
 * button, Enter or Escape) leaves straight away.
 */
export function MagicFall({ buddy, buddyColor, video, onLeave, onGone, freezeAt }: MagicFallProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const moverRef = useRef<HTMLDivElement>(null)
  const sketchRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLImageElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const leaveNow = useRef<(skipped: boolean) => void>(() => {})
  const [leaving, setLeaving] = useState(false)
  // Calm while it is still a sketch (so the sketch and the colored copy move alike), then happy.
  const [colored, setColored] = useState(false)

  const callbacks = useRef({ onLeave, onGone })
  useEffect(() => {
    callbacks.current = { onLeave, onGone }
  }, [onLeave, onGone])

  // Fit the 1440 x 900 stage to the window.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => root.style.setProperty('--stage', fitStage(root.clientWidth, root.clientHeight))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Skip has the focus; Enter or Escape work anywhere.
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'Escape') && !e.repeat) {
        e.preventDefault()
        leaveNow.current(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The buddy's ears and fur blow as if in wind, and it makes no moves of its own, while it falls.
  useEffect(() => {
    const before = { ...rigSettings }
    rigSettings.wind = 1
    rigSettings.autoMoves = false
    return () => {
      Object.assign(rigSettings, before)
    }
  }, [])

  // ---------- The clock ----------
  useEffect(() => {
    const player = videoRef.current
    let raf = 0
    let last = 0
    let t = freezeAt ?? 0
    /** When the video started playing (clock seconds), and how long it is. */
    let videoFrom: number | null = null
    let length = video ? Infinity : NO_VIDEO_SECONDS
    let left = false
    let inColor = false
    let gone = 0
    let fallback = 0

    const leave = (skipped: boolean) => {
      if (left) return
      left = true
      window.clearTimeout(fallback)
      const next = Promise.resolve(callbacks.current.onLeave(skipped)).catch(() => {})
      if (skipped) {
        void next.then(() => callbacks.current.onGone())
        return
      }
      // Fade out only once the next screen is really drawn underneath (two frames after it is ready).
      void next.then(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setLeaving(true)
            gone = window.setTimeout(() => callbacks.current.onGone(), LEAVE_MS)
          }),
        ),
      )
    }
    leaveNow.current = leave

    const apply = () => {
      // The video fades in over the start frame once it is really playing.
      if (player) player.style.opacity = (videoFrom === null ? 0 : seg(t, videoFrom, videoFrom + VIDEO_FADE)).toFixed(3)

      // Sketch to color.
      const color = seg(t, SKETCH_SECONDS - 0.8, SKETCH_SECONDS)
      if (colorRef.current) colorRef.current.style.opacity = color.toFixed(3)
      if (sketchRef.current) sketchRef.current.style.opacity = (1 - seg(color, 0.5, 1)).toFixed(3)

      // Falling: a slow sway, a small turn, a little float up and down; at the end, down and to the right.
      const drift = Number.isFinite(length) && video ? ease(seg(t, length - DRIFT_SECONDS, length)) : 0
      const x = BUDDY.x + 18 * Math.sin(t * 0.7) + 7 * Math.sin(t * 1.9 + 1) + 230 * drift
      const y = BUDDY.y + 12 * Math.sin(t * 1.1 + 0.6) + 5 * Math.sin(t * 2.3) + 150 * drift
      const rot = 5 * Math.sin(t * 0.55 + 0.3) + 2 * Math.sin(t * 1.3)
      const scale = 1 - 0.12 * drift
      if (moverRef.current) {
        moverRef.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`
      }
      // The Student's hand keeps hold of the buddy's paw.
      if (handRef.current) {
        const a = (rot * Math.PI) / 180
        const px = PAW.x * BUDDY.size * scale
        const py = PAW.y * BUDDY.size * scale
        const pawX = x + px * Math.cos(a) - py * Math.sin(a)
        const pawY = y + px * Math.sin(a) + py * Math.cos(a)
        handRef.current.style.transform = `translate(${pawX.toFixed(2)}px, ${pawY.toFixed(2)}px) rotate(${(HAND.rot + 0.4 * rot).toFixed(2)}deg) scale(-1, 1)`
      }
    }

    const frame = (now: number) => {
      if (freezeAt === undefined && last) t += Math.min((now - last) / 1000, 0.1)
      last = now
      apply()
      if (!inColor && t >= SKETCH_SECONDS + 0.1) {
        inColor = true
        setColored(true)
      }
      if (freezeAt === undefined && t >= length) {
        leave(false)
        return
      }
      raf = requestAnimationFrame(frame)
    }

    if (player) {
      const startFallback = () => {
        if (!fallback && (player.paused || player.error)) fallback = window.setTimeout(() => leave(false), FALLBACK_MS)
      }
      player.onplaying = () => {
        window.clearTimeout(fallback)
        fallback = 0
        if (videoFrom === null) {
          videoFrom = t
          if (Number.isFinite(player.duration)) length = t + player.duration
        }
      }
      player.onended = () => leave(false)
      player.onerror = startFallback
      if (freezeAt !== undefined) {
        // Dev: hold the video on the same moment.
        videoFrom = 0
        player.onloadeddata = () => {
          player.currentTime = Math.min(freezeAt, Math.max(0, player.duration - 0.05))
          length = player.duration
        }
      } else {
        startFallback()
        player.play().catch(startFallback)
      }
    }

    apply()
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fallback)
      window.clearTimeout(gone)
      if (player) player.onplaying = player.onended = player.onerror = player.onloadeddata = null
    }
  }, [video, freezeAt])

  const handHeight = (HAND.width * 2089) / 1024

  return (
    <div ref={rootRef} className={leaving ? `${styles.root} ${styles.leaving}` : styles.root}>
      <p className="visually-hidden" role="status">
        Falling into the story…
      </p>
      <div className={letterbox.stage}>
        <img src={bedroomArt.startFrame} alt="" className={styles.cover} draggable={false} />
        {video && <video ref={videoRef} className={`${styles.cover} ${styles.video}`} src={video} muted playsInline preload="auto" disablePictureInPicture />}

        {/* The Student's own buddy, on top of the video: a pencil sketch that fills with color. */}
        <div ref={moverRef} className={styles.mover} aria-hidden="true" inert>
          <div ref={colorRef} className={styles.buddy} style={{ width: BUDDY.size, height: BUDDY.size }}>
            <Companion id={buddy} buddyColor={buddyColor} emotion={colored ? 'happy' : 'calm'} className={styles.rig} />
          </div>
          {!colored && (
            <div ref={sketchRef} className={`${styles.buddy} ${styles.sketch}`} style={{ width: BUDDY.size, height: BUDDY.size }}>
              <Companion id={buddy} emotion="calm" className={styles.rig} />
            </div>
          )}
        </div>
        {/* The Student's right hand (the left hand's picture, mirrored), holding the buddy's paw. */}
        <img
          ref={handRef}
          src={bedroomArt.handLeft.picture}
          alt=""
          className={styles.hand}
          style={{
            width: HAND.width,
            height: handHeight,
            left: -HAND.width * HAND.fingertip.x,
            top: -handHeight * HAND.fingertip.y,
            transformOrigin: `${HAND.width * HAND.fingertip.x}px ${handHeight * HAND.fingertip.y}px`,
          }}
          draggable={false}
        />

        <div className={`${letterbox.masks} ${styles.shown}`}>
          <span className={letterbox.maskLeft} />
          <span className={letterbox.maskRight} />
          <span className={letterbox.maskTop} />
          <span className={letterbox.maskBottom} />
        </div>
        <div className={`${letterbox.bar} ${letterbox.barTop} ${styles.barIn}`} />
        <div className={`${letterbox.bar} ${letterbox.barBottom} ${styles.barIn}`}>
          <button ref={skipRef} type="button" className={letterbox.skip} onClick={() => leaveNow.current(true)}>
            Skip <span aria-hidden="true">⏭</span>
          </button>
        </div>
      </div>
    </div>
  )
}
