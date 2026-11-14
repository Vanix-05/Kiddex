import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { companionArt } from '../../../assets/art'
import type { BedroomHandle } from '../../../components/Bedroom/Bedroom'
import { rightHandWithTipAt, rightPageToWorld, STILL_FRAME, type HandPose } from '../../../components/Bedroom/camera'
import { OllieLive } from '../../../components/StoryBook/OllieLive'
import { LoginScreen } from '../../LoginScreen/LoginScreen'
import { reducedMotion } from '../bookPages'
import { Doodles } from './Doodles'
import { LEFT_OPACITY, OWL, OWL_BOX } from './doodleLayout'
import {
  BEAT,
  bedroomAt,
  CALM,
  CALM_ROOM,
  calmCover,
  DRAW,
  DRAW_ROT,
  ease,
  FIRST_FRAME,
  lerp,
  rightHandLeave,
  seg,
  LOGIN_GONE_AT,
  TURN_AT,
  WARM_FRAME,
} from './introTimeline'
import styles from './Intro.module.css'

interface IntroClipOptions {
  bedroom: RefObject<BedroomHandle | null>
  /** The clip is on screen (from the first frame until it has ended or was skipped). */
  active: boolean
  /** The story has begun: the setup book shows its own Ollie and pages from here. */
  handedOver: boolean
  /** Dev only: hold this moment (seconds). */
  freezeAt?: number
  /**
   * Into the story: the setup book takes over (Ollie on the book, the Boy or
   * Girl page). turnPage: with the page turn, or straight there (Skip, reduce motion).
   */
  onStory: (turnPage: boolean) => void
  /** The clip is over: the bedroom is on its still view. */
  onEnd: () => void
}

export interface IntroClipParts {
  /** Behind the book: the login scene the clip starts on. */
  backdrop: ReactNode
  /** On the right page (inside the book): the doodles being drawn. */
  onPage: ReactNode
  /** In the book's coordinates, above the hands: the owl turning into Ollie. */
  aboveHands: ReactNode
  /** Over everything: the letterbox bars and Skip. */
  overlay: ReactNode
}

/** Where Ollie ends up: PerchedOllie's place on the book (PerchedOllie.module.css), 100 wide. */
const PERCH = { x: 1036, y: -118 }
/** Where the owl doodle is, in the book's coordinates (the right page starts at 608, 20). */
const OWL_AT = { x: 608 + OWL.x, y: 20 + OWL.y, scale: OWL_BOX.width / 100 }

type DoodleName = keyof typeof DRAW
interface Stroke {
  path: SVGPathElement
  length: number
}
interface Doodle {
  strokes: Stroke[]
  total: number
  /** Its lines' own coordinates -> the page's. */
  x: number
  y: number
  scale: number
}

/**
 * The bedroom intro clip (see introTimeline.ts for the beats). One clock
 * drives everything: each frame writes transforms and opacities straight
 * onto the elements, with no React state per frame.
 *
 * It returns the pieces the setup book puts in the bedroom's slots. Skip (the
 * button, Enter or Escape) jumps straight into the story. With reduce motion
 * on there are no camera moves, just fades (about 2 s).
 */
export function useIntroClip({ bedroom, active, handedOver, freezeAt, onStory, onEnd }: IntroClipOptions): IntroClipParts {
  const loginRef = useRef<HTMLDivElement>(null)
  const doodlesRef = useRef<SVGSVGElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)
  const barTopRef = useRef<HTMLDivElement>(null)
  const barBottomRef = useRef<HTMLDivElement>(null)
  const masksRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const skipNow = useRef<() => void>(() => {})
  // The login scene is taken away after it has faded out (in the still beat, where a busy moment can't be seen).
  const [loginGone, setLoginGone] = useState(false)

  const callbacks = useRef({ onStory, onEnd })
  useEffect(() => {
    callbacks.current = { onStory, onEnd }
  }, [onStory, onEnd])

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
    const svg = doodlesRef.current
    if (!room) return
    const calm = reducedMotion() && freezeAt === undefined

    // The page the clip turns to shows the Boy and the Girl: have their pictures decoded by then.
    for (const picture of [companionArt.boy, companionArt.girl]) {
      const img = new Image()
      img.src = picture
      void img.decode().catch(() => {})
    }

    // The doodles' lines, with their lengths (for the drawing order and the pencil tip).
    const doodle = (name: DoodleName): Doodle => {
      const group = svg?.querySelector<SVGGElement>(`[data-doodle=${name}]`)
      const strokes = [...(group?.querySelectorAll('path') ?? [])].map((path) => ({ path, length: path.getTotalLength() }))
      return {
        strokes,
        total: strokes.reduce((sum, s) => sum + s.length, 0),
        x: Number(group?.dataset.x ?? 0),
        y: Number(group?.dataset.y ?? 0),
        scale: Number(group?.dataset.scale ?? 1),
      }
    }
    const doodles: Record<DoodleName, Doodle> = { sun: doodle('sun'), star: doodle('star'), owl: doodle('owl') }
    const keep = svg?.querySelector<SVGGElement>('[data-doodle=keep]')
    const owl = svg?.querySelector<SVGGElement>('[data-doodle=owl]')
    const eyes = svg?.querySelector<SVGGElement>('[data-doodle=eyes]')
    const sparkles = [...(svg?.querySelectorAll<SVGPathElement>('[data-doodle=sparkle]') ?? [])]

    /** Draws a doodle up to p (0..1), line after line. Returns where the pencil tip is, on the page. */
    const drawTo = (d: Doodle, p: number) => {
      let before = 0
      let tip = { x: d.x, y: d.y }
      const done = p * d.total
      d.strokes.forEach((s, i) => {
        const part = Math.min(1, Math.max(0, (done - before) / s.length))
        s.path.style.strokeDashoffset = (1 - part).toFixed(4)
        s.path.style.opacity = part > 0 ? '1' : '0'
        // The tip is on the line being drawn (or at the start of the first one, or the end of the last).
        if ((part > 0 && part < 1) || (i === 0 && part === 0) || (part === 1 && done >= before)) {
          const at = s.path.getPointAtLength(s.length * part)
          tip = { x: d.x + at.x * d.scale, y: d.y + at.y * d.scale }
        }
        before += s.length
      })
      return tip
    }
    /** The right hand's pose with the pencil tip on a point of the page. */
    const holdAt = (tip: { x: number; y: number }, lift = 0): HandPose => {
      const w = rightPageToWorld(tip.x, tip.y)
      return rightHandWithTipAt({ x: w.x + lift * 0.5, y: w.y - lift }, DRAW_ROT)
    }
    const between = (a: HandPose, b: HandPose, e: number, hop = 0): HandPose => ({
      x: lerp(a.x, b.x, e),
      y: lerp(a.y, b.y, e) - hop * Math.sin(e * Math.PI),
      rot: lerp(a.rot ?? 0, b.rot ?? 0, e),
    })

    const show = (node: HTMLElement | SVGElement | null | undefined, opacity: number, transform?: string) => {
      if (!node) return
      node.style.opacity = opacity.toFixed(3)
      if (transform !== undefined) node.style.transform = transform
    }

    /** Everything at time t (the full clip). */
    const apply = (t: number) => {
      const frame = bedroomAt(t)

      // ---------- The doodles and the right hand ----------
      const sunTip = drawTo(doodles.sun, seg(t, ...DRAW.sun))
      const starTip = drawTo(doodles.star, seg(t, ...DRAW.star))
      const owlDrawn = seg(t, ...DRAW.owl)
      const owlTip = drawTo(doodles.owl, owlDrawn)
      if (t >= BEAT.doodle) {
        const lifted = holdAt(owlTip, 14 * ease(seg(t, BEAT.blink, BEAT.blink + 0.3)))
        if (t < DRAW.sun[0]) frame.right = between(frame.right!, holdAt(sunTip), ease(seg(t, BEAT.doodle, DRAW.sun[0])))
        else if (t < DRAW.sun[1]) frame.right = holdAt(sunTip)
        else if (t < DRAW.star[0]) frame.right = between(holdAt(sunTip), holdAt(starTip), ease(seg(t, DRAW.sun[1], DRAW.star[0])), 7)
        else if (t < DRAW.star[1]) frame.right = holdAt(starTip)
        else if (t < DRAW.owl[0]) frame.right = between(holdAt(starTip), holdAt(owlTip), ease(seg(t, DRAW.star[1], DRAW.owl[0])), 7)
        else if (t < BEAT.ollie) frame.right = lifted
        else frame.right = rightHandLeave(lifted, t)
      }
      room.apply(frame)

      // The owl's eyes appear with its glasses; it blinks twice; sparkles; then it lifts off as Ollie.
      const alive = seg(t, BEAT.ollie, BEAT.ollie + 0.35)
      const blink = Math.max(...[0.16, 0.42].map((at) => Math.sin(seg(t, BEAT.blink + at - 0.09, BEAT.blink + at + 0.09) * Math.PI)))
      show(owl, 1 - alive)
      if (eyes) {
        eyes.style.opacity = seg(owlDrawn, 0.5, 0.56).toFixed(3)
        eyes.style.transform = `scaleY(${(1 - 0.9 * blink).toFixed(3)})`
      }
      sparkles.forEach((s, i) => {
        const e = seg(t, BEAT.blink + i * 0.07, BEAT.ollie + 0.1)
        show(s, Math.sin(e * Math.PI), `scale(${(0.4 + 0.9 * e).toFixed(3)}) rotate(${(e * 60).toFixed(1)}deg)`)
      })
      // What stays on the page goes faint.
      show(keep, lerp(1, LEFT_OPACITY, ease(seg(t, BEAT.ollie, BEAT.story))))

      // Ollie: fills in with color over the doodle, hops in an arc to his perch, lands with a small hop.
      const hop = ease(seg(t, BEAT.ollie + 0.15, BEAT.story - 0.2))
      const land = Math.sin(seg(t, BEAT.story - 0.2, BEAT.story) * Math.PI)
      const lift = ease(seg(t, BEAT.ollie, BEAT.ollie + 0.25)) * (1 - hop)
      const scale = lerp(OWL_AT.scale, 1, hop) * (1 + 0.1 * lift)
      const x = lerp(OWL_AT.x, PERCH.x, hop) - 5 * lift
      const y = lerp(OWL_AT.y, PERCH.y, hop) - 14 * lift - 110 * Math.sin(hop * Math.PI) - 9 * land
      show(flyerRef.current, alive, `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`)

      // ---------- Around the picture ----------
      const login = 1 - ease(seg(t, BEAT.arrive, BEAT.pull))
      show(loginRef.current, login)
      // Faded out: not drawn or animated any more.
      if (loginRef.current) loginRef.current.style.display = login > 0 ? '' : 'none'
      const bars = ease(seg(t, 1.2, 2.4)) * (1 - ease(seg(t, BEAT.story, BEAT.story + 0.7)))
      show(barTopRef.current, 1, `translateY(${(-100 * (1 - bars)).toFixed(2)}%)`)
      show(barBottomRef.current, 1, `translateY(${(100 * (1 - bars)).toFixed(2)}%)`)
      show(masksRef.current, bars)
    }

    /** Reduce motion: the blank book fades to the bedroom view, then to the Boy or Girl page. */
    const applyCalm = (t: number) => {
      room.apply(t < CALM.toRoom ? FIRST_FRAME : t < CALM.story ? CALM_ROOM : STILL_FRAME)
      const login = t < CALM.toRoom ? 1 : 0
      show(loginRef.current, login)
      if (loginRef.current) loginRef.current.style.visibility = login ? 'visible' : 'hidden'
      show(coverRef.current, calmCover(t))
      show(flyerRef.current, 0)
      const bars = seg(t, CALM.toRoom, 0.7) * (1 - seg(t, 1.3, CALM.story))
      show(barTopRef.current, bars, 'none')
      show(barBottomRef.current, bars, 'none')
      show(masksRef.current, bars)
    }

    let raf = 0
    let last = 0
    let t = freezeAt ?? 0
    let story = false
    let over = false
    const length = calm ? CALM.end : BEAT.end
    const storyAt = calm ? CALM.story : TURN_AT

    const beginStory = (turnPage: boolean) => {
      if (story) return
      story = true
      callbacks.current.onStory(turnPage)
    }
    const end = () => {
      if (over) return
      over = true
      cancelAnimationFrame(raf)
      room.apply(STILL_FRAME)
      callbacks.current.onEnd()
    }
    skipNow.current = () => {
      beginStory(false)
      end()
    }

    const paint = calm ? applyCalm : apply
    const loginEnds = calm ? CALM.toRoom : LOGIN_GONE_AT
    let loginUp = true
    const frame = (now: number) => {
      // One frame moves the clock 0.1 s at most, so a stall pauses the clip instead of skipping part of it.
      if (freezeAt === undefined && last) t = Math.min(length, t + Math.min((now - last) / 1000, 0.1))
      last = now
      paint(t)
      if (loginUp && t > loginEnds) {
        loginUp = false
        setLoginGone(true)
      }
      if (t >= storyAt) beginStory(!calm && freezeAt === undefined)
      if (freezeAt === undefined && t >= length) {
        end()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    let marked = false
    const start = () => {
      // Shows in the Performance panel where the clip itself begins (after the warm-up).
      if (!marked) performance.mark('intro-clip-start')
      marked = true
      last = 0
      raf = requestAnimationFrame(frame)
    }
    // Pause while the tab is hidden; carry on from the same moment when it comes back.
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !over) start()
    }
    paint(t)
    // Warm-up: hold the first frame (it looks exactly like the login's last one)
    // until every picture is decoded and has been drawn once. Then the clock starts.
    let warming = !calm && freezeAt === undefined
    if (warming) {
      room.apply(WARM_FRAME)
      // Not quite opaque, so the browser also draws what is behind the login scene.
      show(loginRef.current, 0.995)
      void room.ready().then(() => {
        let frames = 0
        const settle = () => {
          if (over) return
          if (++frames < 4) {
            requestAnimationFrame(settle)
            return
          }
          warming = false
          if (!document.hidden) start()
        }
        requestAnimationFrame(settle)
      })
    } else if (!document.hidden) start()
    const onShow = () => {
      if (!warming) onVisibility()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [active, bedroom, freezeAt])

  if (!active) return { backdrop: null, onPage: null, aboveHands: null, overlay: null }

  return {
    backdrop: !loginGone && (
      // The real login scene, dimmed and blurred the way the Student login leaves it.
      <div ref={loginRef} className={styles.login} inert aria-hidden="true">
        <LoginScreen />
        <span className={styles.loginDim} />
      </div>
    ),
    onPage: !handedOver && <Doodles ref={doodlesRef} mode="draw" />,
    aboveHands: !handedOver && (
      <div ref={flyerRef} className={styles.flyer}>
        <OllieLive />
      </div>
    ),
    overlay: (
      <div className={styles.overlay}>
        <p className="visually-hidden" role="status">
          Your storybook is opening…
        </p>
        <div ref={coverRef} className={styles.cover} />
        <div className={styles.stage}>
          {/* Hides what's outside the 1440 x 900 picture on wider or taller windows. */}
          <div ref={masksRef} className={styles.masks}>
            <span className={styles.maskLeft} />
            <span className={styles.maskRight} />
            <span className={styles.maskTop} />
            <span className={styles.maskBottom} />
          </div>
          {/* Letterbox bars, with Skip on the bottom one. */}
          <div ref={barTopRef} className={`${styles.bar} ${styles.barTop}`} />
          <div ref={barBottomRef} className={`${styles.bar} ${styles.barBottom}`}>
            <button ref={skipRef} type="button" className={styles.skip} onClick={() => skipNow.current()}>
              Skip <span aria-hidden="true">⏭</span>
            </button>
          </div>
        </div>
      </div>
    ),
  }
}
