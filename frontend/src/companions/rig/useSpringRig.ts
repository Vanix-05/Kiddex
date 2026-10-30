import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { EMOTIONS, EMOTION_POSES, type Emotion, type EmotionPose } from './emotions'
import type { Point, RigFace, RigPivots } from './types'

/**
 * The traced companions' motion: one requestAnimationFrame loop per companion,
 * made of small springs. Each frame sets every spring's target (idle, moves,
 * emotion), steps the springs, and writes the result straight to the SVG
 * groups' `transform` / `opacity` attributes. No React state per frame.
 *
 * TracedRig marks the groups with data-rig="<name>" (see RIG_PARTS below).
 */

export type Move = 'wave' | 'dance' | 'jump'
export const MOVES: readonly Move[] = ['wave', 'dance', 'jump']

/** Shared by every rig on the page. The dev page changes them. */
export const rigSettings = {
  /** Multiplies time, e.g. 0.35 for slow motion. */
  timeScale: 1,
  /** Play a random move now and then (and soon after appearing). */
  autoMoves: true,
}
const playing = new Set<(move?: Move) => void>()
/** Plays a move on every rig on the page (for the dev page). */
export const playAllRigs = (move: Move) => playing.forEach((play) => play(move))

const FIRST_MOVE_S = 1.2
const MAX_DT = 0.05
const SUBSTEP = 1 / 120 // springs are stepped at 120 Hz or more, for stability

// ---- Springs ------------------------------------------------------------------

interface Spring {
  x: number
  v: number
  target: number
  k: number
  d: number
}
const spring = (k: number, d: number, x = 0): Spring => ({ x, v: 0, target: x, k, d })
function stepSpring(s: Spring, dt: number) {
  const a = s.k * (s.target - s.x) - s.d * s.v
  s.v += a * dt
  s.x += s.v * dt
}

// ---- Helpers ------------------------------------------------------------------

const TAU = Math.PI * 2
const between = (min: number, max: number) => min + Math.random() * (max - min)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const clamp01 = (v: number) => clamp(v, 0, 1)
const smooth = (v: number) => {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const n = (v: number) => (Math.round(v * 100) / 100).toString()

/** Moves by (tx, ty), then rotates by r degrees and scales around the pivot p. */
const transform = ([px, py]: Point, tx: number, ty: number, r: number, sx = 1, sy = 1) =>
  `translate(${n(px + tx)} ${n(py + ty)}) rotate(${n(r)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-px} ${-py})`

type Els = readonly SVGElement[]
const setTransform = (els: Els, value: string) => els.forEach((el) => el.setAttribute('transform', value))
const setOpacity = (els: Els, value: number) => {
  const o = clamp01(value).toFixed(3)
  els.forEach((el) => el.setAttribute('opacity', o))
}

/** The names TracedRig gives its groups (data-rig="..."). */
export const RIG_PARTS = [
  'root', // jump, sway, lean (around the middle)
  'squash', // squash and stretch (around the feet)
  'body', // breathing (around the hips)
  'legLeft',
  'legRight',
  'head',
  'armLeft',
  'armRight',
  'earLeft', // ears or gills
  'earRight',
  'hair',
  'eyeLeft', // glance + eye scale: the traced eye, its lid and its happy arc
  'eyeRight',
  'lidLeft', // the lid itself, inside the eye's clip
  'lidRight',
  'eyesTraced', // fades out for happy eyes
  'eyesHappy',
  'mouthTraced',
  'mouth-happy',
  'mouth-sad',
  'mouth-surprised',
  'mouth-sleepy',
  'blush',
  'z',
] as const
type RigPartName = (typeof RIG_PARTS)[number]

type Pose = Record<keyof EmotionPose, Spring>

export function useSpringRig(
  svgRef: RefObject<SVGSVGElement | null>,
  pivots: RigPivots,
  face: RigFace,
  emotion: Emotion,
) {
  const emotionRef = useRef(emotion)
  const playRef = useRef<(move?: Move) => void>(() => {})

  useEffect(() => {
    emotionRef.current = emotion
  }, [emotion])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const els = Object.fromEntries(
      RIG_PARTS.map((name) => [name, Array.from(svg.querySelectorAll<SVGElement>(`[data-rig="${name}"]`))]),
    ) as Record<RigPartName, SVGElement[]>
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // ---- Springs (stiffness / damping) ----
    const root = { y: spring(120, 14), rot: spring(60, 9), sx: spring(260, 9, 1), sy: spring(260, 9, 1) }
    // The head's rotation spring holds its angle on screen, so it lags behind the body's sway.
    const head = { rot: spring(70, 8), x: spring(50, 10), y: spring(70, 10) }
    const arms = { left: spring(80, 7), right: spring(80, 7) }
    const legs = {
      left: spring(150, 13),
      right: spring(150, 13),
      leftY: spring(150, 13),
      rightY: spring(150, 13),
    }
    const ears = { left: spring(140, 6), right: spring(140, 6) }
    const hair = spring(140, 6)
    const glance = { x: spring(400, 32), y: spring(400, 32) }

    const start = EMOTION_POSES[emotionRef.current]
    const pose = Object.fromEntries(
      Object.entries(start).map(([key, value]) => [key, spring(40, 11, value)]),
    ) as Pose
    // How much each emotion shows (0..1), for the cross-fades. Bouncy, for a small pop.
    const weights = Object.fromEntries(
      EMOTIONS.map((e) => [e, spring(120, 12, e === emotionRef.current ? 1 : 0)]),
    ) as Record<Emotion, Spring>
    const all: Spring[] = [
      ...Object.values(root),
      ...Object.values(head),
      ...Object.values(arms),
      ...Object.values(legs),
      ...Object.values(ears),
      hair,
      ...Object.values(glance),
      ...Object.values(pose),
      ...Object.values(weights),
    ]

    // ---- State (times are in rig seconds, which slow motion stretches) ----
    let time = 0
    let phase = 0 // idle phase: advances faster or slower with the emotion's tempo
    let shownEmotion = emotionRef.current
    let move: { name: Move; start: number; launched: boolean } | null = null
    let nextMove = FIRST_MOVE_S
    // Airborne physics, for the jump and the small hops.
    const air = { y: 0, v: 0, flying: false, landedAt: -10, gravity: 9000, kick: 1 }
    let nextHop = between(0.6, 1.4)
    let nextBlink = between(1, 2.5)
    let blinkAt = -10
    let secondBlinkAt = -1
    let nextGlance = between(1.2, 3.5)

    const launch = (speed: number, kick: number) => {
      if (air.flying) return
      air.flying = true
      air.v = speed
      air.kick = kick
    }
    const blinkNow = () => {
      if (time - blinkAt > 0.25) blinkAt = time
    }

    const play = (next?: Move) => {
      if (motionQuery.matches) return
      move = { name: next ?? MOVES[Math.floor(Math.random() * MOVES.length)], start: time, launched: false }
    }
    playRef.current = play
    playing.add(play)

    const eyeSides = [
      { eye: face.eyes.left, sign: -1, els: els.eyeLeft, lid: els.lidLeft },
      { eye: face.eyes.right, sign: 1, els: els.eyeRight, lid: els.lidRight },
    ]
    const earPivots = {
      left: pivots.earLeft ?? pivots.gillsLeft,
      right: pivots.earRight ?? pivots.gillsRight,
    }
    const mouthCentre: Point = [face.mouth.x, face.mouth.y]
    const zStart: Point = [face.eyes.right.cx + 430, face.eyes.right.cy - 560]

    const update = (dt: number) => {
      time += dt
      const reduced = motionQuery.matches

      // ---- Emotion ----
      const wanted = emotionRef.current
      if (wanted !== shownEmotion) {
        shownEmotion = wanted
        const p = EMOTION_POSES[wanted]
        for (const key of Object.keys(pose) as (keyof EmotionPose)[]) pose[key].target = p[key]
        for (const e of EMOTIONS) weights[e].target = e === wanted ? 1 : 0
        if (wanted === 'surprised' && !reduced) launch(-1500, 0.8) // startle hop
        if (wanted === 'happy') nextHop = time + between(0.3, 0.8)
      }
      const happy = clamp01(weights.happy.x)
      const sleepy = clamp01(weights.sleepy.x)
      const amount = pose.motion.x

      // ---- Idle ----
      phase += dt * pose.tempo.x
      const breath = (1 - Math.cos((TAU * phase) / 3.2)) / 2 // 0..1, 3.2 s
      const sway = reduced ? 0 : 1.6 * amount * Math.sin((TAU * phase) / 6.4)
      const swing = reduced ? 0 : 2.5 * amount * Math.sin((TAU * phase) / 3.2 + 2) // out of phase with the breath
      const nod = reduced ? 0 : sleepy * Math.sin((TAU * phase) / 2.6)

      let rootRot = sway
      let rootY = 0
      let squashX = 1
      let squashY = 1
      let headRot = pose.headTilt.x + 2.5 * nod
      let headY = pose.headY.x - 22 * breath * amount + 18 * nod
      let armLeft = swing - 0.7 * root.rot.x
      let armRight = -swing - 0.7 * root.rot.x
      let legLeft = 0
      let legRight = 0
      let legLeftY = 0
      let legRightY = 0

      // ---- Eyes: glance now and then; the head turns a little toward it ----
      if (reduced) {
        glance.x.target = 0
        glance.y.target = 0
      } else if (time >= nextGlance) {
        const centre = Math.random() < 0.3
        glance.x.target = centre ? 0 : between(-45, 45)
        glance.y.target = centre ? 0 : between(-35, 35)
        nextGlance = time + between(1.2, 3.5)
        if (Math.random() < 0.3) blinkNow()
      }
      headRot += (glance.x.x / 45) * 4
      const headX = glance.x.x * 0.4

      // ---- Blinks ----
      if (time >= nextBlink) {
        blinkNow()
        if (Math.random() < 0.25) secondBlinkAt = time + 0.27
        nextBlink = time + between(2.5, 5) * (1 + 0.9 * sleepy)
      }
      if (secondBlinkAt > 0 && time >= secondBlinkAt) {
        blinkAt = time
        secondBlinkAt = -1
      }
      const sinceBlink = time - blinkAt
      const blink =
        sinceBlink < 0.07 ? smooth(sinceBlink / 0.07) : sinceBlink < 0.2 ? 1 - smooth((sinceBlink - 0.07) / 0.13) : 0

      // ---- Moves ----
      if (rigSettings.autoMoves && time >= nextMove) {
        play()
        nextMove = time + between(5, 7)
      }
      if (move && reduced) move = null
      if (move) {
        const t = time - move.start
        if (move.name === 'wave') {
          const on = smooth(t / 0.3) * (1 - smooth((t - 1.5) / 0.4))
          armRight = lerp(armRight, -112 + 16 * Math.sin((TAU * (t - 0.3)) / 0.6), on)
          headRot -= 6 * on
          rootRot -= 2 * on
          if (t > 1.9) move = null
        } else if (move.name === 'dance') {
          const on = smooth(t / 0.2) * (1 - smooth((t - 2.2) / 0.2))
          const beat = Math.sin((TAU * t) / 1.2)
          rootRot += 7 * beat * on
          armLeft += (13 + 25 * beat) * on
          armRight += (-13 + 25 * beat) * on
          const stepLeft = Math.max(0, beat) * on
          const stepRight = Math.max(0, -beat) * on
          legLeftY = -140 * stepLeft
          legLeft = 10 * stepLeft
          legRightY = -140 * stepRight
          legRight = -10 * stepRight
          rootY -= 40 * Math.abs(beat) * on
          if (t > 2.4) move = null
        } else {
          // Jump: crouch (anticipation), launch, stretch in the air, squash on landing.
          if (t < 0.2) {
            squashX = 1.1
            squashY = 0.88
            armLeft = -18
            armRight = 18
            headY += 25
          } else if (!move.launched) {
            move.launched = true
            launch(-3400, 1)
          }
          if (move.launched && air.flying) {
            const speed = Math.min(1, Math.abs(air.v) / 3400)
            squashY = 1 + 0.09 * speed
            squashX = 1 - 0.045 * speed
            armLeft = 105
            armRight = -105
          }
          if (move.launched && !air.flying && time - air.landedAt > 0.45) move = null
        }
      }

      // Happy: a small hop every 1.2-2.2 s while idle.
      if (!reduced && !move && happy > 0.5 && time >= nextHop) {
        launch(-1250, 0.45)
        nextHop = time + between(1.2, 2.2)
      }

      // ---- Targets ----
      root.rot.target = rootRot
      root.y.target = rootY
      root.sx.target = squashX
      root.sy.target = squashY
      head.rot.target = root.rot.x + headRot // on-screen angle: follows the body, a beat behind
      head.x.target = headX
      head.y.target = headY
      arms.left.target = armLeft
      arms.right.target = armRight
      legs.left.target = legLeft
      legs.right.target = legRight
      legs.leftY.target = legLeftY
      legs.rightY.target = legRightY

      // Ears, gills and hair are dragged by motion: they lag when the body moves.
      const vy = root.y.v + air.v + head.y.v
      const lift = clamp(-vy * 0.004, -14, 14) // moving up: they droop; falling: they perk up
      const turn = clamp(-(head.rot.v - root.rot.v) * 0.05, -10, 10)
      ears.left.target = -(pose.droop.x + lift) + turn
      ears.right.target = pose.droop.x + lift + turn
      hair.target = clamp(-vy * 0.006, -18, 18)

      // ---- Step the springs and the airborne physics ----
      const steps = Math.max(1, Math.ceil(dt / SUBSTEP))
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        for (const s of all) stepSpring(s, h)
        if (air.flying) {
          air.v += air.gravity * h
          air.y += air.v * h
          if (air.y >= 0) {
            // Landing: kick the squash springs, so it squashes and wobbles back.
            air.y = 0
            air.flying = false
            air.landedAt = time
            const hit = Math.min(1, air.v / 3400) * air.kick
            root.sy.v -= 2.6 * hit + 0.25
            root.sx.v += 1.7 * hit + 0.15
            air.v = 0
          }
        }
      }

      // ---- Write ----
      const breathX = 1 + 0.006 * breath * amount
      const breathY = 1 + 0.012 * breath * amount
      const [hipX, hipY] = pivots.body
      const shoulderLift = (side: Point): [number, number] => [(side[0] - hipX) * (breathX - 1), -(hipY - side[1]) * (breathY - 1)]
      const [slx, sly] = shoulderLift(pivots.shoulderLeft)
      const [srx, sry] = shoulderLift(pivots.shoulderRight)

      setTransform(els.root, transform(pivots.middle, 0, root.y.x + air.y, root.rot.x))
      setTransform(els.squash, transform(pivots.feet, 0, 0, 0, root.sx.x, root.sy.x))
      setTransform(els.body, transform(pivots.body, 0, 0, 0, breathX, breathY))
      setTransform(els.legLeft, transform(pivots.hipLeft, 0, legs.leftY.x, legs.left.x))
      setTransform(els.legRight, transform(pivots.hipRight, 0, legs.rightY.x, legs.right.x))
      setTransform(els.head, transform(pivots.neck, head.x.x, head.y.x, head.rot.x - root.rot.x))
      setTransform(els.armLeft, transform(pivots.shoulderLeft, slx, sly, arms.left.x))
      setTransform(els.armRight, transform(pivots.shoulderRight, srx, sry, arms.right.x))
      if (earPivots.left) setTransform(els.earLeft, transform(earPivots.left, 0, 0, ears.left.x))
      if (earPivots.right) setTransform(els.earRight, transform(earPivots.right, 0, 0, ears.right.x))
      setTransform(els.hair, `translate(0 ${n(hair.x)})`)

      // Eyes and lids.
      const lid = pose.lid.x + (1 - pose.lid.x) * blink
      for (const { eye, sign, els: eyeEls, lid: lidEls } of eyeSides) {
        const s = pose.eyeScale.x
        setTransform(eyeEls, transform([eye.cx, eye.cy], glance.x.x, glance.y.x, 0, s, s))
        // The lid's bottom edge: just above the eye when open, just below it when shut.
        const top = eye.cy - eye.ry
        const edge = top - 30 + lid * (2 * eye.ry + 60)
        // Sad raises the inner corners: the left eye's inner corner is on its right.
        setTransform(lidEls, `translate(${eye.cx} ${n(edge)}) rotate(${n(sign * pose.lidTilt.x)})`)
      }
      setOpacity(els.eyesTraced, 1 - happy)
      setOpacity(els.eyesHappy, happy)

      // Mouths: cross-fade with a small scale pop (the weights overshoot a little).
      setOpacity(els.mouthTraced, weights.calm.x)
      for (const e of ['happy', 'sad', 'surprised', 'sleepy'] as const) {
        const w = weights[e].x
        const target = els[`mouth-${e}`]
        setOpacity(target, w)
        if (w > 0.001) setTransform(target, transform(mouthCentre, 0, 0, 0, 0.4 + 0.6 * w, 0.4 + 0.6 * w))
      }
      setOpacity(els.blush, pose.blush.x)

      // Sleepy: small "z"s float up beside the head.
      els.z.forEach((el, i) => {
        const p = (time * 0.4 + i / els.z.length) % 1
        const x = zStart[0] + 60 * Math.sin(p * TAU) + 140 * p
        const y = zStart[1] - 480 * p
        el.setAttribute('transform', `translate(${n(x)} ${n(y)}) scale(${(0.55 + 0.6 * p).toFixed(3)})`)
        el.setAttribute('opacity', (sleepy * Math.sin(p * Math.PI)).toFixed(3))
      })
    }

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_DT) * rigSettings.timeScale
      last = now
      update(dt)
      frame = requestAnimationFrame(tick)
    }
    update(0)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      playing.delete(play)
    }
  }, [svgRef, pivots, face])

  return useCallback(() => playRef.current(), [])
}
