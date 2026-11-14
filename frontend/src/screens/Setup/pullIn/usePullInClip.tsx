import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { bedroomArt } from '../../../assets/art'
import type { BedroomHandle } from '../../../components/Bedroom/Bedroom'
import book from '../../../components/StoryBook/bookParts.module.css'
import type { BuddyId } from '../../../setup/quizData'
import { reducedMotion } from '../bookPages'
import letterbox from '../intro/Intro.module.css'
import { BuddyArms } from './BuddyArms'
import {
  armsAt,
  BEAT,
  bedroomAt,
  CALM,
  GLOW_BOOK,
  glowOnStage,
  MAGIC,
  pageAt,
  rushAt,
  seg,
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
  /** In the book's coordinates, above the kid's hands: the buddy's arms. */
  aboveHands: ReactNode
  /** Over everything: speed lines, the start frame, the letterbox bars and Skip. */
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

/**
 * "The buddy reaches out and pulls you in" (see pullInTimeline.ts for the
 * beats), played in the setup book's bedroom right after Choose. One clock
 * drives everything: each frame writes transforms and opacities straight
 * onto the elements. It ends on the start frame, full screen.
 *
 * Skip (the button, Enter or Escape) goes straight to the Customize Bridge.
 * With reduce motion on there is no reach and no rush: a fade to the start
 * frame, a short hold, then the Customize Bridge.
 */
export function usePullInClip({ bedroom, active, buddy, buddyColor, freezeAt, onEnd, onCovered }: PullInClipOptions): PullInClipParts {
  const pageRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const skipNow = useRef<() => void>(() => {})

  const onEndRef = useRef(onEnd)
  const onCoveredRef = useRef(onCovered)
  useEffect(() => {
    onEndRef.current = onEnd
    onCoveredRef.current = onCovered
  }, [onEnd, onCovered])

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
    const lines = all(overlayRef, '[data-pull=lines]')
    const rushing = all(overlayRef, '[data-pull=rushing]')
    const startFrame = find(overlayRef, '[data-pull=start]')
    const barTop = find(overlayRef, '[data-pull=barTop]')
    const barBottom = find(overlayRef, '[data-pull=barBottom]')
    const masks = find(overlayRef, '[data-pull=masks]')

    const show = (node: Element | null, opacity: number, transform?: string) => {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) return
      const value = opacity.toFixed(3)
      if (node.style.opacity !== value) node.style.opacity = value
      if (transform !== undefined) node.style.transform = transform
    }
    const placeArm = (node: HTMLElement | null, a: ArmPose) =>
      show(
        node,
        a.opacity,
        `translate(${a.x.toFixed(2)}px, ${a.y.toFixed(2)}px) rotate(${a.rot.toFixed(2)}deg) rotateX(${(-a.tip).toFixed(2)}deg) scale(${a.scale.toFixed(4)})`,
      )

    /** Everything at time t (the full clip). */
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

      // The rush: pencil speed lines and gold sparkles streak outward from the glow.
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
      show(startFrame, seg(t, BEAT.land, BEAT.end - 0.05))
      const bars = seg(t, 0, 0.8)
      const eased = bars * bars * (3 - 2 * bars)
      show(barTop, 1, `translateY(${(-100 * (1 - eased)).toFixed(2)}%)`)
      show(barBottom, 1, `translateY(${(100 * (1 - eased)).toFixed(2)}%)`)
      show(masks, eased)
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
      onEndRef.current(next)
    }
    skipNow.current = () => end('customize')

    const paint = calm ? applyCalm : apply
    const frame = (now: number) => {
      // One frame moves the clock 0.1 s at most, so a stall pauses the clip instead of skipping part of it.
      if (freezeAt === undefined && last) t = Math.min(length, t + Math.min((now - last) / 1000, 0.1))
      last = now
      paint(t)
      if (!covered && !calm && t >= BEAT.glow + 0.75) {
        covered = true
        onCoveredRef.current?.()
      }
      if (freezeAt === undefined && t >= length) {
        end(calm ? 'customize' : 'fall')
        return
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      last = 0
      raf = requestAnimationFrame(frame)
    }
    // Pause while the tab is hidden; carry on from the same moment when it comes back.
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !over) start()
    }
    paint(t)
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, bedroom, freezeAt])

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
        <BuddyArms buddy={buddy} buddyColor={buddyColor} />
        <span data-pull="core" className={styles.core} style={{ left: GLOW_BOOK.x, top: GLOW_BOOK.y }} />
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
