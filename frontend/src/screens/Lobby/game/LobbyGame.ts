/**
 * The Main Lobby game: owns the Pixi app and the frame loop.
 *
 * Everything in the room is drawn here. The UI on top (HUD, name tags,
 * bubbles, cards) is React; the two talk in a small, fixed way:
 *
 * - The game sends events (LobbyEvents): what the Student is near, who or what
 *   was tapped, bubbles to show, toasts.
 * - React calls methods: setAngle, setZoom, setOptions, walkToZone, runAction,
 *   emote, wave, and for real classmates addClassmate, moveClassmate, ...
 * - Real classmates (the live Lobby, useLiveLobby.ts) come and go while the
 *   room is open; their pages send where they are, the game walks them there.
 * - Tags, bubbles, zone labels and the action button are React elements that
 *   React hands over with setAnchor(key, element). The game moves them every
 *   frame by writing `transform`, so there is no React state per frame.
 */
import { Application, Container, Graphics, ImageSource, Polygon, Sprite, Texture } from 'pixi.js'
import type { CharacterPicture } from '../characterTexture'
import { Camera, type Zoom } from './camera'
import { sortDepth } from './depth'
import { drawOutside, type Outside } from './drawOutside'
import { drawFloor, drawFurniture, drawRailing, drawWalls, type Furniture, type RoomText } from './drawRoom'
import { EMOTES } from './emotes'
import { drawParallax, type Parallax } from './parallax'
import type { Point } from './pathfind'
import { makeProjection, type Angle, type Projection } from './projection'
import {
  ACTION_SPOTS,
  DESK_SEAT,
  floorHeight,
  insideRoom,
  isFree,
  OLLIE_AT,
  onDoorMat,
  SEATS,
  STAGE,
  STAR_BOARD,
  START,
  TEACHER_DESK,
  TEACHER_DESK_H,
  ZONE_IDS,
  ZONES,
  type Seat,
  type SpotId,
  type ZoneId,
} from './room'
import { makeLayers, makeScene, type Layers, type Scene } from './scene'
import { Walker, type Figure, type FigureArt, type Lid, type LimbPiece, type SeatBook } from './walker'

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
  /** The Student and their buddy. null in the Teacher's view: Ollie is the Teacher there. */
  me: CastMember | null
  ollie: HTMLImageElement
}

/** Where someone is: a floor spot, and the chair they sit on (its number in SEATS), or null. */
export interface FloorSpot {
  x: number
  y: number
  seat: number | null
}

/** The Teacher's Ollie, as a walker id (and its name tag's anchor key). */
export const TEACHER_ID = 'teacher'

export interface LobbyOptions {
  angle: Angle
  zoom: Zoom
  /** Show the classmates' emotes (Settings). */
  classmateEmotes: boolean
  /** Moving effects: Less. No parallax, bob or drifting clouds. */
  lessMotion: boolean
  /** Back from a mini game: the Student starts at that game's corner. */
  startAt?: ZoneId
  /** How big the Class Garden has grown: 0 (just planted) .. 4 (in bloom). */
  gardenStage: number
  /**
   * The Teacher's view-only visit: the Teacher is Ollie, who starts sitting on
   * the Teacher's Desk and hops around. No Student actions (sit, pet, wave,
   * emotes, the door).
   */
  viewer?: boolean
}

/** The places with something new to do: they get a "!" and an edge arrow, and their label stays up. */
export type ZoneNews = Partial<Record<ZoneId, boolean>>

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
  /** Where the Student is now (the live Lobby sends it to the classmates). A few times a second while it changes. */
  spot?: (spot: FloorSpot) => void
  /** The Student showed an emote (its number in EMOTES): the live Lobby sends it too. */
  emoted?: (emote: number) => void
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
  shop: 'Open Star Shop',
  stage: 'Prize Wheel',
  match: 'Class Garden',
  door: 'Go outside',
}

/** A zone's label shows when the Student is this close (tiles), or when it has news. */
const LABEL_NEAR = 4.2

/**
 * The fonts for the words on the walls. Asked for as soon as this file loads
 * (the Customize screen preloads it), so they are usually ready before the
 * room is drawn.
 */
const fontsReady: Promise<unknown> = Promise.all(
  ['400', '500', '600', '700'].map((weight) => document.fonts.load(`${weight} 16px Fredoka`)),
).catch(() => {})

const STUDENT_SPEED = 3.4
/** A bit faster than the Student, so a classmate catches up with where their page says they are. */
const CLASSMATE_SPEED = STUDENT_SPEED * 1.15
/** How often the Student's spot goes to the classmates while it changes (seconds). */
const SPOT_EVERY_S = 0.16
const BUBBLE_S = 2.6
const HAPPY_S = 2.4
const OLLIE_HEIGHT = 98
/** The Teacher's Ollie, hopping around: a little smaller than behind the desk. */
const TEACHER_OLLIE_HEIGHT = 90
/**
 * Ollie's eyelids, in 0..1 of his picture (ollie-cutout, 428x600): the same
 * places as the setup storybook's blinking Ollie (OllieLive.module.css).
 */
const OLLIE_LIDS = [
  { x: 0.345, y: 0.328 },
  { x: 0.716, y: 0.328 },
]
const OLLIE_LID_W = 0.17
const OLLIE_LID_H = 0.15
const MAX_DT = 0.05
/** Zone labels are buttons: they never shrink under a 44px tap target. */
const MIN_ZONE_SCALE = 0.82

interface Particle {
  g: Graphics
  vx: number
  vy: number
  life: number
}

/**
 * A free spot near `spot`, a little different each time: classmates coming in
 * (or back from a game) don't all stand on the very same spot.
 */
function nearbyFreeSpot(spot: Point): Point {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = 0.3 + Math.random() * 0.6
    const x = spot.x + Math.cos(angle) * r
    const y = spot.y + Math.sin(angle) * r
    if (insideRoom(x, y) && isFree(x, y)) return { x, y }
  }
  return spot
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
  private furniture: Furniture | null = null
  private news: ZoneNews = {}
  private wheelSpin = 0
  private marker: Graphics | null = null
  private markerAge = 0

  private seats: SeatBook = new Map()
  private me: Walker | null = null
  private classmates: Walker[] = []
  private names = new Map<string, CastMember>()
  /** Each classmate's textures, destroyed when they leave. */
  private mateTextures = new Map<string, Texture[]>()
  private spotIn = 0
  private lastSpot = ''

  private keys = new Set<string>()
  /** The joystick (touch screens): a screen direction, 0..1 long (1 = full walking speed). */
  private stick: Point | null = null
  private inputEnabled = true
  private osReducedMotion: MediaQueryList
  private time = 0
  private snapCamera = true
  private depthDirty = true
  private hasMoved = false
  private onMat = false
  private happyLeft = 0
  private action: (NearAction & { run: () => void }) | null = null
  private bubbles = new Map<string, number>()
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
    if (cast.me) this.names.set(cast.me.id, cast.me)
  }

  private get viewer() {
    return this.options.viewer === true
  }

  /** Re-measures the canvas (MainLobby calls it when the screen size may have changed). */
  refit() {
    this.app?.resize()
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
    for (const textures of this.mateTextures.values()) for (const texture of textures) texture.destroy(true)
    this.mateTextures.clear()
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
      this.stick = null
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
    return figureArt(picture, (canvas) => this.textureOf(canvas))
  }

  private makeCast() {
    const { me, ollie } = this.cast
    this.ollieTexture = this.textureOf(ollie)

    if (me && !this.viewer) {
      const meArt = this.artOf(me.kid)
      // A cut kid's face is in its head layer: the happy face swaps only that.
      this.calmTexture = meArt.limbs?.head.texture ?? meArt.texture
      const happy = me.happy
      this.happyTexture = happy ? this.textureOf(meArt.limbs && happy.limbs ? happy.limbs.head.canvas : happy.canvas) : null
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
      const start = nearbyFreeSpot(this.options.startAt ? ZONES[this.options.startAt].spot : START)
      this.me.place(start.x, start.y)
    } else {
      // The Teacher is Ollie: no walking art, so he hops. He starts sitting on
      // the Teacher's Desk every visit. Tapping him does nothing (the mission
      // reminder is for Students).
      const texture = this.ollieTexture
      const { width: w, height: h } = texture
      const lids: Lid[] = OLLIE_LIDS.map((eye) => ({
        x: (eye.x - 0.5) * w,
        y: (eye.y - 1) * h,
        rx: (OLLIE_LID_W * w) / 2,
        ry: (OLLIE_LID_H * h) / 2,
      }))
      this.me = new Walker({
        id: TEACHER_ID,
        you: true,
        speed: STUDENT_SPEED,
        kid: { texture, anchorX: 0.5, anchorY: 1, bodyPx: h },
        seats: this.seats,
        onTapKid: () => {},
        style: 'hop',
        bodyHeight: TEACHER_OLLIE_HEIGHT,
        lids,
      })
      this.me.place(DESK_SEAT.ax, DESK_SEAT.ay)
      this.me.sit(DESK_SEAT, true)
    }

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
    this.furniture = drawFurniture(scene, this.options.gardenStage)
    drawRailing(scene)

    // Ollie, behind the Teacher's Desk. (In the Teacher's view he is the Teacher, so not here.)
    if (!this.viewer) {
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
    } else {
      this.ollie = null
      this.addDeskTap()
    }

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

  /** The Teacher's view: tapping the Teacher's Desk sends Ollie back up onto it. */
  private addDeskTap() {
    const { layers, proj } = this
    if (!layers) return
    const { x0, y0, x1, y1 } = TEACHER_DESK
    // The desk's outline on screen: the convex hull of its box's corners.
    const corners: [number, number][] = []
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [0, TEACHER_DESK_H]) corners.push(proj.P(x, y, z))
    const tap = new Container()
    tap.hitArea = new Polygon(convexHull(corners).flat())
    tap.eventMode = 'static'
    tap.cursor = 'pointer'
    tap.on('pointertap', (e) => {
      e.stopPropagation()
      this.sitOnDesk()
    })
    layers.fx.addChild(tap)
  }

  /** Ollie hops to the front of the desk, then up onto it. */
  private sitOnDesk() {
    const me = this.me
    if (!me || !this.inputEnabled || me.seat === DESK_SEAT) return
    this.noteMoved()
    if (me.sitAt(DESK_SEAT, () => (this.depthDirty = true))) this.showMarker(DESK_SEAT.ax, DESK_SEAT.ay, true)
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

  /** Which places have something new (React works it out from the mission and the wheel). */
  setNews(news: ZoneNews) {
    this.news = { ...news }
  }

  /** The Prize Wheel's slices spin fast for a moment (the card shows the real spin). */
  spinWheel(seconds: number) {
    this.wheelSpin = seconds
  }

  /** The Class Garden grew: redraw the room with the new stage. */
  setGardenStage(stage: number) {
    if (stage === this.options.gardenStage) return
    this.options.gardenStage = stage
    if (this.started) this.buildScene()
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

  /** The player's walker id: the Student's, or the Teacher's Ollie. */
  get playerId() {
    return this.me?.id ?? TEACHER_ID
  }

  /** Walks to a game corner, Ollie or the door, then opens its card. */
  walkToZone(id: ZoneId) {
    // The Teacher only looks: walk there, and the corner may show its card (React decides).
    if (this.viewer) {
      if (id === 'door' || id === 'ollie') this.walkTo(ZONES[id].spot, () => {})
      else this.walkTo(ZONES[id].spot, () => this.events.tapZone(id))
      return
    }
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
    if (!this.me) return
    this.say(this.me, 'kid', text, emoji)
    const i = EMOTES.findIndex((e) => e.text === text)
    if (i >= 0 && !this.viewer) this.events.emoted?.(i)
  }

  /** A happy moment for the Student (a prize): happy face, hop and hearts. */
  cheer() {
    const me = this.me
    if (!me) return
    this.say(me, 'kid', '🎉', true)
    this.hearts(me.kid)
  }

  /** You wave at a classmate (everyone sees your 👋). */
  wave() {
    this.emote('👋', true)
  }

  // ---------- Real classmates (the live Lobby) ----------

  /** A classmate came in (or was already here when the Student came in). */
  addClassmate(mate: CastMember, at: FloorSpot) {
    if (this.dead || this.classmates.some((c) => c.id === mate.id)) return
    const textures: Texture[] = []
    const art = (picture: CharacterPicture): FigureArt =>
      figureArt(picture, (canvas) => {
        const texture = new Texture({ source: new ImageSource({ resource: canvas }) })
        textures.push(texture)
        return texture
      })
    const walker = new Walker({
      id: mate.id,
      you: false,
      speed: CLASSMATE_SPEED,
      kid: art(mate.kid),
      buddy: art(mate.buddy),
      seats: this.seats,
      onTapKid: () => this.inputEnabled && this.events.tapPerson(mate.id),
      onTapBuddy: () => this.inputEnabled && this.events.tapPerson(mate.id),
    })
    walker.place(at.x, at.y)
    const seat = at.seat === null ? null : (SEATS[at.seat] ?? null)
    if (seat) walker.sit(seat, true)
    this.mateTextures.set(mate.id, textures)
    this.names.set(mate.id, mate)
    this.classmates.push(walker)
    if (this.scene) walker.attach(this.scene)
    this.depthDirty = true
  }

  /** A classmate left. */
  removeClassmate(id: string) {
    const i = this.classmates.findIndex((c) => c.id === id)
    if (i < 0) return
    const [walker] = this.classmates.splice(i, 1)
    walker.stand()
    walker.detach()
    walker.destroy()
    for (const texture of this.mateTextures.get(id) ?? []) texture.destroy(true)
    this.mateTextures.delete(id)
    this.names.delete(id)
    for (const key of [id, `${id}:buddy`]) {
      if (this.bubbles.delete(key)) this.events.bubble(key, null)
    }
    this.depthDirty = true
  }

  /** A classmate's page sent where they are now: they walk there. */
  moveClassmate(id: string, to: FloorSpot) {
    const walker = this.classmates.find((c) => c.id === id)
    if (!walker) return
    walker.moveTo(to.x, to.y, to.seat === null ? null : (SEATS[to.seat] ?? null))
  }

  /** A classmate showed an emote (its number in EMOTES). Hidden when Settings turns classmates' emotes off. */
  classmateEmote(id: string, emote: number) {
    const walker = this.classmates.find((c) => c.id === id)
    const pick = EMOTES[emote]
    if (!walker || !pick || !this.options.classmateEmotes) return
    this.say(walker, 'kid', pick.text, pick.emoji)
  }

  /** Sends the Student's spot when it changed (at most every SPOT_EVERY_S), or now with `force`. */
  private sendSpot(dt: number, force = false) {
    const me = this.me
    const send = this.events.spot
    if (!me || !send || this.viewer) return
    this.spotIn -= dt
    if (!force && this.spotIn > 0) return
    const seat = me.seat ? SEATS.indexOf(me.seat) : -1
    const spot: FloorSpot = { x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100, seat: seat >= 0 ? seat : null }
    const key = `${spot.x},${spot.y},${spot.seat}`
    if (!force && key === this.lastSpot) return
    this.lastSpot = key
    this.spotIn = SPOT_EVERY_S
    send(spot)
  }

  /** The live Lobby (re)connected: send the Student's spot now. */
  resendSpot() {
    this.sendSpot(0, true)
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
    if (key.length === 1 && emote && !this.viewer) this.emote(emote.text, emote.emoji)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private clearKeys = () => this.keys.clear()

  /**
   * The joystick (ui/Joystick.tsx): a direction on the screen, x right and y
   * down, any angle. Its length (0..1) is the speed: 1 = normal walking
   * speed. (0, 0) = let go, the Student stops. Walking keys win while held.
   */
  setStick(x: number, y: number) {
    const length = Math.hypot(x, y)
    if (length < 1e-3) {
      this.stick = null
      return
    }
    const k = Math.min(1, length) / length
    this.stick = { x: x * k, y: y * k }
    if (this.inputEnabled) {
      this.noteMoved()
      if (this.marker) this.marker.visible = false
    }
  }

  /**
   * The walking keys as a direction on the floor: W walks straight up the
   * screen. With no walking key held, the joystick's direction (shorter =
   * slower). The walker stops it at desks and walls, as for the keys.
   */
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
    if (sx || sy) return this.proj.floorDir(sx, sy)
    const stick = this.stick
    if (!stick) return null
    const dir = this.proj.floorDir(stick.x, stick.y)
    const speed = Math.hypot(stick.x, stick.y)
    return { x: dir.x * speed, y: dir.y * speed }
  }

  private tapFloor(screenX: number, screenY: number) {
    const me = this.me
    if (!me || !this.inputEnabled) return
    const p = this.camera.toFloor(screenX, screenY)
    this.noteMoved()
    if (!insideRoom(p.x, p.y)) {
      if (!this.viewer) this.events.toast('Use the green door to go outside')
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

  /** A bubble over a kid or a buddy, with a small happy jump. */
  private say(walker: Walker, part: 'kid' | 'buddy', text: string, emoji: boolean) {
    const key = part === 'kid' ? walker.id : `${walker.id}:buddy`
    this.bubbles.set(key, BUBBLE_S)
    this.events.bubble(key, { text, emoji })
    if (part === 'kid') walker.hop()
    else if (walker.buddy) walker.buddy.jump = 0.5
    if (walker === this.me && part === 'kid' && this.happyTexture) {
      faceSprite(walker.kid).texture = this.happyTexture
      this.happyLeft = HAPPY_S
    }
  }

  private petBuddy() {
    const me = this.me
    const cast = this.cast.me
    if (!me || !me.buddy || !cast || !this.inputEnabled) return
    this.hearts(me.buddy)
    this.say(me, 'buddy', '💖', true)
    this.events.toast(`${cast.buddyName} loves you!`)
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
  }

  private reachDoor() {
    this.onMat = true
    this.events.atDoor()
  }

  /** The closest thing the Student can do from where they stand. */
  private findAction(): (NearAction & { run: () => void }) | null {
    const me = this.me
    // The Teacher only looks: no action button.
    if (!me || !this.inputEnabled || this.viewer) return null
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
        best = { id: `wave:${mate.id}`, label: `Wave to ${this.names.get(mate.id)?.name ?? 'them'}`, run: () => this.wave() }
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
    if (!best && !me.kid.moving && this.cast.me) best = { id: 'pet', label: `Pet ${this.cast.me.buddyName}`, run: () => this.petBuddy() }
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

    // Everyone walks.
    me.update(dt, this.proj, still, this.keyDirection())
    // Ollie's hop onto or off the desk moves him without a step: re-sort then too.
    let moved = me.kid.moving || !!me.buddy?.moving || me.kid.jump > 0
    for (const mate of this.classmates) {
      mate.update(dt, this.proj, still, null)
      moved ||= mate.kid.moving || !!mate.buddy?.moving
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

    this.sendSpot(dt)

    // Walking onto the door mat asks "Go outside?" (once per visit to the mat).
    const onMat = !me.seat && !this.viewer && onDoorMat(me.x, me.y)
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

    // The Prize Wheel turns slowly when a spin is ready, fast while spinning.
    const wheel = this.furniture?.wheel
    if (wheel) {
      if (this.wheelSpin > 0) {
        this.wheelSpin = Math.max(0, this.wheelSpin - dt)
        wheel.rotation += dt * (2 + this.wheelSpin * 6)
      } else if (!still && this.news.stage) wheel.rotation += dt * 0.6
    }

    if (this.happyLeft > 0) {
      this.happyLeft -= dt
      if (this.happyLeft <= 0 && this.calmTexture) faceSprite(me.kid).texture = this.calmTexture
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

  /** Shows or hides with a short fade (the CSS does the fade, on data-shown). */
  private fade(el: HTMLElement, shown: boolean) {
    if (this.lastShown.get(el) === shown) return
    this.lastShown.set(el, shown)
    el.dataset.shown = shown ? '1' : '0'
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
        // Bottom of the bubble (its tail's tip) just above the head.
        this.place(el, sx, sy - 22 * ui, 0.5, 1, ui)
      } else if (kind === 'action') {
        // Over the Student's head, above their bubble if they have one.
        const [sx, sy] = camera.toScreen(me.kid.topX, me.kid.topY)
        this.place(el, sx, sy - 16 - (this.bubbles.has(me.id) ? 110 * ui : 0), 0.5, 1, 1)
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
      const extra = anchors.get(`excl:${id}`)
      const at = ZONES[id].label
      const [sx, sy] = camera.toScreen(...proj.P(at.x, at.y, at.z))
      const onScreen = sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40
      const news = !!this.news[id]
      // Only places with news get an edge arrow; the rest stay quiet until the Student comes close.
      const arrow = !onScreen && camera.mode === 'close' && news
      const spot = ZONES[id].spot
      const close = Math.hypot(me.x - spot.x, me.y - spot.y) < LABEL_NEAR
      // Ollie's bubble always shows: he is the guide.
      const labelOn = id === 'ollie' || news || close
      // Straight view: the Prize Wheel's label hangs under the front of the stage (tail up),
      // because above the wheel it would cover the banner on the back wall.
      const below = id === 'stage' && !proj.diag
      const [lx, ly] = below ? camera.toScreen(...proj.P(at.x, STAGE.y1 + 0.3, 0)) : [sx, sy]
      if (label) {
        this.fade(label, labelOn && !arrow)
        if (below) label.dataset.below = '1'
        else delete label.dataset.below
        // Ollie's speech bubble has its tail on the left.
        if (below) this.place(label, lx, ly + 8, 0.5, 0, zoneScale)
        else this.place(label, sx, sy - 8, id === 'ollie' ? 0.12 : 0.5, 1, zoneScale)
      }
      if (extra) {
        this.show(extra, news && !arrow)
        // Ollie's "!" floats beside his bubble; the others sit on top of their label.
        const [ex, ey] =
          id === 'ollie'
            ? camera.toScreen(...proj.P(OLLIE_AT.x - 0.95, OLLIE_AT.y - 0.95, at.z + 8))
            : below
              ? [lx, ly + 16]
              : [sx, sy - 58 * zoneScale]
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

/** The convex hull of some points (monotone chain), for a tap area around a drawn box. */
function convexHull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: [number, number][]) => {
    const out: [number, number][] = []
    for (const pt of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], pt) <= 0) out.pop()
      out.push(pt)
    }
    out.pop()
    return out
  }
  return [...half(p), ...half([...p].reverse())]
}

/** A picture as walker art; a cut kid's layers become textures too. */
function figureArt(picture: CharacterPicture, texture: (canvas: HTMLCanvasElement) => Texture): FigureArt {
  const art: FigureArt = { texture: texture(picture.canvas), anchorX: picture.anchorX, anchorY: picture.anchorY, bodyPx: picture.bodyPx }
  const l = picture.limbs
  if (l) {
    const piece = (p: typeof l.core): LimbPiece => ({ texture: texture(p.canvas), x: p.x, y: p.y, pivotX: p.pivotX, pivotY: p.pivotY })
    art.limbs = {
      legLeft: piece(l.legLeft),
      legRight: piece(l.legRight),
      core: piece(l.core),
      head: piece(l.head),
      armLeft: piece(l.armLeft),
      armRight: piece(l.armRight),
      front: l.front ? piece(l.front) : null,
    }
  }
  return art
}

/** The sprite with the face: a cut kid's head, or the whole picture. */
const faceSprite = (f: Figure) => f.limbs?.head ?? f.body
