import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import loadingVideo from '../../../assets/videos/loading/loading-1.mp4'
import styles from './LoadingVideo.module.css'

/** If the video gives an error or never starts playing, move on after this long. */
const FALLBACK_MS = 10_000

/**
 * Full-screen loading video after "Done!" on the PIN code page: muted,
 * autoplay, no controls. Calls onDone once:
 * - when the video's ended event fires (it always plays to the end), or
 * - 10 seconds after opening if it never starts playing, or 10 seconds after
 *   an error. No timer runs while the video is playing.
 */
export function LoadingVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const done = useRef(false)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const finish = () => {
    if (done.current) return
    done.current = true
    window.clearTimeout(timer.current)
    onDoneRef.current()
  }

  const isPlaying = () => {
    const v = videoRef.current
    return !!v && !v.paused && !v.ended && !v.error
  }

  /** Starts the 10-second fallback, unless one is running or the video is playing. */
  const startFallback = () => {
    if (timer.current === undefined && !isPlaying()) timer.current = window.setTimeout(finish, FALLBACK_MS)
  }

  useEffect(() => {
    // Covers a video that never starts playing; cancelled once it plays.
    startFallback()
    // Autoplay can be refused (e.g. browser settings): the fallback covers it.
    videoRef.current?.play().catch(() => startFallback())
    return () => {
      window.clearTimeout(timer.current)
      timer.current = undefined
    }
    // Runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Playing: no timer from here on; only the ended event moves on. */
  const handlePlaying = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }

  return createPortal(
    <div className={styles.screen} role="status" aria-label="Loading">
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
        onError={startFallback}
      />
    </div>,
    document.body,
  )
}
