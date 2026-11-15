import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import loadingVideo from '../../assets/videos/loading/loading-1.mp4'
import styles from './LoadingVideo.module.css'

/** If the video never starts playing, give up on it after this long. */
const FALLBACK_MS = 10_000

/**
 * Full-screen loading video, shown while the Lobby loads the first time it
 * opens in a session (screens/Lobby/LazyLobby.tsx): muted, autoplay, no
 * controls. It always plays to the end, then stays on its last frame until
 * it is taken away (`leaving`: it fades out, then calls onGone).
 *
 * - onDone: once, when the video's ended event fires.
 * - onFail: once, if the video can't be used: it gives an error, autoplay is
 *   refused, or it hasn't started playing 10 seconds after opening. The
 *   caller shows its own loading screen instead. No timer runs while the
 *   video is playing.
 */
export function LoadingVideo({
  onDone,
  onFail,
  leaving = false,
  onGone,
}: {
  onDone: () => void
  onFail?: () => void
  leaving?: boolean
  onGone?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const settled = useRef(false)
  const callbacks = useRef({ onDone, onFail, onGone })

  useEffect(() => {
    callbacks.current = { onDone, onFail, onGone }
  }, [onDone, onFail, onGone])

  const finish = () => {
    if (settled.current) return
    settled.current = true
    window.clearTimeout(timer.current)
    callbacks.current.onDone()
  }

  const fail = () => {
    if (settled.current) return
    settled.current = true
    window.clearTimeout(timer.current)
    // Without onFail, carry on as if it had played.
    const { onFail: failed, onDone: done } = callbacks.current
    if (failed) failed()
    else done()
  }

  useEffect(() => {
    // Covers a video that never starts playing; cancelled once it plays.
    timer.current = window.setTimeout(fail, FALLBACK_MS)
    // Autoplay can be refused (e.g. browser settings).
    videoRef.current?.play().catch((error: unknown) => {
      // AbortError: taken away before it started (not a failure).
      if (!(error instanceof DOMException && error.name === 'AbortError')) fail()
    })
    return () => {
      window.clearTimeout(timer.current)
      timer.current = undefined
    }
    // Runs once, on mount.
  }, [])

  /** Playing: no timer from here on; only the ended event moves on. */
  const handlePlaying = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }

  // Reduced motion: no fade, it just goes.
  useEffect(() => {
    if (leaving && window.matchMedia('(prefers-reduced-motion: reduce)').matches) callbacks.current.onGone?.()
  }, [leaving])

  return createPortal(
    <div
      className={leaving ? `${styles.screen} ${styles.leaving}` : styles.screen}
      role="status"
      aria-label="Loading"
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) callbacks.current.onGone?.()
      }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={loadingVideo}
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        onPlaying={handlePlaying}
        onEnded={finish}
        onError={fail}
      />
    </div>,
    document.body,
  )
}
