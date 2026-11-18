import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { bedroomArt } from '../../../assets/art'
import type { BedroomHandle } from '../../../components/Bedroom/Bedroom'
import book from '../../../components/StoryBook/bookParts.module.css'
import type { BuddyId } from '../../../setup/quizData'
import { reducedMotion } from '../bookPages'
import letterbox from '../intro/Intro.module.css'
import { BuddyArms } from './BuddyArms'
import { claimPullInPlayer, makePullInPlayer, primePullInPlayer, takePrimedPullInVideo } from './pullInVideo'
import {
  armsAt,
  BEAT,
  bedroomAt,
  CALM,
  clamp,
  GLOW_BOOK,
  glowOnStage,
  GOLD_LOOPS,
  goldAt,
  MAGIC,
  pageAt,
  rushAt,
  seg,
  WIDE,
  wideEndAt,
  type ArmPose,
} from './pullInTimeline'
import styles from './PullIn.module.css'

interface PullInClipOptions {
  bedroom: RefObject<BedroomHandle | null>
  /** The clip is playing. */
  active: boolean
  /** The buddy that was picked, and its color if the Student has one. */
  buddy: BuddyId
  buddyColor?: string
  /**
   * The wide shot for the Student's gender (pullInVideo.ts), fixed for the
   * whole clip; null: no wide shot, the old rush plays (file missing, or ?wide=0).
   */
  wideVideo: string | null
  /** Dev only: the start frame's size over the wide video's last frame (default WIDE.zoom). */
  zoom?: number
  /** Dev only: hold this moment (seconds). */
  freezeAt?: number
  /**
   * The clip is over.
   * fall: it played to the end and is on the start frame; the magic fall comes next.
   * customize: skipped (or reduce motion): straight to the Customize Bridge.
   */
  onEnd: (next: 'fall' | 'customize') => void
  /** The right page is fully covered by the glowing page: what is under it can stop animating. */
  onCovered?: () => void
}

export interface PullInClipParts {
  /** On the right page (inside the book): the page turning into the glowing page. */
  onPage: ReactNode
  /** In the book's coordinates, above the kid's hands: the buddy's arms and the gold hand-off. */
  aboveHands: ReactNode
  /** Over everything: the wide shot, speed lines, the start frame, the letterbox bars and Skip. */
  overlay: ReactNode
}

/** Gold sparkles rising from the glow (book pixels from the glow's middle). */
const RISING = Array.from({ length: 8 }, (_, i) => ({ x: -150 + ((i * 83) % 300), phase: i / 8, size: 0.7 + (i % 3) * 0.3 }))
/** Pencil speed lines streaking outward from the glow: drawn once, moved by transform. */
const SPEED_LINES = Array.from({ length: 30 }, (_, i) => {
  const a = (i / 30) * Math.PI * 2 + ((i * 7) % 5) * 0.03
  const from = 150 + ((i * 53) % 90)
  const to = from + 90 + ((i * 37) % 160)
  const p = (r: number) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`
  return `M${p(from)} L${p(to)}`
}).join(' ')
/** Gold sparkles rushing past in the rush: a direction and a place in the stream. */
const RUSHING = Array.from({ length: 14 }, (_, i) => ({ angle: (i / 14) * Math.PI * 2 + 0.4 * (i % 3), phase: (i * 0.37) % 1 }))

/** Each gold loop is drawn as this many short pieces: drawing on is the pieces appearing in turn. */
const PIECES = 16
/** The pieces of one loop (an ellipse around 0, 0): their paths and the angle of their middles. */
const loopPieces = (rx: number, ry: number) =>
  Array.from({ length: PIECES }, (_, k) => {
    // Starting at the top and going clockwise; each piece overlaps the next a little, so there are no gaps.
    const a0 = -Math.PI / 2 + (k / PIECES) * Math.PI * 2
    const a1 = -Math.PI / 2 + ((k + 1.15) / PIECES) * Math.PI * 2
    const pt = (a: number) => `${(rx * Math.cos(a)).toFixed(1)} ${(ry * Math.sin(a)).toFixed(1)}`
    return { d: `M${pt(a0)} A${rx} ${ry} 0 0 1 ${pt(a1)}`, mid: (a0 + a1) / 2 }
  })
const GOLD_PIECES = GOLD_LOOPS.map((l) => loopPieces(l.rx, l.ry))
/** Sparkles drifting up from the gold loops: which loop, where along it, when. */
const GOLD_SPARKS = Array.from({ length: 7 }, (_, i) => ({ loop: i % 3, dx: -50 + ((i * 37) % 100), phase: (i * 0.29) % 1, size: 0.5 + (i % 3) * 0.2 }))

/** The video has a picture to show (its first frame at least). */
const HAVE_CURRENT_DATA = 2
/** The wide shot's opacity when shown: not quite 1, so it is never made a hardware overlay (see applyWide). */
const VIDEO_SHOWN = 0.999

/**
 * "The buddy reaches out and pulls you in" (see pullInTimeline.ts for the
 * beats), played in the setup book's bedroom right after Choose. One clock
 * drives everything: each frame writes transforms and opacities straight
 * onto the elements.
 *
 * On the second tug it hard-cuts to the wide shot (the kid at the desk pulled
 * into the book, a video for boys and one for girls). The video's element is
 * there from the start, paused on its first frame and hidden; at the cut it
 * is shown and played, and the bedroom is hidden, on the same frame. Over its
 * last 0.5 s it cross-fades into the start frame. If there is no video, or it
 * hasn't started 1.5 s after the cut, the old rush into the page plays instead.
 *
 * Skip (the button, Enter or Escape) goes straight to the Customize Bridge.
 * With reduce motion on there is no reach, no video and no rush: a fade to
 * the start frame, a short hold, then the Customize Bridge.
 */
export function usePullInClip({ bedroom, active, buddy, buddyColor, wideVideo, zoom, freezeAt, onEnd, onCovered }: PullInClipOptions): PullInClipParts {
  const pageRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const skipNow = useRef<() => void>(() => {})

  const onEndRef = useRef(onEnd)
  const onCoveredRef = useRef(onCovered)
  useEffect(() => {
    onEndRef.current = onEnd
    onCoveredRef.current = onCovered
  }, [onEnd, onCovered])

  // ---------- The wide shot's <video> ----------
  // Made in code (not JSX), so it can be the very element primed on the Choose tap
  // (pullInVideo.ts): phones only load it after a play() from a tap. Put on the page,
  // hidden, as soon as the clip starts and its address is known. Laid out (above) before
  // the clock below, so the clock finds it.
  const wideHostRef = useRef<HTMLDivElement>(null)
  /** The clock has reached the cut: too late to prime a video that only arrives now. */
  const pastCutRef = useRef(false)
  useLayoutEffect(() => {
    const host = wideHostRef.current
    if (!active || !wideVideo || !host || reducedMotion()) return
    const primedOnTap = takePrimedPullInVideo(wideVideo)
    const player = primedOnTap ?? makePullInPlayer(wideVideo)
    player.className = styles.wide
    host.appendChild(player)
    videoRef.current = player
    // Not primed on the tap (still downloading then, or the dev page): prime it now, before the cut.
    // (Not while a dev ?t= holds a moment: that sets the video's time itself.)
    if (!primedOnTap && !pastCutRef.current && freezeAt === undefined) primePullInPlayer(player)
    return () => {
      player.pause()
      player.remove()
      if (videoRef.current === player) videoRef.current = null
    }
  }, [active, wideVideo, freezeAt])

  // Skip has the focus from the start; Enter or Escape work anywhere.
  useEffect(() => {
    if (!active) return
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'Escape') && !e.repeat) {
        e.preventDefault()
        skipNow.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  // ---------- The clock ----------
  useLayoutEffect(() => {
    if (!active) return
    const room = bedroom.current
    if (!room) return
    const calm = reducedMotion() && freezeAt === undefined
    const startZoom = zoom ?? WIDE.zoom

    const find = <T extends Element = HTMLElement>(root: RefObject<Element | null>, selector: string) => root.current?.querySelector<T>(selector) ?? null
    const all = (root: RefObject<Element | null>, selector: string) => [...(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])]
    const veil = find(pageRef, '[data-pull=veil]')
    const magic = find(pageRef, '[data-pull=magic]')
    const rising = all(pageRef, '[data-pull=rising]')
    const armLeft = find(frontRef, '[data-arm=left]')
    const armRight = find(frontRef, '[data-arm=right]')
    const armColor = all(frontRef, '[data-arm-art=color]')
    const armSketch = all(frontRef, '[data-arm-art=sketch]')
    const pawShadow = find(frontRef, '[data-pull=shadow]')
    const core = find(frontRef, '[data-pull=core]')
    const goldGlow = find(frontRef, '[data-gold=glow]')
    const goldLoops = all(frontRef, '[data-gold=loop]')
    const goldPieces = goldLoops.map((loop) => [...loop.querySelectorAll<SVGGElement>('[data-gold=piece]')])
    const goldSparks = all(frontRef, '[data-gold=spark]')
    const lines = all(overlayRef, '[data-pull=lines]')
    const rushing = all(overlayRef, '[data-pull=rushing]')
    const startFrame = find(overlayRef, '[data-pull=start]')
    const barTop = find(overlayRef, '[data-pull=barTop]')
    const barBottom = find(overlayRef, '[data-pull=barBottom]')
    const masks = find(overlayRef, '[data-pull=masks]')
    /** The wide shot's <video>: taken at the cut (it may be added after the clip starts, when its download finishes). */
    let video: HTMLVideoElement | null = null

    const show = (node: Element | null, opacity: number, transform?: string) => {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) return
      const value = opacity.toFixed(3)
      if (node.style.opacity !== value) node.style.opacity = value
      if (transform !== undefined && node.style.transform !== transform) node.style.transform = transform
    }
    const placeArm = (node: HTMLElement | null, a: ArmPose) =>
      show(
        node,
        a.opacity,
        `translate(${a.x.toFixed(2)}px, ${a.y.toFixed(2)}px) rotate(${a.rot.toFixed(2)}deg) rotateX(${(-a.tip).toFixed(2)}deg) scale(${a.scale.toFixed(4)})`,
      )

    /**
     * Everything in the bedroom except this overlay: hidden while the wide shot plays (nothing
     * there to draw, and nothing for the graphics card to draw under the video). By visibility:
     * measured on the HD 510 it is the cheaper cut (opacity on these parents makes the browser
     * rebuild its layers on that frame).
     */
    const roomParts = [...(overlayRef.current?.parentElement?.children ?? [])].filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== overlayRef.current,
    )
    const hideRoom = (hidden: boolean) => {
      for (const node of roomParts) node.style.visibility = hidden ? 'hidden' : ''
    }

    /** The gold hand-off: the glow behind the paws, the loops, the sparkles. */
    const applyGold = (t: number) => {
      const gold = goldAt(t)
      show(goldGlow, gold.glow, `translate(${gold.paws.x.toFixed(2)}px, ${gold.paws.y.toFixed(2)}px)`)
      gold.loops.forEach((loop, i) => {
        const node = goldLoops[i]
        if (!node) return
        show(node, loop.drawn > 0 ? loop.opacity : 0, `translate(${loop.x.toFixed(2)}px, ${loop.y.toFixed(2)}px) rotate(${loop.rot.toFixed(2)}deg)`)
        GOLD_PIECES[i].forEach((piece, k) => {
          // Drawn on piece by piece; the half behind the wrist is fainter; a bright part goes round.
          const on = clamp(loop.drawn * PIECES - k)
          const behind = Math.sin(piece.mid) < 0 ? 0.4 : 1
          const bright = 0.72 + 0.28 * Math.cos(piece.mid - gold.spin - i * 2)
          show(goldPieces[i][k], on * behind * bright)
        })
      })
      goldSparks.forEach((node, i) => {
        const s = GOLD_SPARKS[i]
        const loop = gold.loops[s.loop]
        const e = (t * 0.55 + s.phase) % 1
        show(
          node,
          gold.sparkles * Math.sin(e * Math.PI),
          `translate(${(loop.x + s.dx + 10 * Math.sin(t * 2.3 + i)).toFixed(2)}px, ${(loop.y - 10 - 150 * e).toFixed(2)}px) scale(${(s.size * (0.6 + 0.5 * e)).toFixed(3)}) rotate(${(e * 120).toFixed(1)}deg)`,
        )
      })
    }

    /** Everything at time t: the clip up to the cut, and the old rush after it (the fallback). */
    const apply = (t: number) => {
      const frame = bedroomAt(t)
      room.apply(frame)

      // The right page turns into the glowing page, and ripples.
      const page = pageAt(t)
      show(veil, page.veil)
      show(magic, page.glow, `rotate(${page.rot.toFixed(3)}deg) scale(${page.scale.toFixed(4)})`)
      rising.forEach((node, i) => {
        const s = RISING[i]
        const e = (t * 0.42 + s.phase) % 1
        const on = page.glow * (1 - seg(t, BEAT.rush, BEAT.rush + 0.5))
        show(
          node,
          on * Math.sin(e * Math.PI),
          `translate(${(GLOW_BOOK.x + s.x + 8 * Math.sin(t * 2 + i)).toFixed(2)}px, ${(GLOW_BOOK.y + 60 - 200 * e).toFixed(2)}px) scale(${(s.size * (0.6 + 0.6 * e)).toFixed(3)}) rotate(${(e * 90).toFixed(1)}deg)`,
        )
      })

      // The buddy's arms: out of the page as a sketch, then in color; they close around the hand.
      const arms = armsAt(t)
      placeArm(armLeft, arms.left)
      placeArm(armRight, arms.right)
      for (const node of armColor) show(node, arms.color)
      for (const node of armSketch) show(node, 1 - seg(arms.color, 0.5, 1))
      show(pawShadow, 0.5 * arms.shadow * arms.left.opacity)
      // The glow's bright middle, where the arms come out of the page.
      show(core, page.glow * (1 - seg(t, BEAT.land - 0.2, BEAT.land + 0.2)), `scale(${(0.5 + 0.5 * page.glow + 0.04 * Math.sin(t * 5)).toFixed(3)})`)
      applyGold(t)

      // The rush (fallback only): pencil speed lines and gold sparkles streak outward from the glow.
      const rush = rushAt(t)
      const streaks = seg(t, BEAT.rush + 0.15, BEAT.rush + 0.7) * (1 - seg(t, BEAT.land - 0.3, BEAT.land + 0.1))
      const at = glowOnStage(frame.cam)
      lines.forEach((node, i) => {
        const e = (t * (0.7 + 1.1 * rush) + i * 0.5) % 1
        show(node, streaks * Math.sin(e * Math.PI) * 0.9, `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) rotate(${i * 6}deg) scale(${(0.7 + 2.6 * e).toFixed(3)})`)
      })
      rushing.forEach((node, i) => {
        const s = RUSHING[i]
        const e = (t * (0.6 + 0.9 * rush) + s.phase) % 1
        const r = 70 + 820 * e * e
        show(
          node,
          streaks * Math.sin(e * Math.PI),
          `translate(${(at.x + Math.cos(s.angle) * r).toFixed(1)}px, ${(at.y + Math.sin(s.angle) * r).toFixed(1)}px) scale(${(0.5 + 2 * e).toFixed(3)}) rotate(${(e * 120).toFixed(1)}deg)`,
        )
      })

      // The page fills the screen: it is the start frame.
      show(startFrame, seg(t, BEAT.land, BEAT.end - 0.05), 'none')
      const bars = seg(t, 0, 0.8)
      const eased = bars * bars * (3 - 2 * bars)
      show(barTop, 1, `translateY(${(-100 * (1 - eased)).toFixed(2)}%)`)
      show(barBottom, 1, `translateY(${(100 * (1 - eased)).toFixed(2)}%)`)
      show(masks, eased)
    }

    /** The wide shot at video time vt (of d seconds): full screen, then the cross-fade into the start frame. */
    const applyWide = (vt: number, d: number) => {
      // 0.999, not 1: a fully opaque full-screen video becomes a hardware overlay on Windows, and
      // setting that up stops the graphics for about 0.2 s on a weak laptop (HD 510), right on the cut.
      show(video, VIDEO_SHOWN)
      const end = wideEndAt(vt, d, startZoom)
      show(startFrame, end.opacity, end.transform)
      for (const node of [...lines, ...rushing]) show(node, 0)
      show(barTop, 1, 'translateY(0%)')
      show(barBottom, 1, 'translateY(0%)')
      show(masks, 1)
      return end.over
    }

    /** Reduce motion: fade to the start frame, hold it. */
    const applyCalm = (t: number) => {
      show(startFrame, seg(t, 0, CALM.fade))
      show(barTop, 0)
      show(barBottom, 0)
      show(masks, 0)
    }

    let raf = 0
    let last = 0
    let t = freezeAt ?? 0
    let over = false
    let covered = false
    const length = calm ? CALM.end : BEAT.end
    const end = (next: 'fall' | 'customize') => {
      if (over) return
      over = true
      cancelAnimationFrame(raf)
      window.clearTimeout(waitTimer)
      video?.pause()
      onEndRef.current(next)
    }
    skipNow.current = () => end('customize')

    // ---------- The wide shot ----------
    /**
     * clip: up to the cut. wide: the video. rush: the old rush (no video, or it wouldn't start).
     * waiting: at the cut the video had no frame yet (a phone that didn't preload): it was asked
     * to play, and the bedroom holds its frame at the cut until it really plays.
     */
    let mode: 'clip' | 'wide' | 'rush' | 'waiting' = 'clip'
    pastCutRef.current = false
    /** Dev only: which path ran and why (for checking on a phone over USB debugging). Not in the real build. */
    const tell = (path: string, why: string) => {
      if (import.meta.env.DEV) console.info(`[pull-in] ${path}: ${why}`)
    }
    let waitTimer = 0
    let started = false
    /** Clock times: when the video ended, or broke after it had started (then the start frame fades in from there). */
    let endedAt: number | null = null
    let brokenAt: number | null = null
    const duration = () => (video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4.58)
    /** Where the wide shot is, in the video's seconds. */
    const wideTime = () => {
      const d = duration()
      if (brokenAt !== null) return Math.max(video?.currentTime ?? 0, d - WIDE.fadeFrom) + (t - brokenAt)
      if (endedAt !== null) return d + (t - endedAt)
      return video?.currentTime ?? 0
    }
    /** Back to the bedroom: the old rush plays from the cut. */
    const toRush = (why: string) => {
      if (mode === 'rush') return
      tell('rush', why)
      window.clearTimeout(waitTimer)
      mode = 'rush'
      if (video) {
        video.pause()
        show(video, 0)
      }
      hideRoom(false)
      if (freezeAt === undefined) t = BEAT.cut
    }
    /** On this very frame: the video shown (at video time vt), the bedroom hidden. */
    const showWide = (vt: number) => {
      mode = 'wide'
      hideRoom(true)
      applyWide(vt, duration())
    }
    /**
     * The hard cut. With the video's first frame ready (laptops: always), it is shown and played on
     * this very frame, as before. A phone may not have loaded it yet (it was primed on the Choose
     * tap, but the frame can still be on its way): then it is asked to play and the bedroom keeps
     * its frame at the cut (never an empty frame), and the wide shot comes on when it really plays.
     * Not started within 1.5 s, or play() refused, or no video at all: the old rush instead.
     */
    const cut = () => {
      pastCutRef.current = true
      const player = calm ? null : videoRef.current
      if (!player || player.error) {
        toRush(player ? `the video failed (error ${player.error?.code})` : 'no video on the page')
        return
      }
      video = player
      claimPullInPlayer(player)
      const ready = player.readyState >= HAVE_CURRENT_DATA
      const cutAt = performance.now()
      player.onplaying = () => {
        started = true
        window.clearTimeout(waitTimer)
        if (mode === 'waiting' && !over) {
          tell('wide video', `it started ${((performance.now() - cutAt) / 1000).toFixed(2)} s after the cut (readyState ${player.readyState})`)
          showWide(player.currentTime)
        }
      }
      player.onended = () => {
        if (endedAt === null) endedAt = t
      }
      player.onerror = () => {
        if (mode === 'waiting') toRush(`the video failed while waiting (error ${player.error?.code})`)
        if (mode !== 'wide') return
        if (started) brokenAt ??= t
        else toRush(`the video failed before it started (error ${player.error?.code})`)
      }
      if (ready) {
        tell('wide video', `first frame ready at the cut (readyState ${player.readyState})`)
        showWide(0)
        if (freezeAt !== undefined) return
      } else {
        tell('waiting', `no frame yet at the cut (readyState ${player.readyState}): asked it to play`)
        mode = 'waiting'
      }
      void player.play().catch((err: unknown) => {
        if (!started) toRush(`play() was refused (${err instanceof Error ? err.name : 'unknown error'})`)
      })
      // Not playing 1.5 s after the cut: the old rush instead, so the clip never gets stuck.
      waitTimer = window.setTimeout(() => {
        if (!started && (mode === 'wide' || mode === 'waiting') && !over) {
          toRush(`it had not started 1.5 s after the cut (readyState ${player.readyState})`)
        }
      }, WIDE.startWithin * 1000)
    }

    const paint = () => {
      if (calm) {
        applyCalm(t)
        return
      }
      if (mode === 'clip' && t >= BEAT.cut) {
        if (freezeAt === undefined) cut()
        else holdWide()
      }
      if (mode !== 'wide') {
        apply(t)
        return
      }
      // A video that started but stopped for good (it should be over by now): fade to the start frame from here.
      if (started && brokenAt === null && endedAt === null && t > BEAT.cut + duration() + 3) brokenAt = t
      if (applyWide(wideTime(), duration()) && freezeAt === undefined) end('fall')
    }

    const frame = (now: number) => {
      // One frame moves the clock 0.1 s at most, so a stall pauses the clip instead of skipping part of it.
      // During the wide shot the video keeps its own time; the clock only times the end.
      // While waiting for the video to start, the clock stays on the cut: the bedroom holds that frame.
      if (freezeAt === undefined && last && mode !== 'waiting') {
        const step = Math.min((now - last) / 1000, 0.1)
        t = mode === 'wide' ? t + step : Math.min(length, t + step)
      }
      last = now
      paint()
      if (over) return
      if (!covered && !calm && t >= BEAT.glow + 0.75) {
        covered = true
        onCoveredRef.current?.()
      }
      if (freezeAt === undefined && mode !== 'wide' && t >= length) {
        end(calm ? 'customize' : 'fall')
        return
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      last = 0
      raf = requestAnimationFrame(frame)
    }
    // Pause while the tab is hidden (the video too); carry on from the same moment when it comes back.
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (document.hidden) {
        if (mode === 'wide') video?.pause()
        return
      }
      if (over) return
      if (mode === 'wide' && started && endedAt === null && brokenAt === null) void video?.play().catch(() => {})
      start()
    }

    /**
     * Dev (?t= after the cut): once the video has its first frame, cut to it and hold it on that
     * moment. Until then the old rush's frame shows (with no video at all, it stays).
     */
    function holdWide() {
      const player = videoRef.current
      if (freezeAt === undefined || !player || player.readyState < HAVE_CURRENT_DATA) return
      cut()
      if (mode !== 'wide' || !video) return
      const d = duration()
      video.currentTime = Math.min(freezeAt - BEAT.cut, d - 0.01)
      endedAt = freezeAt - BEAT.cut > d ? t - (freezeAt - BEAT.cut - d) : null
    }

    paint()
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      window.clearTimeout(waitTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      hideRoom(false)
      if (video) {
        video.pause()
        video.onplaying = video.onended = video.onerror = null
      }
    }
    // wideVideo is not a dependency: it may arrive during the clip (the <video> is then added), and
    // the clock takes the <video> at the cut. A new value must not restart the clip.
  }, [active, bedroom, freezeAt, zoom])

  if (!active) return { onPage: null, aboveHands: null, overlay: null }

  return {
    onPage: (
      <div ref={pageRef} className={styles.onPage} aria-hidden="true">
        {/* Glowing blank paper over the right page's writing. */}
        <div data-pull="veil" className={`${book.paper} ${book.paperRight} ${styles.veil}`} />
        {/* The start-frame picture, lying on the page: the camera ends up inside it. */}
        <img
          data-pull="magic"
          src={bedroomArt.startFrameOnPage}
          alt=""
          className={styles.magic}
          style={{ left: MAGIC.left, top: MAGIC.top, width: MAGIC.width, height: MAGIC.height }}
          draggable={false}
        />
        {RISING.map((_, i) => (
          <span key={i} data-pull="rising" className={styles.sparkle} />
        ))}
      </div>
    ),
    aboveHands: (
      <div ref={frontRef} className={styles.front}>
        <span data-pull="shadow" className={styles.pawShadow} style={{ left: GLOW_BOOK.x, top: GLOW_BOOK.y }} />
        {/* The gold hand-off: a glow behind the paws... */}
        <span data-gold="glow" className={styles.goldGlow} />
        <BuddyArms buddy={buddy} buddyColor={buddyColor} />
        <span data-pull="core" className={styles.core} style={{ left: GLOW_BOOK.x, top: GLOW_BOOK.y }} />
        {/* ...and thin gold lines looping around the paws and the kid's wrist. */}
        {GOLD_PIECES.map((pieces, i) => (
          <svg key={i} data-gold="loop" className={styles.goldLoop} viewBox="-120 -60 240 120">
            {pieces.map((piece, k) => (
              <g key={k} data-gold="piece" className={styles.goldPiece}>
                <path d={piece.d} className={styles.goldHalo} />
                <path d={piece.d} className={styles.goldHaloInner} />
                <path d={piece.d} className={styles.goldCore} />
              </g>
            ))}
          </svg>
        ))}
        {GOLD_SPARKS.map((_, i) => (
          <span key={i} data-gold="spark" className={styles.sparkle} />
        ))}
      </div>
    ),
    overlay: (
      <div ref={overlayRef} className={letterbox.overlay}>
        <p className="visually-hidden" role="status">
          Your buddy is pulling you into the story…
        </p>
        <div className={letterbox.stage}>
          {[0, 1].map((i) => (
            <svg key={i} data-pull="lines" className={styles.speedLines} viewBox="-420 -420 840 840">
              <path d={SPEED_LINES} />
            </svg>
          ))}
          {RUSHING.map((_, i) => (
            <span key={i} data-pull="rushing" className={styles.sparkle} />
          ))}
          {/* The wide shot: its <video> is put in here from the start (see above), paused on its first
              frame and hidden, so the cut is instant. display: contents, so the video is laid out as
              a child of the stage, as before. */}
          <div ref={wideHostRef} style={{ display: 'contents' }} />

          <img data-pull="start" src={bedroomArt.startFrame} alt="" className={styles.startFrame} draggable={false} />
          <div data-pull="masks" className={letterbox.masks}>
            <span className={letterbox.maskLeft} />
            <span className={letterbox.maskRight} />
            <span className={letterbox.maskTop} />
            <span className={letterbox.maskBottom} />
          </div>
          <div data-pull="barTop" className={`${letterbox.bar} ${letterbox.barTop}`} />
          <div data-pull="barBottom" className={`${letterbox.bar} ${letterbox.barBottom}`}>
            <button ref={skipRef} type="button" className={letterbox.skip} onClick={() => skipNow.current()}>
              Skip <span aria-hidden="true">⏭</span>
            </button>
          </div>
        </div>
      </div>
    ),
  }
}
