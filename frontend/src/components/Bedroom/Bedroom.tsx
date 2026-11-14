import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { bedroomArt, bedroomLayout } from '../../assets/art'
import { fitStage } from '../StoryBook/fitStage'
import {
  bookTransform,
  DESK,
  DESK_BACK_Y,
  HAND_LEFT_H,
  HAND_RIGHT_H,
  handPivot,
  layerTransform,
  PARALLAX,
  ROOM,
  ROOM_SCALE,
  roomPoint,
  STILL_FRAME,
  tiltTransform,
  type BedroomFrame,
  type HandPose,
} from './camera'
import { HAND_PX, loadPicture, releasePictures } from './pictures'
import styles from './Bedroom.module.css'

export interface BedroomHandle {
  /** Shows one moment: moves every layer for this camera (transforms and opacities only). */
  apply: (frame: BedroomFrame) => void
  /** Resolves once every picture is in its canvas (or after 4 s at most). */
  ready: () => Promise<void>
}

/** The light and the vignette are soft gradients: drawn once, small, and stretched by the graphics card. */
const LIGHT_PX = { width: 310, height: 132 }
const VIGNETTE_PX = { width: 176, height: 110 }

/** Paints the lighting layer: a dark blue wash, the lamp's warm round glow, a soft blue tint by the window. */
function paintLight(canvas: HTMLCanvasElement, color: (name: string) => string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color('--color-bedroom-wash')
  ctx.fillRect(0, 0, w, h)
  const glow = (x: number, y: number, radius: number, from: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
    g.addColorStop(0, from)
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  // Radii in room pixels (the room is ROOM_W wide): 400 for the lamp, 460 for the window.
  glow(w * 0.3, h * 0.68, (400 / ROOM_W) * w, color('--color-bedroom-lamp-glow'))
  glow(w * 0.68, h * 0.3, (460 / ROOM_W) * w, color('--color-bedroom-window-tint'))
}

/** Paints the vignette: clear in the middle, dark blue toward the edges. */
function paintVignette(canvas: HTMLCanvasElement, color: (name: string) => string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  // An ellipse as wide and tall as the canvas: draw a circle in a squashed space.
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(w / 2, h / 2)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0.38, 'rgba(0, 0, 0, 0)')
  g.addColorStop(0.72, color('--color-bedroom-vignette'))
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

interface BedroomProps {
  ref?: Ref<BedroomHandle>
  /** What lies on the desk: the open book, drawn in its own 1216 x 748 pixels. */
  book: ReactNode
  /** Things in the book's coordinates that go above the hands (the clip's flying Ollie). */
  aboveHands?: ReactNode
  /** Fills the window between the room and the book (the clip's first second: the login scene). */
  backdrop?: ReactNode
  /** Over everything, in window coordinates. */
  children?: ReactNode
  /** Nothing in the world can be tapped or tabbed to (while the clip plays). */
  locked?: boolean
}

const ROOM_W = bedroomLayout.room.width * ROOM_SCALE
const ROOM_H = bedroomLayout.room.height * ROOM_SCALE

/** Dust specks in the lamp's light: fixed "random-looking" places and speeds. */
const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: 110 + ((i * 97) % 430),
  y: 300 + ((i * 61) % 330),
  size: 3 + (i % 3),
  speed: 0.12 + ((i * 7) % 10) / 60,
  phase: i * 1.7,
}))

/**
 * One picture of the world, drawn once into a canvas. A canvas is a
 * ready-made texture: the graphics card moves and scales it freely. (As an
 * <img>, the browser decoded the big pictures again each time the camera's
 * zoom crossed a size step, and the clip stalled.)
 */
function Picture({
  src,
  maxWidth,
  className,
  style,
  part,
  soft,
}: {
  src: string
  /** Draw it no wider than this (pixels). Default: the picture's own size. */
  maxWidth?: number
  className: string
  style: CSSProperties
  /** A name for the moving parts (data-part). */
  part?: string
  /** It is an out-of-focus copy (data-soft). */
  soft?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let stale = false
    const done = () => {
      if (!stale && ref.current) ref.current.dataset.painted = ''
    }
    // Usually decoded already (pictures.ts): then this is just a copy.
    loadPicture(src, maxWidth)
      .then((picture) => {
        const canvas = ref.current
        if (stale || !canvas) return
        canvas.width = picture.width
        canvas.height = picture.height
        canvas.getContext('2d')?.drawImage(picture, 0, 0)
        done()
      })
      // A picture that can't load: carry on without it.
      .catch(done)
    return () => {
      stale = true
    }
  }, [src, maxWidth])
  return (
    <canvas
      ref={ref}
      data-picture=""
      data-part={part}
      data-soft={soft ? '' : undefined}
      width={2}
      height={2}
      className={className}
      style={style}
    />
  )
}

/** One room picture: the sharp copy with the soft (out of focus) copy on top. */
function RoomPicture({
  art,
  place,
}: {
  art: { sharp: string; soft: string }
  place: { left: number; top: number; width: number; height: number }
}) {
  const at = roomPoint(place.left, place.top)
  const style: CSSProperties = { left: at.x, top: at.y, width: place.width * ROOM_SCALE, height: place.height * ROOM_SCALE }
  return (
    <>
      <Picture src={art.sharp} className={styles.picture} style={style} />
      <Picture src={art.soft} soft className={`${styles.picture} ${styles.soft}`} style={style} />
    </>
  )
}

/**
 * The kid's bedroom at night, as a world of flat layers under one camera:
 * back wall, shelf, chair, bed, the light, the desk, the open book and the
 * hands. Each layer gets its own transform from the same camera (parallax).
 *
 * Used by the setup storybook as its background (it stays on STILL_FRAME:
 * book view, no hands) and by the intro clip, which moves the camera through
 * `apply`. So the clip's last frame is exactly the setup screen.
 *
 * Laid out on the 1440 x 900 stage, scaled to fit the window (fitStage). The
 * layers are bigger than the stage, so they also fill wider or taller windows.
 */
export function Bedroom({ ref, book, aboveHands, backdrop, children, locked = false }: BedroomProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // The moving parts, found once by their data-part / data-soft / data-dust attributes.
  const el = useRef<Record<string, HTMLElement | undefined>>({})
  const softs = useRef<HTMLElement[]>([])
  const dust = useRef<HTMLElement[]>([])

  const apply = (f: BedroomFrame) => {
    const e = el.current
    // Only touch a style when its value changes: an unchanged layer costs nothing.
    const fade = (node: HTMLElement, opacity: number) => {
      const value = opacity.toFixed(3)
      if (node.style.opacity !== value) node.style.opacity = value
    }
    const set = (name: string, transform?: string, opacity?: number) => {
      const node = e[name]
      if (!node) return
      if (transform !== undefined && node.dataset.at !== transform) {
        node.dataset.at = transform
        node.style.transform = transform
      }
      if (opacity !== undefined) fade(node, opacity)
    }

    const tilt = tiltTransform(f.cam)
    set('tiltBack', tilt)
    set('tiltFront', tilt)
    const wall = layerTransform(f.cam, PARALLAX.wall)
    set('wall', wall)
    set('light', wall)
    set('shelf', layerTransform(f.cam, PARALLAX.shelf))
    set('chair', layerTransform(f.cam, PARALLAX.chair))
    set('bed', layerTransform(f.cam, PARALLAX.bed))
    const desk = layerTransform(f.cam, PARALLAX.desk)
    set('desk', desk)
    set('hands', desk)
    const bookAt = bookTransform(f.cam)
    set('book', bookAt)
    set('above', bookAt)

    // Focus: the soft copies fade over the sharp ones.
    // Warm-up: nothing is fully hidden (or fully covered), so every picture gets drawn once.
    const least = f.warm ? 0.01 : 0
    for (const soft of softs.current) fade(soft, f.warm ? Math.min(f.soft, 0.99) : f.soft)
    set('deskDim', undefined, Math.max(least, f.deskDim))
    set('lampDip', undefined, Math.max(least, f.lampDip))
    set('moonbeam', undefined, 0.35 + 0.65 * f.moon)
    set('star', `scale(${(0.5 + f.star).toFixed(3)}) rotate(${(f.star * 40).toFixed(1)}deg)`, Math.max(least, f.star))

    const hand = (name: string, pose: HandPose | null, height: number) => {
      if (!pose) {
        set(name, undefined, 0)
        set(`${name}Shadow`, undefined, 0)
        return
      }
      const rot = `rotate(${(pose.rot ?? 0).toFixed(2)}deg)`
      const pivot = handPivot(height)
      const origin = `${pivot.x}px ${pivot.y}px`
      const node = e[name]
      if (node) node.style.transformOrigin = origin
      set(name, `translate(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px) ${rot}`, f.warm ? 0.01 : 1)
      // The shadow falls down-left, away from the lamp's side of the hand.
      const shadow = e[`${name}Shadow`]
      if (shadow) shadow.style.transformOrigin = origin
      set(`${name}Shadow`, `translate(${(pose.x - 12).toFixed(2)}px, ${(pose.y + 14).toFixed(2)}px) ${rot}`, f.warm ? 0.01 : 0.55 * (pose.shadow ?? 1))
    }
    hand('handLeft', f.left, HAND_LEFT_H)
    hand('handRight', f.right, HAND_RIGHT_H)

    // Dust: each speck drifts slowly up and sideways, fading in and out.
    dust.current.forEach((node, i) => {
      if (f.dust === null || f.dustLevel <= 0) {
        fade(node, 0)
        return
      }
      const d = DUST[i]
      const t = f.dust * d.speed + d.phase
      const x = d.x + Math.sin(t * 1.3) * 22 + Math.sin(t * 0.37) * 30
      const y = d.y + Math.cos(t * 0.9) * 16 - ((t * 9) % 60)
      node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
      fade(node, (0.3 + 0.3 * Math.sin(t * 1.9)) * f.dustLevel)
    })
  }

  const ready = () =>
    new Promise<void>((resolve) => {
      const started = performance.now()
      const check = () => {
        const pictures = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-picture]') ?? [])]
        if (pictures.every((p) => p.dataset.painted !== undefined)) {
          // Every canvas has its picture: the decoded copies aren't needed any more.
          releasePictures()
          resolve()
        } else if (performance.now() - started > 4000) resolve()
        else window.setTimeout(check, 40)
      }
      check()
    })

  useImperativeHandle(ref, () => ({ apply, ready }))

  // Before the first paint: the still view (the clip moves on from there), and fit the stage to the window.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)]
    el.current = Object.fromEntries(all('[data-part]').map((node) => [node.dataset.part, node]))
    softs.current = all('[data-soft]')
    dust.current = all('[data-dust]')
    // The two big gradients, painted once from the theme's colors.
    const theme = getComputedStyle(root)
    const color = (name: string) => theme.getPropertyValue(name).trim()
    const canvas = (name: string) => root.querySelector<HTMLCanvasElement>(`canvas[data-paint=${name}]`)
    const light = canvas('light')
    const vignette = canvas('vignette')
    if (light) paintLight(light, color)
    if (vignette) paintVignette(vignette, color)
    apply(STILL_FRAME)
    // Once every picture is in its canvas, the decoded copies are freed (see ready).
    void ready()
    const fit = () => root.style.setProperty('--stage', fitStage(root.clientWidth, root.clientHeight))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
    // Once, on mount: apply only touches the elements found above.
  }, [])

  const { pieces } = bedroomLayout
  const wholeWall = { left: 0, top: 0, width: bedroomLayout.room.width, height: bedroomLayout.room.height }
  const star = roomPoint(2270, 232)
  const beam = roomPoint(2380, 60)

  return (
    <div ref={rootRef} className={styles.bedroom}>
      {/* ---------- Behind the book: the room, the light, the desk ---------- */}
      <div className={styles.stage} aria-hidden="true">
        <div data-part="tiltBack" className={styles.tilt}>
          <div data-part="wall" className={styles.layer}>
            <RoomPicture art={bedroomArt.wall} place={wholeWall} />
            <span data-part="moonbeam" className={styles.moonbeam} style={{ left: beam.x, top: beam.y }} />
            <span data-part="star" className={styles.star} style={{ left: star.x, top: star.y }} />
          </div>
          <div data-part="shelf" className={styles.layer}>
            <RoomPicture art={bedroomArt.shelf} place={pieces.shelf} />
          </div>
          <div data-part="chair" className={styles.layer}>
            <RoomPicture art={bedroomArt.chair} place={pieces.chair} />
          </div>
          <div data-part="bed" className={styles.layer}>
            <RoomPicture art={bedroomArt.bed} place={pieces.bed} />
          </div>

          {/* One lighting layer over the room: dark blue, the lamp's warm glow, a blue tint by the window. */}
          <div data-part="light" className={styles.layer}>
            <canvas
              data-paint="light"
              {...LIGHT_PX}
              className={styles.light}
              style={{ left: ROOM.x, top: ROOM.y, width: ROOM_W, height: ROOM_H }}
            />
          </div>

          <div data-part="desk" className={styles.layer}>
            <Picture
              src={bedroomArt.desk}
              className={styles.picture}
              style={{ left: DESK.x, top: DESK.y, width: DESK.width, height: DESK.height }}
            />
            <span data-part="deskDim" className={styles.deskDim} style={{ top: DESK_BACK_Y }} />
            <span data-part="lampDip" className={styles.lampDip} style={{ top: DESK_BACK_Y - 200 }} />
            {DUST.map((d, i) => (
              <span
                key={i}
                data-dust=""
                className={styles.dust}
                style={{ width: d.size, height: d.size }}
              />
            ))}
          </div>
        </div>
        {/* Dark blue at the edges of the picture. */}
        <canvas data-paint="vignette" {...VIGNETTE_PX} className={styles.vignette} />
      </div>

      {backdrop}

      {/* ---------- The book and the hands ---------- */}
      <div className={styles.stage} inert={locked}>
        <div data-part="tiltFront" className={styles.tilt}>
          <div data-part="book" className={styles.bookBox}>
            {book}
          </div>
          <div data-part="hands" className={styles.layer} aria-hidden="true">
            <Picture part="handLeftShadow" src={bedroomArt.handLeft.shadow} className={`${styles.hand} ${styles.shadowLeft}`} style={{ height: HAND_LEFT_H }} />
            <Picture part="handRightShadow" src={bedroomArt.handRight.shadow} className={`${styles.hand} ${styles.shadowRight}`} style={{ height: HAND_RIGHT_H }} />
            <Picture part="handLeft" src={bedroomArt.handLeft.picture} maxWidth={HAND_PX} className={styles.hand} style={{ height: HAND_LEFT_H }} />
            <Picture part="handRight" src={bedroomArt.handRight.picture} maxWidth={HAND_PX} className={styles.hand} style={{ height: HAND_RIGHT_H }} />
          </div>
          {aboveHands && (
            <div data-part="above" className={styles.bookBox} aria-hidden="true">
              {aboveHands}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
