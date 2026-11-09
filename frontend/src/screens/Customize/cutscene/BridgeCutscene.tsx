import { useCallback, useEffect, useRef, useState } from 'react'
import type { CompanionId } from '../../../companions/registry'
import { SECTION, type Look } from '../../../setup/customizeData'
import { petById } from '../../../setup/petData'
import { isBuddyId } from '../../../setup/quizData'
import { Pier, Scene } from '../Scene'
import { BoatBack, BoatFront, BoatRide, Figure } from './BoatRide'
import { PierPost, ShoreFront } from './Foreground'
import {
  backOut,
  boatToWorld,
  boatTransform,
  clamp,
  ease,
  easeOut,
  feetAt,
  lerp,
  moveWater,
  SEATS,
  seatFeet,
  seg,
  type BoatPose,
  type Cast,
  type Who,
} from './motion'
import { FrontWaves, SeaSet, type Bind, type SeaPart } from './SeaSet'
import styles from './BridgeCutscene.module.css'

/*
 * Customize Bridge -> Rene Island cutscene (about 13 s). Played live with the
 * traced rigs, so it always shows the Student's own look. One clock (t, in
 * seconds) drives everything: each frame writes transforms and opacities
 * straight onto the elements, with no React state per frame.
 *
 *   Shot A, pier (0 - 2.8 s): the kid and buddy hop-walk right along the pier.
 *   Shot A, into the boat (2.6 - 5.6 s): the camera pushes in; the buddy, then
 *     the kid, hop into the moored boat, which dips on each landing.
 *   Shot C, sailing (5.6 - 9.6 s): open sea, parallax layers, then the boat
 *     sails toward the camera.
 *   Shot D, arrival (9.6 - 13.2 s): Rene Island close up, the title card, then
 *     a fade to cream.
 */

const STAGE_W = 1440
const STAGE_H = 900
const CUTSCENE_SECONDS = 13.2

/** The cuts: each incoming shot crossfades in over the old one (CUT_FADE s, centred on the cut). */
const CUT_C = 5.6
const CUT_D = 9.6
const CUT_FADE = 0.25
/** A shot is mounted from this long before its cut (so its rigs settle), and unmounted once hidden. */
const MOUNT_EARLY = 1

type Shot = 'a' | 'c' | 'd'
const shotsAt = (t: number): Shot[] => [
  ...(t < CUT_C + CUT_FADE ? (['a'] as const) : []),
  ...(t > CUT_C - MOUNT_EARLY && t < CUT_D + CUT_FADE ? (['c'] as const) : []),
  ...(t > CUT_D - MOUNT_EARLY ? (['d'] as const) : []),
]
/** Opacity of a shot that fades in at `cut` (it stays fully on after that). */
const fadeIn = (t: number, cut: number) => seg(t, cut - CUT_FADE / 2, cut + CUT_FADE / 2)

// ---------- Shot A: the pier, in world (stage) coordinates ----------

/** Where the kid and buddy stand on the planks. */
const FEET_Y = 625
/** The pier ends here; past it there are no planks for a shadow. */
const PIER_END = 790
const SIZE: Record<Who, number> = { you: 250, buddy: 260 }
/** The moored boat: its hull middle, and its scale. */
const BOAT_A = { x: 800 + 130 * 1.5, y: 478 + 170 * 1.5, scale: 1.5 }
const WALK: Record<Who, { start: number; dur: number; x0: number; x1: number; steps: number }> = {
  you: { start: 0.3, dur: 2.4, x0: 200, x1: 550, steps: 6 },
  buddy: { start: 0.1, dur: 2.2, x0: 400, x1: 745, steps: 7 },
}
/** The hops into the boat: start time and how high the arc goes. The buddy goes first. */
const HOP: Record<Who, { start: number; height: number }> = {
  you: { start: 3.7, height: 80 },
  buddy: { start: 3.1, height: 110 },
}
const HOP_SECONDS = 0.7

/** The boat's little dip (down, then up, settling) after someone lands in it. */
const dip = (t: number, land: number) => {
  const e = seg(t, land, land + 0.6)
  return e > 0 && e < 1 ? Math.sin(e * Math.PI * 2) * Math.exp(-e * 3) * 10 : 0
}

function boatPoseA(t: number): BoatPose {
  const dips = dip(t, HOP.buddy.start + HOP_SECONDS) + dip(t, HOP.you.start + HOP_SECONDS)
  return {
    x: BOAT_A.x,
    y: BOAT_A.y + dips + Math.sin(t * 2.2) * 3,
    rot: dips * 0.25 + Math.sin(t * 1.7) * 1.2,
    scale: BOAT_A.scale,
  }
}

/**
 * A rider in shot A: feet position, tilt, scale, and how high above the planks.
 * The same figure walks, hops and then sits: the hop ends exactly on its seat
 * (position, size and tilt), and from then on it follows the boat. It is drawn
 * between the sails and the hull, so the hull covers it as it lands.
 */
function riderA(t: number, who: Who, id: CompanionId, boat: BoatPose) {
  const w = WALK[who]
  const e = seg(t, w.start, w.start + w.dur)
  const x = lerp(w.x0, w.x1, ease(e) * 0.15 + e * 0.85)
  const step = Math.sin(e * Math.PI * w.steps)
  const lift = e > 0 && e < 1 ? Math.abs(step) * 22 : 0
  const hop = HOP[who]
  if (t < hop.start) return { x, y: FEET_Y - lift, rot: step * 3 * (e < 1 ? 1 : 0), scale: 1, lift }

  const p = seg(t, hop.start, hop.start + HOP_SECONDS)
  const seat = boatToWorld(boat, seatFeet(who, id))
  const y = lerp(FEET_Y, seat.y, p) - 4 * hop.height * p * (1 - p)
  return {
    x: lerp(x, seat.x, p),
    y,
    rot: lerp(0, boat.rot, p),
    scale: lerp(1, (SEATS[who].size * boat.scale) / SIZE[who], ease(p)),
    lift: FEET_Y - y,
  }
}

// ---------- Shot C: sailing ----------

const SAIL_START = 5.3
const SAIL_END = 9.9
/** The boat sails toward the camera over the shot's last ~1.8 s. */
const TOWARD = [7.8, 9.6] as const

// ---------- Shot D: arrival ----------

const TITLE_AT = 11.2
const CREAM_AT = 12.6

type Part =
  | SeaPart
  | 'fadeIn'
  | 'shotA'
  | 'camA'
  | 'farA'
  | 'post'
  | 'sailsA'
  | 'hullA'
  | 'reflectA'
  | 'foamA'
  | 'you'
  | 'buddy'
  | 'shadowYou'
  | 'shadowBuddy'
  | 'shotC'
  | 'camC'
  | 'boatC'
  | 'reflectC'
  | 'foamC'
  | 'wavesFront'
  | 'shotD'
  | 'camD'
  | 'boatD'
  | 'reflectD'
  | 'foamD'
  | 'frontD'
  | 'title'
  | 'cream'

/**
 * The stage's scale and top-left for this window, centred. Its width and left
 * edge land on whole pixels, so no 1px seam of sky shows next to the side bars.
 */
const fit = () => {
  const { innerWidth: w, innerHeight: h } = window
  const scale = Math.floor(STAGE_W * Math.min(w / STAGE_W, h / STAGE_H)) / STAGE_W
  return { scale, left: Math.round((w - STAGE_W * scale) / 2), top: Math.round((h - STAGE_H * scale) / 2) }
}

export interface BridgeCutsceneProps {
  /** The Student's own character. */
  avatar: CompanionId
  buddy: CompanionId
  /** Their Customize picks. */
  look: Look
  /** The buddy's name (empty = the buddy's default name). */
  buddyName: string | null
  /** When it ends, or on Skip. */
  onDone: () => void
  /** Dev only: hold this moment (seconds), for screenshots. */
  freezeAt?: number
}

/**
 * The cutscene after Go to Lobby on the Customize Bridge, on a 1440 x 900
 * stage scaled to fit the window, with letterbox bars. Skip (button, Enter
 * or Escape) calls onDone straight away.
 */
export function BridgeCutscene({ avatar, buddy, look, buddyName, onDone, freezeAt }: BridgeCutsceneProps) {
  const cast: Cast = { avatar, buddy, look }
  const name = buddyName || (isBuddyId(buddy) ? petById(buddy)?.name : undefined) || 'your buddy'
  const startAt = freezeAt ?? 0

  const [{ scale, left, top }, setLayout] = useState(fit)
  const [shots, setShots] = useState(() => shotsAt(startAt).join(''))
  const els = useRef<Partial<Record<Part, HTMLElement | SVGElement>>>({})
  const skipRef = useRef<HTMLButtonElement>(null)
  const onDoneRef = useRef(onDone)
  const finished = useRef(false)

  const bind = useCallback(
    (name: Part) => (el: HTMLElement | SVGElement | null) => {
      if (el) els.current[name] = el
      else delete els.current[name]
    },
    [],
  )

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onDoneRef.current()
  }, [])

  // Fit the stage to the window.
  useEffect(() => {
    const onResize = () => setLayout(fit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Skip: the button has focus from the start; Enter or Escape work anywhere.
  useEffect(() => {
    skipRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'Escape') && !e.repeat) {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  // ---------- The clock ----------
  useEffect(() => {
    const el = els.current
    const style = (name: Part, transform?: string, opacity?: number) => {
      const node = el[name]
      if (!node) return
      if (transform !== undefined) node.style.transform = transform
      if (opacity !== undefined) {
        node.style.opacity = String(Math.round(opacity * 1000) / 1000)
        node.style.visibility = opacity > 0 ? 'visible' : 'hidden'
      }
    }

    const youFeet = feetAt(avatar)
    const buddyFeet = feetAt(buddy)

    const apply = (t: number) => {
      style('fadeIn', undefined, 1 - seg(t, 0, 0.4))

      // ---------- Shot A: pier, then into the boat ----------
      style('shotA', undefined, t < CUT_C + CUT_FADE / 2 ? 1 : 0)
      if (el.shotA) {
        // The camera follows the walk, then pushes in on the boat.
        const pan = ease(seg(t, 0, 2.8))
        const push = ease(seg(t, 2.6, 4.0))
        const camX = lerp(lerp(420, 640, pan), 960, push)
        const camY = lerp(470, 590, push)
        const zoom = lerp(1.45, 1.7, push) + seg(t, 4.0, 5.6) * 0.06
        style('camA', `translate(${STAGE_W / 2}px, ${STAGE_H / 2}px) scale(${zoom}) translate(${-camX}px, ${-camY}px)`)
        // Parallax: the far layer (sky, sea, island) moves at half the camera's speed.
        style('farA', `translate(${(camX - 420) * 0.5}px, ${(camY - 470) * 0.35}px)`)
        // A blurry pier post sweeps past, right in front of the camera.
        style('post', `translateX(${lerp(1500, -700, seg(t, 0.2, 3.4))}px)`, t < 3.4 ? 1 : 0)

        const boat = boatPoseA(t)
        style('sailsA', boatTransform(boat))
        style('hullA', boatTransform(boat))
        moveWater(t, el.foamA as SVGGElement, el.reflectA as SVGGElement)

        for (const who of ['you', 'buddy'] as const) {
          const id = who === 'you' ? avatar : buddy
          const feet = who === 'you' ? youFeet : buddyFeet
          const r = riderA(t, who, id, boat)
          const size = SIZE[who]
          style(who, `translate(${r.x - size / 2}px, ${r.y - size * feet}px) rotate(${r.rot}deg) scale(${r.scale})`)
          // Soft shadow on the planks: smaller and fainter the higher they are.
          const onPlanks = r.x < PIER_END && t < HOP[who].start + HOP_SECONDS / 2
          const k = clamp(1 - r.lift / 160, 0.3, 1)
          style(
            who === 'you' ? 'shadowYou' : 'shadowBuddy',
            `translate(${r.x}px, ${FEET_Y}px) scale(${k})`,
            onPlanks ? clamp(0.3 * (1 - r.lift / 130)) : 0,
          )
        }
      }

      // ---------- Shot C: sailing ----------
      style('shotC', undefined, t > CUT_D + CUT_FADE / 2 ? 0 : fadeIn(t, CUT_C))
      if (el.shotC) {
        const c = seg(t, SAIL_START, SAIL_END)
        const toward = ease(seg(t, ...TOWARD))
        style('camC', `scale(${lerp(1.04, 1, ease(c))})`)
        // The boat's bottom middle; kept low enough that the flag never goes under the top bar.
        const x = lerp(lerp(400, 600, c), 560, toward)
        const y = 590 + Math.sin(t * 2.6) * 10 + toward * 130
        const s = lerp(2.3, 3, toward)
        style('boatC', `translate(${x - 130}px, ${y - 210}px) rotate(${Math.sin(t * 2.6 + 0.8) * 3}deg) scale(${s})`)
        moveWater(t, el.foamC as SVGGElement, el.reflectC as SVGGElement)
        style('wavesFront', `translate(${-c * 2600}px, ${toward * 30}px)`)
        style('clouds', `translateX(${-c * 160}px)`)
        style('farIsland', `translateX(${-c * 120}px) scale(${lerp(1, 1.25, c)})`)
        style('gulls', `translate(${-c * 320}px, ${Math.sin(t * 3) * 8}px)`)
        ;(['gull0', 'gull1', 'gull2'] as const).forEach((g, i) => style(g, `scaleY(${0.2 + 0.8 * Math.cos(t * 11 + i * 1.7)})`))
        style('wavesFar', `translateX(${-c * 500}px)`)
        style('wavesMid', `translateX(${-c * 1000}px)`)
        style('wavesNear', `translateX(${-c * 1800}px)`)
      }

      // ---------- Shot D: arrival ----------
      style('shotD', undefined, fadeIn(t, CUT_D))
      if (el.shotD) {
        const d = ease(seg(t, 9.4, CUTSCENE_SECONDS))
        const zoom = lerp(1.9, 2.15, d)
        style('camD', `translate(${STAGE_W / 2}px, ${STAGE_H / 2}px) scale(${zoom}) translate(-1080px, -430px)`)
        // The small boat comes out from behind the rocks and sails in to the shore.
        const arrive = ease(seg(t, 9.4, 11.6))
        style(
          'boatD',
          `translate(${lerp(760, 905, arrive)}px, ${lerp(500, 432, arrive) + Math.sin(t * 2.4) * 2}px) scale(${lerp(0.62, 0.42, arrive)}) rotate(${Math.sin(t * 2) * 1.5}deg)`,
        )
        moveWater(t, el.foamD as SVGGElement, el.reflectD as SVGGElement)
        style('frontD', `translate(${lerp(0, -60, d)}px, ${lerp(0, 20, d)}px) scale(${lerp(1, 1.06, d)})`)
        const title = seg(t, TITLE_AT, TITLE_AT + 0.5)
        style('title', `translate(-50%, ${lerp(24, 0, easeOut(title))}px) scale(${lerp(0.85, 1, backOut(title))})`, title)
        style('cream', undefined, seg(t, CREAM_AT, CUTSCENE_SECONDS))
      }
    }

    let raf = 0
    let last = 0
    let t = startAt
    let mounted = shotsAt(t).join('')
    const frame = (now: number) => {
      // One frame moves the clock 0.25 s at most, so a long stall pauses the scene instead of skipping part of it.
      if (freezeAt === undefined && last) t = Math.min(CUTSCENE_SECONDS, t + Math.min((now - last) / 1000, 0.25))
      last = now
      apply(t)
      const next = shotsAt(t).join('')
      if (next !== mounted) {
        mounted = next
        setShots(next)
      }
      if (freezeAt === undefined && t >= CUTSCENE_SECONDS) {
        finish()
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
      if (!document.hidden) start()
    }
    apply(t)
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [avatar, buddy, freezeAt, startAt, finish])

  const has = (s: Shot) => shots.includes(s)
  const figureBox = (who: Who, feet: number) => ({
    width: SIZE[who],
    height: SIZE[who],
    transformOrigin: `${SIZE[who] / 2}px ${SIZE[who] * feet}px`,
  })

  return (
    <div className={styles.root}>
      <p className="visually-hidden" role="status">
        Sailing to Rene Island…
      </p>
      <div className={styles.stage} style={{ left, top, width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        {/* The picture: nothing in it can be tabbed to or clicked */}
        <div className={styles.layer} inert aria-hidden="true">
          {has('a') && (
            <div ref={bind('shotA')} className={styles.layer}>
              <div ref={bind('camA')} className={styles.cam}>
                <div ref={bind('farA')} className={`${styles.layer} ${styles.moving}`}>
                  <Scene className={styles.svg} hidePath hidePier />
                </div>
                <Pier className={styles.svg} />
                <span ref={bind('shadowBuddy')} className={`${styles.shadow} ${styles.shadowBuddy}`} />
                <span ref={bind('shadowYou')} className={styles.shadow} />
                <div ref={bind('sailsA')} className={styles.boatBox}>
                  <BoatBack reflectRef={bind('reflectA')} />
                </div>
                <div ref={bind('buddy')} className={styles.walker} style={figureBox('buddy', feetAt(buddy))}>
                  <Figure who="buddy" cast={cast} />
                </div>
                <div ref={bind('you')} className={styles.walker} style={figureBox('you', feetAt(avatar))}>
                  <Figure who="you" cast={cast} />
                </div>
                <div ref={bind('hullA')} className={styles.boatBox}>
                  <BoatFront foamRef={bind('foamA')} />
                </div>
              </div>
              <div ref={bind('post')} className={`${styles.post} ${styles.moving}`}>
                <PierPost />
              </div>
            </div>
          )}

          {has('c') && (
            <div ref={bind('shotC')} className={styles.layer} style={{ visibility: 'hidden' }}>
              <div ref={bind('camC')} className={styles.camC}>
                <SeaSet bind={bind as Bind<SeaPart>} />
                <div ref={bind('boatC')} className={styles.boatC}>
                  <BoatRide cast={cast} reflectRef={bind('reflectC')} foamRef={bind('foamC')} />
                </div>
                <div ref={bind('wavesFront')} className={`${styles.layer} ${styles.moving}`}>
                  <FrontWaves />
                </div>
              </div>
            </div>
          )}

          {has('d') && (
            <div ref={bind('shotD')} className={styles.layer} style={{ visibility: 'hidden' }}>
              <div ref={bind('camD')} className={styles.cam}>
                <Scene className={styles.svg} hidePath />
                <div ref={bind('boatD')} className={styles.boatD}>
                  <BoatRide cast={cast} reflectRef={bind('reflectD')} foamRef={bind('foamD')} />
                </div>
              </div>
              <div ref={bind('frontD')} className={styles.frontD}>
                <ShoreFront />
              </div>
              <div ref={bind('title')} className={styles.title}>
                <p className={styles.titleMain}>Welcome to Rene Island!</p>
                <p className={styles.titleSub}>
                  You and {name} made it to {SECTION}
                </p>
              </div>
              <div ref={bind('cream')} className={styles.cream} />
            </div>
          )}

          <div ref={bind('fadeIn')} className={styles.fadeIn} />
        </div>

        {/* Letterbox bars, with Skip on the bottom one */}
        <div className={`${styles.bar} ${styles.barTop}`} />
        <div className={`${styles.bar} ${styles.barBottom}`}>
          <button ref={skipRef} type="button" className={styles.skip} onClick={finish}>
            Skip <span aria-hidden="true">⏭</span>
          </button>
        </div>
      </div>
    </div>
  )
}
