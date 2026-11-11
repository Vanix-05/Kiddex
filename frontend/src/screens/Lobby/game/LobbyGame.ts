/**
 * The Main Lobby game: owns the Pixi app and the frame loop.
 *
 * Everything in the room is drawn here. The UI on top (HUD, name tags,
 * bubbles, cards) is React; the two talk in a small, fixed way:
 *
 * - The game sends events (LobbyEvents): what the Student is near, who or what
 *   was tapped, bubbles to show, toasts.
 * - React calls methods: setAngle, setZoom, setOptions, walkToZone, runAction,
 *   emote, wave, setFollow, ...
 * - Tags, bubbles, zone labels and the action button are React elements that
 *   React hands over with setAnchor(key, element). The game moves them every
 *   frame by writing `transform`, so there is no React state per frame.
 */
import { Application, Container, Graphics, ImageSource, Polygon, Sprite, Texture } from 'pixi.js'
import type { CharacterPicture } from '../characterTexture'
import { Camera, type Zoom } from './camera'
import { sortDepth } from './depth'
import { drawOutside, type Outside } from './drawOutside'
import { drawFloor, drawFurniture, drawRailing, drawWalls, type RoomText } from './drawRoom'
import { EMOTES } from './emotes'
import { drawParallax, type Parallax } from './parallax'
import type { Point } from './pathfind'
import { makeProjection, type Angle, type Projection } from './projection'
import { ACTION_SPOTS, floorHeight, insideRoom, OLLIE_AT, onDoorMat, SEATS, STAR_BOARD, START, ZONE_IDS, ZONES, type Seat, type SpotId, type ZoneId } from './room'
import { makeLayers, makeScene, type Layers, type Scene } from './scene'
import { Walker, type Figure, type FigureArt, type SeatBook } from './walker'

export type { Angle } from './projection'
export type { Zoom } from './camera'
export type { ZoneId } from './room'

/** One kid and their buddy, as pictures. */
export interface CastMember {
  id: string
  name: string
  buddyName: string
  kid: CharacterPicture
  buddy: CharacterPicture
  /** The Student only: their happy face, shown for a moment after an emote. */
  happy?: CharacterPicture
}

export interface LobbyCast {
  me: CastMember
  classmates: CastMember[]
  ollie: HTMLImageElement
}

export interface LobbyOptions {
  angle: Angle
  zoom: Zoom
  /** Classmates show a random emote now and then. */
  classmateEmotes: boolean
  /** Moving effects: Less. No parallax, bob or drifting clouds. */
  lessMotion: boolean
}

/** What the Student can do right now (the action button, or E). */
export interface NearAction {
  id: string
  label: string
}

export interface BubbleContent {
  text: string
  emoji: boolean
}

/** A place a card opens for: a game corner, Ollie, the chalkboard or the Star Students board. */
export type PlaceId = Exclude<ZoneId, 'door'> | 'board' | 'stars'

export interface LobbyEvents {
  /** The room is drawn and running. */
  ready: () => void
  /** The browser can't draw it (no WebGL). */
  failed: () => void
  near: (action: NearAction | null) => void
  /** A classmate was tapped: open their Buddy card. */
  tapPerson: (id: string) => void
  /** The Student arrived at (or used) a place. */
  tapZone: (id: PlaceId) => void
  /** The Student walked onto the door mat. */
  atDoor: () => void
  /** Show or hide a bubble. `who` is a walker id, or `<id>:buddy`. */
  bubble: (who: string, bubble: BubbleContent | null) => void
  toast: (text: string) => void
  /** The Student moved for the first time. */
  moved: () => void
}

const WALK_KEYS: Record<string, readonly [number, number]> = {
  w: [0, -1],
  arrowup: [0, -1],
  s: [0, 1],
  arrowdown: [0, 1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
}
export const isWalkKey = (key: string) => key.toLowerCase() in WALK_KEYS

const SPOT_LABELS: Record<SpotId, string> = {
  ollie: 'Talk to Ollie',
  board: 'Read the board',
  stars: 'Star Students',
  stage: 'Quiz Stage',
  match: 'Match Corner',
  door: 'Go outside',
}

/**
 * The fonts for the words on the walls. Asked for as soon as this file loads
 * (the Customize screen preloads it), so they are usually ready before the
 * room is drawn.
 */
const fontsReady: Promise<unknown> = Promise.all(
  ['400', '500', '600', '700'].map((weight) => document.fonts.load(`${weight} 16px Fredoka`)),
).catch(() => {})

const STUDENT_SPEED = 3.4
const CLASSMATE_SPEED = 1.5
const BUBBLE_S = 2.6
const HAPPY_S = 2.4
const OLLIE_HEIGHT = 98
const MAX_DT = 0.05
/** Zone labels are buttons: they never shrink under a 44px tap target. */
const MIN_ZONE_SCALE = 0.82

interface Particle {
  g: Graphics
  vx: number
  vy: number
  life: number
}

export class LobbyGame {
  private host: HTMLElement
  private cast: LobbyCast
  private options: LobbyOptions
  private events: LobbyEvents
  private text: RoomText

  private app: Application | null = null
  private dead = false
  private started = false
  private textures: Texture[] = []
  private ollieTexture: Texture | null = null
  private happyTexture: Texture | null = null
  private calmTexture: Texture | null = null

  private world = new Container()
  private layers: Layers | null = null
  private scene: Scene | null = null
  private proj: Projection
  private camera: Camera
  private outside: Outside | null = null
  private parallax: Parallax | null = null
  private ollie: Sprite | null = null
  private marker: Graphics | null = null
  private markerAge = 0

  private seats: SeatBook = new Map()
  private me: Walker | null = null
  private classmates: Walker[] = []
  private names = new Map<string, CastMember>()

  private keys = new Set<string>()
  private inputEnabled = true
  private osReducedMotion: MediaQueryList
  private time = 0
  private snapCamera = true
  private depthDirty = true
  private hasMoved = false
  private onMat = false
  private happyLeft = 0
  private emoteIn = 5
  private action: (NearAction & { run: () => void }) | null = null
  private bubbles = new Map<string, number>()
  private later: { at: number; run: () => void }[] = []
  private particles: Particle[] = []

  private anchors = new Map<string, HTMLElement>()
  private lastTransform = new WeakMap<HTMLElement, string>()
  private lastShown = new WeakMap<HTMLElement, boolean>()
  private uiScale = 1
  private fpsEl: HTMLElement | null = null
  private fpsIn = 0

  constructor(host: HTMLElement, cast: LobbyCast, options: LobbyOptions, text: RoomText, events: LobbyEvents) {
    this.host = host
    this.cast = cast
    this.options = { ...options }
    this.text = text
    this.events = events
    this.proj = makeProjection(options.angle)
    this.camera = new Camera(this.world, this.proj)
    this.camera.mode = options.zoom
    this.osReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    for (const member of [cast.me, ...cast.classmates]) this.names.set(member.id, member)
  }

  // ---------- Start and stop ----------

  async start() {
    const app = new Application()
    try {
      // The chalkboard and banner are Pixi text: wait for Fredoka, but not for long.
      await Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1500))])
      await app.init({
        resizeTo: this.host,
        antialias: true,
        background: 0x7fcbe6,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        preference: 'webgl',
      })
    } catch {
      if (!this.dead) this.events.failed()
      return
    }
    // Left the Lobby while it was starting.
    if (this.dead) {
      app.destroy({ removeView: true }, { children: true })
      return
    }
    this.app = app

    const canvas = app.canvas
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'The classroom. Walk with W, A, S, D or the arrow keys, or click the floor.')
    this.host.appendChild(canvas)
    // The canvas must hold keyboard focus, or the walking keys go nowhere.
    canvas.addEventListener('pointerdown', this.focusCanvas)
    this.focusCanvas()

    app.stage.addChild(this.world)
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointertap', (e) => {
      if (e.target === app.stage) this.tapFloor(e.global.x, e.global.y)
    })

    this.layers = makeLayers(this.world)
    this.makeCast()
    this.buildScene()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.clearKeys)
    document.addEventListener('visibilitychange', this.onVisibility)

    app.ticker.add((ticker) => this.frame(Math.min(MAX_DT, ticker.deltaMS / 1000)))
    this.onVisibility()
    this.started = true
    this.events.ready()
  }

  destroy() {
    this.dead = true
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.clearKeys)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.anchors.clear()
    this.fpsEl = null
    const app = this.app
    if (!app) return
    this.app = null
    app.canvas.removeEventListener('pointerdown', this.focusCanvas)
    app.ticker.stop()
    this.uncache()
    app.destroy({ removeView: true }, { children: true })
    // The pictures' canvases are cached by look; only the GPU copies go.
    for (const texture of this.textures) texture.destroy(true)
    this.textures = []
  }

  private focusCanvas = () => {
    this.app?.canvas.focus({ preventScroll: true })
  }

  /** The frame loop rests while the tab is hidden. */
  private onVisibility = () => {
    const ticker = this.app?.ticker
    if (!ticker) return
    if (document.hidden) {
      this.keys.clear()
      ticker.stop()
    } else {
      ticker.start()
    }
  }

  // ---------- Build ----------

  private textureOf(source: HTMLCanvasElement | HTMLImageElement): Texture {
    const texture = new Texture({ source: new ImageSource({ resource: source }) })
    this.textures.push(texture)
    return texture
  }

  private artOf(picture: CharacterPicture): FigureArt {
    return { texture: this.textureOf(picture.canvas), anchorX: picture.anchorX, anchorY: picture.anchorY, bodyPx: picture.bodyPx }
  }

  private makeCast() {
    const { me, classmates, ollie } = this.cast
    this.ollieTexture = this.textureOf(ollie)

    const meArt = this.artOf(me.kid)
    this.calmTexture = meArt.texture
    this.happyTexture = me.happy ? this.textureOf(me.happy.canvas) : null
    this.me = new Walker({
      id: me.id,
      you: true,
      speed: STUDENT_SPEED,
      kid: meArt,
      buddy: this.artOf(me.buddy),
      seats: this.seats,
      // Tapping yourself or your buddy pets the buddy.
      onTapKid: () => this.petBuddy(),
      onTapBuddy: () => this.petBuddy(),
    })
    this.me.place(START.x, START.y)

    this.classmates = classmates.map((mate, i) => {
      const walker: Walker = new Walker({
        id: mate.id,
        you: false,
        speed: CLASSMATE_SPEED,
        kid: this.artOf(mate.kid),
        buddy: this.artOf(mate.buddy),
        seats: this.seats,
        onTapKid: () => this.inputEnabled && this.events.tapPerson(mate.id),
        onTapBuddy: () => this.inputEnabled && this.events.tapPerson(mate.id),
      })
      walker.place(START.x + 2.2 + i, START.y - 1 + i * 0.6)
      return walker
    })
  }

  /** Draws the room for the current angle. Everyone keeps their place. */
  private buildScene() {
    const { layers, me } = this
    if (!layers || !me || !this.ollieTexture) return
    for (const walker of [me, ...this.classmates]) walker.detach()
    this.uncache()
    for (const layer of Object.values(layers)) {
      for (const child of layer.removeChildren()) child.destroy({ children: true })
    }
    this.particles = []

    this.proj = makeProjection(this.options.angle)
    const scene = makeScene(this.proj, layers)
    this.scene = scene
    this.outside = drawOutside(scene)
    this.parallax = drawParallax(scene)
    const floor = drawFloor(scene)
    const walls = drawWalls(scene, this.text)
    drawFurniture(scene)
    drawRailing(scene)

    // Ollie, behind the Teacher's Desk.
    const ollie = new Sprite(this.ollieTexture)
    ollie.anchor.set(0.5, 1)
    ollie.scale.set(OLLIE_HEIGHT / this.ollieTexture.height)
    ollie.eventMode = 'static'
    ollie.cursor = 'pointer'
    ollie.on('pointertap', (e) => {
      e.stopPropagation()
      this.walkToZone('ollie')
    })
    const ollieView = new Container()
    ollieView.addChild(new Graphics().ellipse(0, 0, 26, 9).fill({ color: 0x4a2c17, alpha: 0.16 }), ollie)
    ollieView.position.set(...this.proj.P(OLLIE_AT.x, OLLIE_AT.y))
    scene.add(ollieView, OLLIE_AT.x, OLLIE_AT.y)
    this.ollie = ollie

    this.addStarBoardTap()

    this.marker = new Graphics()
    this.marker.visible = false
    layers.fx.addChild(this.marker)

    for (const walker of [me, ...this.classmates]) walker.attach(scene)

    // The parts that never change are each drawn once into a texture.
    this.outside.ground.cacheAsTexture({ antialias: true, resolution: 1 })
    const sharp = this.cacheResolution()
    floor.cacheAsTexture({ antialias: true, resolution: sharp })
    walls.cacheAsTexture({ antialias: true, resolution: sharp })
    this.cached = [this.outside.ground, floor, walls]

    this.camera.setProjection(this.proj)
    this.snapCamera = true
    this.depthDirty = true
  }

  /** The Star Students board hangs on the left wall (diagonal view only): tapping it walks there. */
  private addStarBoardTap() {
    const { layers, proj } = this
    if (!layers || !proj.diag) return
    const { y0, y1, z0, z1 } = STAR_BOARD
    const tap = new Container()
    tap.hitArea = new Polygon([...proj.P(0, y1, z0), ...proj.P(0, y0, z0), ...proj.P(0, y0, z1), ...proj.P(0, y1, z1)])
    tap.eventMode = 'static'
    tap.cursor = 'pointer'
    tap.on('pointertap', (e) => {
      e.stopPropagation()
      if (this.inputEnabled) this.walkTo(STAR_BOARD.spot, () => this.events.tapZone('stars'))
    })
    layers.walls.addChild(tap)
  }

  private cached: Container[] = []

  private uncache() {
    for (const view of this.cached) if (!view.destroyed) view.cacheAsTexture(false)
    this.cached = []
  }

  /** Cached layers are drawn at 2x on sharp or large screens, where the Close view enlarges them. */
  private cacheResolution() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const closeScale = Math.min(this.host.clientWidth / 1280, this.host.clientHeight / 800)
    return dpr * closeScale > 1.25 ? 2 : 1
  }

  // ---------- Called by React ----------

  setAngle(angle: Angle) {
    if (angle === this.options.angle) return
    this.options.angle = angle
    if (this.started) this.buildScene()
  }

  setZoom(zoom: Zoom) {
    this.options.zoom = zoom
    this.camera.mode = zoom
  }

  setOptions(options: Pick<LobbyOptions, 'classmateEmotes' | 'lessMotion'>) {
    this.options.classmateEmotes = options.classmateEmotes
    this.options.lessMotion = options.lessMotion
  }

  /** Off while a card is open: no walking, no actions. */
  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled
    if (enabled) this.focusCanvas()
  }

  /** How much the tags, bubbles and zone labels are scaled (small screens). */
  setUiScale(scale: number) {
    this.uiScale = scale
  }

  /** Hands over (or takes back) an element the game moves each frame. */
  setAnchor(key: string, el: HTMLElement | null) {
    if (el) this.anchors.set(key, el)
    else this.anchors.delete(key)
    if (el && this.started) this.placeAnchors()
  }

  private anchorRefs = new Map<string, (el: HTMLElement | null) => () => void>()

  /** A React ref callback for setAnchor(key, ...). The same function every time, so React doesn't re-attach it. */
  anchorRef(key: string) {
    let ref = this.anchorRefs.get(key)
    if (!ref) {
      ref = (el) => {
        this.setAnchor(key, el)
        return () => this.setAnchor(key, null)
      }
      this.anchorRefs.set(key, ref)
    }
    return ref
  }

  /** Dev only: an element that shows the frame rate. */
  setFpsElement(el: HTMLElement | null) {
    this.fpsEl = el
  }

  /** Walks to a game corner, Ollie or the door, then opens its card. */
  walkToZone(id: ZoneId) {
    this.walkTo(ZONES[id].spot, () => {
      if (id === 'door') this.reachDoor()
      else this.events.tapZone(id)
    })
  }

  /** Walks the Student to a spot (unless they are there already), then runs `arrive`. */
  private walkTo(spot: Point, arrive: () => void) {
    const me = this.me
    if (!me) return
    this.noteMoved()
    if (!me.seat && Math.hypot(me.x - spot.x, me.y - spot.y) < 0.5) arrive()
    else if (me.goTo(spot.x, spot.y, arrive)) this.showMarker(spot.x, spot.y, true)
  }

  /** Does what the action button says. */
  runAction() {
    const action = this.action
    if (!action || !this.inputEnabled) return
    this.action = null
    action.run()
  }

  /** The Student's emote: a bubble over their head. */
  emote(text: string, emoji: boolean) {
    if (this.me) this.say(this.me, 'kid', text, emoji)
  }

  /** You wave, and they wave back. */
  wave(classmateId: string) {
    const mate = this.classmates.find((c) => c.id === classmateId)
    if (!this.me || !mate) return
    this.say(this.me, 'kid', '👋', true)
    this.after(0.7, () => this.say(mate, 'kid', '👋', true))
  }

  isFollowing(classmateId: string) {
    return this.classmates.some((c) => c.id === classmateId && c.leader !== null)
  }

  /** Walk with me / Stop. */
  setFollow(classmateId: string, follow: boolean) {
    const mate = this.classmates.find((c) => c.id === classmateId)
    const name = this.names.get(classmateId)?.name ?? 'Your classmate'
    if (!this.me || !mate) return
    if (follow) {
      for (const other of this.classmates) other.leader = null
      mate.leader = this.me
      mate.wait = 0
      mate.stand()
      this.say(mate, 'kid', 'Okay! 😄', false)
      this.events.toast(`${name} is walking with you`)
    } else {
      mate.leader = null
      mate.wait = 3
      this.say(mate, 'kid', 'Bye! 👋', false)
      this.events.toast(`${name} stopped walking with you`)
    }
  }

  // ---------- Input ----------

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target instanceof HTMLElement ? e.target : null
    if (target?.closest('input, textarea, select, [contenteditable]')) return
    const key = e.key.toLowerCase()
    if (key in WALK_KEYS) {
      // Tracked even while a card is open, so walking goes on once it closes.
      this.keys.add(key)
      e.preventDefault()
      if (this.inputEnabled) {
        this.noteMoved()
        if (this.marker) this.marker.visible = false
      }
      return
    }
    if (!this.inputEnabled || e.repeat) return
    // Space on a focused button presses that button, as usual.
    const onButton = !!target?.closest('button, a, [role="button"]')
    if (key === 'e' || (key === ' ' && !onButton)) {
      e.preventDefault()
      this.runAction()
      return
    }
    const emote = EMOTES['12345'.indexOf(key)]
    if (key.length === 1 && emote) this.emote(emote.text, emote.emoji)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private clearKeys = () => this.keys.clear()

  /** The walking keys as a direction on the floor: W walks straight up the screen. */
  private keyDirection(): Point | null {
    if (!this.inputEnabled) return null
    let sx = 0
    let sy = 0
    for (const key of this.keys) {
      const dir = WALK_KEYS[key]
      if (!dir) continue
      sx += dir[0]
      sy += dir[1]
    }
    sx = Math.sign(sx)
    sy = Math.sign(sy)
    return sx || sy ? this.proj.floorDir(sx, sy) : null
  }

  private tapFloor(screenX: number, screenY: number) {
    const me = this.me
    if (!me || !this.inputEnabled) return
    const p = this.camera.toFloor(screenX, screenY)
    this.noteMoved()
    if (!insideRoom(p.x, p.y)) {
      this.events.toast('Use the green door to go outside')
      this.showMarker(p.x, p.y, false)
      return
    }
    // A blocked spot (a desk, a plant) becomes the nearest free one.
    if (me.goTo(p.x, p.y)) {
      const end = me.destination ?? p
      this.showMarker(end.x, end.y, true)
    }
  }

  private noteMoved() {
    if (this.hasMoved) return
    this.hasMoved = true
    this.events.moved()
  }

  private showMarker(x: number, y: number, ok: boolean) {
    const marker = this.marker
    if (!marker) return
    marker.clear()
    if (ok) {
      marker.ellipse(0, 0, 22, 10).stroke({ width: 4, color: 0xf0a050 })
      marker.ellipse(0, 0, 9, 4).fill(0xf0a050)
    } else {
      marker.moveTo(-10, -5).lineTo(10, 5).moveTo(10, -5).lineTo(-10, 5).stroke({ width: 4, color: 0xef6f5e, cap: 'round' })
    }
    marker.position.set(...this.proj.P(x, y, floorHeight(x, y)))
    marker.alpha = 1
    marker.scale.set(1)
    marker.visible = true
    this.markerAge = 0
  }

  // ---------- Things that happen ----------

  private after(seconds: number, run: () => void) {
    this.later.push({ at: this.time + seconds, run })
  }

  /** A bubble over a kid or a buddy, with a small happy jump. */
  private say(walker: Walker, part: 'kid' | 'buddy', text: string, emoji: boolean) {
    const key = part === 'kid' ? walker.id : `${walker.id}:buddy`
    this.bubbles.set(key, BUBBLE_S)
    this.events.bubble(key, { text, emoji })
    if (part === 'kid') walker.hop()
    else walker.buddy.jump = 0.5
    if (walker === this.me && part === 'kid' && this.happyTexture) {
      walker.kid.body.texture = this.happyTexture
      this.happyLeft = HAPPY_S
    }
  }

  private petBuddy() {
    const me = this.me
    if (!me || !this.inputEnabled) return
    this.hearts(me.buddy)
    this.say(me, 'buddy', '💖', true)
    this.events.toast(`${this.cast.me.buddyName} loves you!`)
  }

  /** Floating hearts over a figure. */
  private hearts(figure: Figure) {
    const fx = this.layers?.fx
    if (!fx || this.still) return
    const colors = [0xff7a9a, 0xff9fb4, 0xef6f5e]
    for (let i = 0; i < 7; i++) {
      const color = colors[i % 3]
      const g = new Graphics()
      g.circle(-5, -3, 6).fill(color)
      g.circle(5, -3, 6).fill(color)
      g.poly([-10.5, -0.5, 10.5, -0.5, 0, 11]).fill(color)
      g.position.set(figure.topX + (Math.random() - 0.5) * 30, figure.topY + 20)
      g.scale.set(0.6 + Math.random() * 0.5)
      fx.addChild(g)
      this.particles.push({ g, vx: (Math.random() - 0.5) * 50, vy: -60 - Math.random() * 60, life: 1.1 + Math.random() * 0.5 })
    }
  }

  private sitDown(seat: Seat) {
    const me = this.me
    if (!me || !me.sit(seat)) return
    this.depthDirty = true
    if (seat.kind === 'bag') {
      this.say(me, 'kid', '📖', true)
      this.events.toast('Word Nook games are coming soon')
    }
  }

  private reachDoor() {
    this.onMat = true
    this.events.atDoor()
  }

  /** The closest thing the Student can do from where they stand. */
  private findAction(): (NearAction & { run: () => void }) | null {
    const me = this.me
    if (!me || !this.inputEnabled) return null
    if (me.seat) {
      return {
        id: 'stand',
        label: 'Stand up',
        run: () => {
          me.stand()
          this.depthDirty = true
        },
      }
    }
    let best: (NearAction & { run: () => void }) | null = null
    let bestDist = Infinity
    for (const mate of this.classmates) {
      const d = Math.hypot(mate.x - me.x, mate.y - me.y)
      if (d < 1.3 && d < bestDist) {
        bestDist = d
        best = { id: `wave:${mate.id}`, label: `Wave to ${this.names.get(mate.id)?.name ?? 'them'}`, run: () => this.wave(mate.id) }
      }
    }
    for (const spot of ACTION_SPOTS) {
      // The Star Students board hangs on the left wall, which only stands in the diagonal view.
      if (spot.id === 'stars' && !this.proj.diag) continue
      const d = Math.hypot(spot.x - me.x, spot.y - me.y)
      if (d < spot.r && d < bestDist) {
        bestDist = d
        const { id } = spot
        best = { id: `spot:${id}`, label: SPOT_LABELS[id], run: () => (id === 'door' ? this.reachDoor() : this.events.tapZone(id)) }
      }
    }
    SEATS.forEach((seat, i) => {
      if (this.seats.has(seat)) return
      const d = Math.hypot(seat.ax - me.x, seat.ay - me.y)
      if (d < 0.8 && d < bestDist) {
        bestDist = d
        best = { id: `sit:${i}`, label: 'Sit', run: () => this.sitDown(seat) }
      }
    })
    // Nothing else around: the buddy is always close by.
    if (!best && !me.kid.moving) best = { id: 'pet', label: `Pet ${this.cast.me.buddyName}`, run: () => this.petBuddy() }
    return best
  }

  // ---------- Every frame ----------

  /** Moving effects on Less, or the OS asks for reduced motion. */
  private get still() {
    return this.options.lessMotion || this.osReducedMotion.matches
  }

  private frame(dt: number) {
    const { app, me, scene } = this
    if (!app || !me || !scene) return
    const still = this.still
    this.time += dt

    for (let i = this.later.length - 1; i >= 0; i--) {
      if (this.later[i].at > this.time) continue
      const [due] = this.later.splice(i, 1)
      due.run()
    }

    // Everyone walks.
    me.update(dt, this.proj, still, this.keyDirection())
    let moved = me.kid.moving || me.buddy.moving
    for (const mate of this.classmates) {
      mate.update(dt, this.proj, still, null)
      moved ||= mate.kid.moving || mate.buddy.moving
    }
    // Sitting down and standing up move a kid without a step, so they also re-sort.
    if (moved || this.depthDirty) {
      sortDepth(scene.items, this.proj.diag)
      this.depthDirty = false
    }
    for (const walker of [me, ...this.classmates]) {
      const sitting = walker.seat !== null
      if (sitting !== this.wasSitting.get(walker)) {
        this.wasSitting.set(walker, sitting)
        this.depthDirty = true
      }
    }

    // Walking onto the door mat asks "Go outside?" (once per visit to the mat).
    const onMat = !me.seat && onDoorMat(me.x, me.y)
    if (onMat && !this.onMat && this.inputEnabled) this.reachDoor()
    this.onMat = onMat

    this.camera.resize(app.screen.width, app.screen.height)
    this.camera.update(dt, me.x, me.y, this.snapCamera || still)
    this.snapCamera = false
    this.parallax?.update(this.camera.x, this.camera.y, dt, still)

    if (!still) {
      this.outside?.animate(this.time, dt)
      if (this.ollie && this.ollieTexture) {
        this.ollie.scale.y = (OLLIE_HEIGHT / this.ollieTexture.height) * (1 + Math.sin(this.time * 2.4) * 0.015)
      }
    }

    // The classmate shows a random emote every so often.
    this.emoteIn -= dt
    if (this.emoteIn <= 0) {
      this.emoteIn = 9 + Math.random() * 9
      const mate = this.classmates[Math.floor(Math.random() * this.classmates.length)]
      if (mate && this.options.classmateEmotes && !this.bubbles.has(mate.id)) {
        const pick = EMOTES[Math.floor(Math.random() * EMOTES.length)]
        this.say(mate, 'kid', pick.text, pick.emoji)
      }
    }

    if (this.happyLeft > 0) {
      this.happyLeft -= dt
      if (this.happyLeft <= 0 && this.calmTexture) me.kid.body.texture = this.calmTexture
    }

    const marker = this.marker
    if (marker?.visible) {
      this.markerAge += dt
      marker.alpha = Math.max(0, 1 - this.markerAge / 1.4)
      if (!still) marker.scale.set(1 + this.markerAge * 0.25)
      if (this.markerAge > 1.4 || (!me.walking && this.markerAge > 0.3)) marker.visible = false
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      p.vy -= 10 * dt
      p.vx *= 0.985
      p.g.x += p.vx * dt
      p.g.y += p.vy * dt
      p.g.alpha = Math.min(1, p.life * 2)
      if (p.life <= 0) {
        p.g.destroy()
        this.particles.splice(i, 1)
      }
    }

    for (const [key, left] of this.bubbles) {
      if (left - dt > 0) this.bubbles.set(key, left - dt)
      else {
        this.bubbles.delete(key)
        this.events.bubble(key, null)
      }
    }

    const action = this.findAction()
    if (action?.id !== this.action?.id || action?.label !== this.action?.label) {
      this.events.near(action ? { id: action.id, label: action.label } : null)
    }
    this.action = action

    this.placeAnchors()

    if (this.fpsEl) {
      this.fpsIn -= dt
      if (this.fpsIn <= 0) {
        this.fpsIn = 0.5
        this.fpsEl.textContent = `${Math.round(app.ticker.FPS)} fps`
      }
    }
  }

  private wasSitting = new WeakMap<Walker, boolean>()

  // ---------- The React elements that follow things in the room ----------

  /** Puts the element's anchor point (ax, ay: 0..1 of its box) at a screen point. */
  private place(el: HTMLElement, sx: number, sy: number, ax: number, ay: number, scale: number) {
    const value = `translate(${Math.round(sx)}px,${Math.round(sy)}px) scale(${scale}) translate(${-ax * 100}%,${-ay * 100}%)`
    if (this.lastTransform.get(el) === value) return
    this.lastTransform.set(el, value)
    el.style.transform = value
  }

  private show(el: HTMLElement, shown: boolean) {
    if (this.lastShown.get(el) === shown) return
    this.lastShown.set(el, shown)
    el.style.visibility = shown ? '' : 'hidden'
  }

  private figureOf(key: string): Figure | null {
    const [id, part] = key.split(':')
    const walker = this.me?.id === id ? this.me : this.classmates.find((c) => c.id === id)
    if (!walker) return null
    return part === 'buddy' ? walker.buddy : walker.kid
  }

  private placeAnchors() {
    const { app, me, camera, proj, anchors } = this
    if (!app || !me || !anchors.size) return
    const ui = this.uiScale
    const W = app.screen.width
    const H = app.screen.height

    for (const [key, el] of anchors) {
      const [kind, id, part] = key.split(':')
      if (kind === 'tag') {
        // Under the kid's feet.
        const kid = this.figureOf(id)
        if (!kid) continue
        const [sx, sy] = camera.toScreen(...proj.P(kid.x, kid.y, kid.z))
        this.place(el, sx, sy + 6, 0.5, 0, ui)
      } else if (kind === 'bubble') {
        const figure = this.figureOf(part ? `${id}:${part}` : id)
        if (!figure) continue
        const [sx, sy] = camera.toScreen(figure.topX, figure.topY)
        this.place(el, sx, sy - 12 * ui, 0.5, 1, ui)
      } else if (kind === 'action') {
        // Over the Student's head, above their bubble if they have one.
        const [sx, sy] = camera.toScreen(me.kid.topX, me.kid.topY)
        this.place(el, sx, sy - 16 - (this.bubbles.has(me.id) ? 50 * ui : 0), 0.5, 1, 1)
      }
    }

    // Zone labels float over their corner. In the Close view, a zone that is
    // off screen gets a round arrow on the screen's edge instead.
    const zoneScale = Math.max(MIN_ZONE_SCALE, ui)
    const pad = 40 + 24 * ui
    const top = 70 + 60 * ui
    const bottom = H - 100 * ui
    for (const id of ZONE_IDS) {
      const label = anchors.get(`zone:${id}`)
      const edge = anchors.get(`edge:${id}`)
      const extra = id === 'ollie' ? anchors.get('excl') : undefined
      const at = ZONES[id].label
      const [sx, sy] = camera.toScreen(...proj.P(at.x, at.y, at.z))
      const onScreen = sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40
      const arrow = !onScreen && camera.mode === 'close'
      if (label) {
        this.show(label, !arrow)
        // Ollie's speech bubble has its tail on the left.
        this.place(label, sx, sy - 8, id === 'ollie' ? 0.12 : 0.5, 1, zoneScale)
      }
      if (extra) {
        this.show(extra, !arrow)
        const [ex, ey] = camera.toScreen(...proj.P(OLLIE_AT.x - 0.55, OLLIE_AT.y - 0.55, at.z + 8))
        this.place(extra, ex, ey - 8, 0.5, 1, zoneScale)
      }
      if (!edge) continue
      this.show(edge, arrow)
      if (!arrow) continue
      const cx = W / 2
      const cy = H / 2
      const dx = sx - cx
      const dy = sy - cy
      const k = Math.min((W / 2 - pad) / Math.abs(dx || 1e-3), (dy < 0 ? cy - top : bottom - cy) / Math.abs(dy || 1e-3))
      this.place(edge, cx + dx * k, cy + dy * k, 0.5, 0.5, 1)
      edge.style.setProperty('--point', `${(Math.atan2(dy, dx) + Math.PI / 2).toFixed(2)}rad`)
    }
  }
}
