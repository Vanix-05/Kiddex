import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { boyColorKeys } from '../../companions/boy/colorKeys'
import { Companion } from '../../companions/Companion'
import { girlColorKeys } from '../../companions/girl/colorKeys'
import { companionRegistry, isCompanionId } from '../../companions/registry'
import type { ColorKeys } from '../../companions/rig/recolor'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import type { Avatar } from '../../setup/avatar'
import {
  FAKE_XP,
  ITEMS,
  isLocked,
  levelFromXp,
  lookBuddyExtras,
  lookColors,
  lookBuddyColor,
  lookYouExtras,
  nextUnlock,
  SECTION,
  TABS,
  type CustomizeItem,
  type Look,
  type LookKey,
  type Side,
} from '../../setup/customizeData'
import { cleanNickname, MAX_NICKNAME, petById } from '../../setup/petData'
import { isBuddyId, type BuddyId } from '../../setup/quizData'
import { BridgeCutscene } from './cutscene/BridgeCutscene'
import { Boat, Scene } from './Scene'
import styles from './CustomizeScreen.module.css'

// ---------- Layout (the 1440 x 900 stage, scaled to fit the window) ----------

const STAGE_W = 1440
const STAGE_H = 900
/** The pier's top, where the characters stand. */
const FEET_Y = 638
const AVATAR = { x: 365, size: 430 }
const BUDDY = { x: 600, size: 470 }

// ---------- Timings (ms) ----------

const FIRST_HOP_MS = 1000
const IDLE_EVERY_MS = 3600
const LOCK_MESSAGE_MS = 2000
const SPARKLE_MS = 900

const DEFAULT_BUBBLE = 'Let’s sail to the Lobby! ⛵'

/** The avatar art's own colors, for highlighting the nearest swatch before anything is picked. */
const ART_KEYS: Record<Avatar, ColorKeys> = { boy: boyColorKeys, girl: girlColorKeys }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** The tray area (toggle, tabs, tray, buttons): its own layer at the bottom, from this stage y down. */
const HUD_TOP = 688
/** The tray never shrinks below this, so its 16px labels stay at 14px or more on short screens. */
const MIN_HUD_SCALE = 0.875

/**
 * Scene and tray scales. The tray never goes below MIN_HUD_SCALE; on short
 * screens the scene shrinks a little more instead, so the scene above the tray
 * (stage y 0..688) plus the tray fill the window height exactly, with the
 * tray's top edge on the scene's y = 688 (so nothing in the scene, like the
 * boat, ends up behind the tray). On big screens both use the same scale.
 */
const layoutFor = () => {
  const w = window.innerWidth
  const h = window.innerHeight
  const fit = Math.min(w / STAGE_W, h / STAGE_H)
  const hud = Math.min(Math.max(fit, MIN_HUD_SCALE), w / STAGE_W)
  const hudHeight = (STAGE_H - HUD_TOP) * hud
  const scene = Math.min(w / STAGE_W, (h - hudHeight) / HUD_TOP)
  // Same gap above the stage and under the tray.
  const gap = (h - (HUD_TOP * scene + hudHeight)) / 2
  return { scene, hud, top: gap, bottom: gap }
}

/** How far a companion's feet are from the top of its square image (0..1). */
const feetAt = (id: string) => (isCompanionId(id) ? companionRegistry[id].anchors.feet.y / 100 : 0.95)

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const colorDistance = (a: string, b: string) => {
  const [x, y] = [rgb(a), rgb(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/**
 * The Customize Bridge (/customize), after the first-time setup. The Student
 * and their buddy stand on a pier; Rene Island (the class Lobby) is across the
 * water. The tray dresses up "You" (skin, hair, shirt, extra) or the buddy
 * (color, extra); the ribbon's pencil renames the buddy. "Go to Lobby" plays
 * the Rene Island cutscene the first time (not with reduce motion), then opens /lobby.
 */
export function CustomizeScreen() {
  const navigate = useNavigate()
  const { avatar, companionId, buddyName, look, saveLook, renameBuddy, logOut, seenBridgeCutscene, markBridgeCutsceneSeen } =
    useSession()
  const buddy = isBuddyId(companionId) ? companionId : null
  const [cutscene, setCutscene] = useState(false)

  // Not set up yet (opened directly): back to the first-time setup.
  if (!avatar || !buddy) return <Navigate to={paths.setup.quiz} replace />

  const goToLobby = () => {
    if (seenBridgeCutscene || reducedMotion()) {
      navigate(paths.lobby)
      return
    }
    markBridgeCutsceneSeen() // once only, even if they skip it
    setCutscene(true)
  }

  if (cutscene) {
    return (
      <BridgeCutscene avatar={avatar} buddy={buddy} look={look} buddyName={buddyName} onDone={() => navigate(paths.lobby)} />
    )
  }

  return (
    <Bridge
      avatar={avatar}
      buddy={buddy}
      buddyName={buddyName}
      look={look}
      saveLook={saveLook}
      renameBuddy={renameBuddy}
      onLobby={goToLobby}
      onLogOut={() => {
        logOut()
        navigate(paths.welcome)
      }}
    />
  )
}

type IdleMove = { move: 'hop' | 'lean'; key: number } | null
type Sparkle = { key: number; who: Side }

function Bridge({
  avatar,
  buddy,
  buddyName,
  look,
  saveLook,
  renameBuddy,
  onLobby,
  onLogOut,
}: {
  avatar: Avatar
  buddy: BuddyId
  buddyName: string | null
  look: Look
  saveLook: (look: Look) => void
  renameBuddy: (name: string) => void
  onLobby: () => void
  onLogOut: () => void
}) {
  const pet = petById(buddy)
  const name = buddyName || pet?.name || 'Buddy'
  const level = levelFromXp(FAKE_XP)

  const [layout, setLayout] = useState(layoutFor)
  const [side, setSide] = useState<Side>('you')
  const [tab, setTab] = useState<LookKey>(TABS.you[0].key)
  const [bubble, setBubble] = useState<string | null>(null)
  const [shake, setShake] = useState<{ id: string; key: number } | null>(null)
  const [cheer, setCheer] = useState<Record<Side, number>>({ you: 0, buddy: 0 })
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [idle, setIdle] = useState<IdleMove>(null)
  const [editing, setEditing] = useState(false)

  const nameInput = useRef<HTMLInputElement>(null)
  const cancelEdit = useRef(false)
  const timers = useRef<number[]>([])
  const counter = useRef(0)

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    const onResize = () => setLayout(layoutFor())
    window.addEventListener('resize', onResize)
    const pending = timers.current
    return () => {
      window.removeEventListener('resize', onResize)
      pending.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  // ---------- Buddy idle: one hop after ~1 s, then a hop or a lean every few seconds ----------
  useEffect(() => {
    if (reducedMotion()) return
    const next = (move: 'hop' | 'lean') => setIdle({ move, key: ++counter.current })
    const first = window.setTimeout(() => next('hop'), FIRST_HOP_MS)
    const every = window.setInterval(() => next(Math.random() < 0.5 ? 'hop' : 'lean'), IDLE_EVERY_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [])

  /** Happy bounce + sparkles around the one that just changed. */
  const celebrate = (who: Side) => {
    if (reducedMotion()) return
    setCheer((c) => ({ ...c, [who]: c[who] + 1 }))
    const key = ++counter.current
    setSparkles((s) => [...s, { key, who }])
    later(SPARKLE_MS, () => setSparkles((s) => s.filter((x) => x.key !== key)))
  }

  // ---------- Tray ----------

  const switchSide = (next: Side) => {
    setSide(next)
    if (next === 'you') setEditing(false)
    setTab(TABS[next][0].key)
  }

  /** The picked item in a tab; with no pick yet, the one closest to the art as drawn. */
  const pickedId = (key: LookKey): string | undefined => {
    if (look[key]) return look[key]
    if (key === 'skin' || key === 'hair' || key === 'shirt') {
      const art = ART_KEYS[avatar][key]?.main
      if (!art) return undefined
      const open = ITEMS[key].filter((i) => i.swatch && !isLocked(i))
      return open.sort((a, b) => colorDistance(a.swatch!, art) - colorDistance(b.swatch!, art))[0]?.id
    }
    return ITEMS[key][0]?.id // None / Original
  }

  const pick = (item: CustomizeItem) => {
    if (isLocked(item)) {
      setShake({ id: item.id, key: ++counter.current })
      setBubble(`Reach Lv ${item.level} to unlock it!`)
      const shown = counter.current
      later(LOCK_MESSAGE_MS, () => setBubble((b) => (counter.current === shown ? null : b)))
      return
    }
    saveLook({ ...look, [tab]: item.id })
    celebrate(side)
  }

  // ---------- Rename ----------

  const startRename = () => {
    cancelEdit.current = false
    setEditing(true)
  }

  const finishRename = () => {
    const input = nameInput.current
    setEditing(false)
    if (cancelEdit.current || !input) return
    const next = cleanNickname(input.value).trim()
    if (next && next !== name) {
      renameBuddy(next)
      celebrate('buddy')
    }
  }

  const onNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      nameInput.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit.current = true
      nameInput.current?.blur()
    }
  }

  // ---------- Bits for the page ----------

  const items = ITEMS[tab]
  const unlock = nextUnlock(items)
  const colors = lookColors(look)
  const youExtras = lookYouExtras(look)
  const buddyExtras = lookBuddyExtras(look)
  const buddyColor = lookBuddyColor(look)
  const current = pickedId(tab)

  /** Where a character's square image goes so its feet stand on the pier. */
  const place = (id: string, { x, size }: { x: number; size: number }): CSSProperties => ({
    left: x - size / 2,
    top: FEET_Y - size * feetAt(id),
    width: size,
    height: size,
  })

  const sparkleAt = (who: Side) => (who === 'you' ? { x: AVATAR.x, y: FEET_Y - 250 } : { x: BUDDY.x, y: FEET_Y - 230 })

  return (
    <main className={styles.screen}>
      <div
        className={styles.stage}
        style={{ width: STAGE_W, height: STAGE_H, top: layout.top, transform: `translateX(-50%) scale(${layout.scene})` }}
      >
        <Scene className={styles.scene} />

        <p className={styles.island}>
          <span aria-hidden="true">🌴 </span>Rene Island
          <small>Lobby · {SECTION}</small>
        </p>

        {/* ---------- The boat ---------- */}
        <div className={styles.boat}>
          <div className={styles.bob}>
            <Boat />
          </div>
        </div>

        {/* ---------- The Student and their buddy ---------- */}
        <div className={styles.char} style={place(avatar, AVATAR)}>
          <span className={styles.shadow} aria-hidden="true" />
          <div key={cheer.you} className={cheer.you ? styles.happy : undefined}>
            <Companion id={avatar} className={styles.figure} colors={colors} extras={youExtras} />
          </div>
        </div>

        <div className={styles.char} style={place(buddy, BUDDY)}>
          <span className={`${styles.shadow} ${styles.shadowBuddy}`} aria-hidden="true" />
          <div key={idle?.key ?? 0} className={idle ? styles[idle.move] : undefined}>
            <div key={cheer.buddy} className={cheer.buddy ? styles.happy : undefined}>
              <Companion id={buddy} className={styles.figure} buddyColor={buddyColor} extras={buddyExtras} />
            </div>
          </div>
        </div>

        {sparkles.map(({ key, who }) => {
          const { x, y } = sparkleAt(who)
          return (
            <span key={key} className={styles.sparkles} style={{ left: x, top: y }} aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2
                const vars = { '--dx': `${Math.cos(a) * 110}px`, '--dy': `${Math.sin(a) * 90 - 20}px` } as CSSProperties
                return (
                  <span key={i} className={styles.spark} style={vars}>
                    {i % 2 ? '✦' : '✧'}
                  </span>
                )
              })}
            </span>
          )
        })}

        <p className={styles.bubble} aria-live="polite">
          {bubble ?? DEFAULT_BUBBLE}
        </p>

        {/* ---------- Name ribbon + chip ---------- */}
        <div className={styles.ribbon}>
          <svg className={styles.ribbonArt} viewBox="0 0 420 120" aria-hidden="true">
            <path d="M8 44 L62 44 L62 104 L8 104 L30 74 Z" fill="#e2675e" stroke="#5b3a22" strokeWidth="4" strokeLinejoin="round" />
            <path d="M412 44 L358 44 L358 104 L412 104 L390 74 Z" fill="#e2675e" stroke="#5b3a22" strokeWidth="4" strokeLinejoin="round" />
            <path d="M62 104 L82 90 L62 90 Z" fill="#a9463f" stroke="#5b3a22" strokeWidth="4" strokeLinejoin="round" />
            <path d="M358 104 L338 90 L358 90 Z" fill="#a9463f" stroke="#5b3a22" strokeWidth="4" strokeLinejoin="round" />
            <path d="M46 18 Q210 0 374 18 L374 90 Q210 72 46 90 Z" fill="#f4867c" stroke="#5b3a22" strokeWidth="4.5" strokeLinejoin="round" />
            <path d="M60 28 Q210 12 360 28" fill="none" stroke="#ffd0c8" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
            <path d="M60 80 Q210 64 360 80" fill="none" stroke="#ffd0c8" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
          </svg>
          {/* TODO: show the Student's first name on the You side once the backend sends it. */}
          {side === 'you' ? (
            <h1 className={styles.name}>You</h1>
          ) : editing ? (
            <input
              ref={nameInput}
              className={styles.nameInput}
              defaultValue={name}
              maxLength={MAX_NICKNAME}
              aria-label="Your buddy’s name"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={onNameKey}
              onBlur={finishRename}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          ) : (
            <h1 className={styles.name}>{name}</h1>
          )}
          {side === 'buddy' && (
            <button
              type="button"
              className={styles.pen}
              onMouseDown={(e) => editing && e.preventDefault()} // keep the input focused; its blur saves
              onClick={() => (editing ? nameInput.current?.blur() : startRename())}
              aria-label={editing ? 'Save the name' : 'Rename your buddy'}
            >
              <span aria-hidden="true">✏️</span>
            </button>
          )}
        </div>
        <p className={styles.chip}>
          <span className={`${styles.head} ${styles.chipHead}`} aria-hidden="true">
            <Companion id={buddy} still buddyColor={buddyColor} className={styles.headFigure} />
          </span>
          {pet?.name ?? 'Buddy'} · Lv {level}
        </p>

      </div>

      {/* The tray area: its own layer on the stage's bottom edge, scaled a bit
          less than the scene on short screens so its text stays readable. */}
      <div
        className={styles.hud}
        style={{
          width: STAGE_W,
          height: STAGE_H - HUD_TOP,
          bottom: layout.bottom,
          transform: `translateX(-50%) scale(${layout.hud})`,
        }}
      >
        {/* ---------- You / Buddy toggle ---------- */}
        <div className={styles.toggle} role="group" aria-label="Who to dress up">
          <button type="button" aria-pressed={side === 'you'} onClick={() => switchSide('you')}>
            <span className={styles.head} aria-hidden="true">
              <Companion id={avatar} still colors={colors} className={styles.headFigure} />
            </span>
            You
          </button>
          <button type="button" aria-pressed={side === 'buddy'} onClick={() => switchSide('buddy')}>
            <span className={styles.head} aria-hidden="true">
              <Companion id={buddy} still buddyColor={buddyColor} className={styles.headFigure} />
            </span>
            <span className={styles.toggleName}>{name}</span>
          </button>
        </div>

        {/* ---------- Folder tabs + tray ---------- */}
        <div className={styles.tabs} role="tablist" aria-label={side === 'you' ? 'Dress up you' : `Dress up ${name}`}>
          {TABS[side].map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`cb-tab-${t.key}`}
              aria-selected={t.key === tab}
              aria-controls="cb-tray"
              className={t.key === tab ? styles.tabOn : undefined}
              onClick={() => setTab(t.key)}
            >
              <span aria-hidden="true">{t.icon} </span>
              {t.label}
            </button>
          ))}
        </div>

        <div id="cb-tray" className={styles.tray} role="tabpanel" aria-labelledby={`cb-tab-${tab}`}>
          <ul className={styles.tiles}>
            {items.map((item, i) => {
              const locked = isLocked(item)
              const on = !locked && item.id === current
              const shaking = shake?.id === item.id
              const label = item.label || `${tab === 'skin' ? 'Skin' : 'Color'} ${i + 1}`
              return (
                <li key={`${tab}-${item.id}-${shaking ? shake.key : 0}`}>
                  <button
                    type="button"
                    className={[styles.tile, on && styles.tileOn, locked && styles.tileLocked, shaking && styles.shake]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={locked ? undefined : on}
                    aria-disabled={locked || undefined}
                    aria-label={locked ? `${label}, locked until level ${item.level}` : label}
                    onClick={() => pick(item)}
                  >
                    {tab === 'buddyColor' ? (
                      <span className={styles.colorHead}>
                        <Companion id={buddy} still buddyColor={item.id} className={styles.headFigure} />
                      </span>
                    ) : item.swatch ? (
                      <span className={styles.swatch} style={{ background: item.swatch }} />
                    ) : item.accessory === null ? (
                      <svg className={styles.icon} viewBox="0 0 40 40" aria-hidden="true">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#b9a68c" strokeWidth="4" />
                        <path d="M9 31L31 9" stroke="#b9a68c" strokeWidth="4" />
                      </svg>
                    ) : (
                      <span className={styles.icon} aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    {item.label && <span className={styles.tileLabel}>{item.label}</span>}
                    {locked && <span className={styles.lockTag}>🔒 Lv {item.level}</span>}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className={styles.xp}>
            <span className={styles.xpStar} aria-hidden="true">
              ⭐
            </span>
            <div>
              {unlock ? (
                <>
                  Earn <b>{unlock.xpNeeded} XP</b> more to unlock the {unlock.item.label}!
                </>
              ) : (
                <>Every one here is yours!</>
              )}
              <span
                className={styles.bar}
                role="progressbar"
                aria-label="XP"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((unlock?.progress ?? 1) * 100)}
              >
                <i style={{ width: `${(unlock?.progress ?? 1) * 100}%` }} />
              </span>
            </div>
          </div>
        </div>

        {/* ---------- Buttons ---------- */}
        <button type="button" className={styles.go} onClick={onLobby}>
          Go to Lobby <span aria-hidden="true">→</span>
        </button>
        <p className={styles.out}>
          Not you?{' '}
          <button type="button" onClick={onLogOut}>
            Log out
          </button>
        </p>
      </div>

      <div className={styles.logo}>
        <KiddexLogo size="sm" />
      </div>
    </main>
  )
}
