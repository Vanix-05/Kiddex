import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useSession } from '../../session/session'
import { SECTION } from '../../setup/customizeData'
import { isWalkKey, LobbyGame, type BubbleContent, type NearAction, type ZoneId, type ZoneNews } from './game/LobbyGame'
import { ZONE_IDS } from './game/room'
import type { LobbyData, WheelPrize } from './lobbyData'
import { GardenCard } from './ui/GardenCard'
import { PrizeWheelCard, type WheelState } from './ui/PrizeWheelCard'
import { ActionButton } from './ui/ActionButton'
import { BoardCard } from './ui/BoardCard'
import { BuddyCard } from './ui/BuddyCard'
import { ComingSoonCard, type SoonKind } from './ui/ComingSoonCard'
import { DoorCard } from './ui/DoorCard'
import type { LobbySpot } from '../../games/allGames/pageMemory'
import { HowToPlayCard } from './ui/HowToPlayCard'
import { Hud } from './ui/Hud'
import { Joystick } from './ui/Joystick'
import { IS_TOUCH } from './ui/touch'
import { LobbyIcon, type LobbyIconName } from './ui/icons'
import { MissionCard } from './ui/MissionCard'
import { OpeningClassroom } from './OpeningClassroom'
import { SettingsCard } from './ui/SettingsCard'
import { StarShopCard } from './ui/StarShopCard'
import { Toast } from './ui/Toast'
import { useLobbyCast, type LobbyStudent } from './useLobbyCast'
import type { LiveWho } from './live/liveLobby'
import { useLiveClassmates } from './live/useLiveClassmates'
import { useLobbySettings } from './useLobbySettings'
import { ViewerHud } from './ui/ViewerHud'
import styles from './LobbyScreen.module.css'
import { onViewportChange } from '../../hooks/viewportChange'

type Card =
  | { type: 'howto' | 'settings' | 'door' | 'mission' | 'board' | 'wheel' | 'garden' | 'shop' }
  | { type: 'buddy'; id: string }
  | { type: 'soon'; kind: SoonKind }

/** The floating labels over the game corners, and their edge arrows. */
const ZONE_UI: Record<ZoneId, { name: string; sub?: string; icon: LobbyIconName; tint?: string }> = {
  ollie: { name: 'Ollie', icon: 'owl' },
  // The corners don't start games (every game is in All games): each one does its own small thing.
  shop: { name: 'Star Shop', sub: 'Trade stars for new looks', icon: 'star', tint: '--color-tint-peach' },
  stage: { name: 'Prize Wheel', icon: 'wheel', tint: '--color-tint-lavender' },
  match: { name: 'Class Garden', icon: 'sprout', tint: '--color-tint-mint' },
  door: { name: 'Outside', sub: 'To the island', icon: 'palm' },
}

const HOWTO_KEY = 'kiddex.lobby.howto'
const SPIN_KEY = 'kiddex.lobby.spin'
const today = () => new Date().toISOString().slice(0, 10)

// TODO: the backend keeps today's spin (and adds the stars won); this localStorage copy is FAKE.
/** Today's spin, if the Student already spun (FAKE: localStorage until the backend keeps it). */
function readSpin(): WheelPrize | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SPIN_KEY) ?? 'null') as { date: string; prize: WheelPrize } | null
    return saved?.date === today() ? saved.prize : null
  } catch {
    return null
  }
}

function saveSpin(prize: WheelPrize) {
  try {
    localStorage.setItem(SPIN_KEY, JSON.stringify({ date: today(), prize }))
  } catch {
    // Ignore: the wheel just offers a spin again next visit.
  }
}
/** How to play opens by itself once per session. */
function howToSeen() {
  try {
    return sessionStorage.getItem(HOWTO_KEY) !== null
  } catch {
    return false
  }
}

/** 1 on a big screen; smaller on short ones (1366x650, phones in landscape). */
const hudScale = () => Math.max(0.55, Math.min(1, window.innerHeight / 860, window.innerWidth / 1300))

/** Dev only: ?fps shows the frame rate (read when the Lobby opens, so /teacher/lobby?fps works too). */
const showFps = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('fps')

/** The Teacher's view-only visit (see MainLobby's `viewer`). */
export interface LobbyViewer {
  /** The Teacher's name, on Ollie's name tag: "Ms. Cruz". */
  name: string
  /** The section's classroom: "Grade 4 – Sampaguita". */
  section: string
  /** Back to planner. */
  onBack: () => void
}

/**
 * The Main Lobby: the Student's section classroom on Rene Island. The room is
 * a Pixi canvas (game/LobbyGame.ts); everything on top of it is React.
 */
/**
 * The mini games the Lobby opens itself: only the mission's Start (the next
 * unfinished mission game). Everything else goes through All games.
 */
export type LobbyGameId = 'quiz-show' | 'match-up' | 'fill-blank'
export type LobbyGameFrom = 'mission'
const isLobbyGame = (g: string): g is LobbyGameId => g === 'quiz-show' || g === 'match-up' || g === 'fill-blank'

export function MainLobby({
  student,
  viewer,
  data,
  onLogOut,
  onPlay,
  onAllGames,
  startAt,
  onReady,
  live,
}: {
  /** The logged-in Student and their buddy (not in the Teacher's view). */
  student?: LobbyStudent
  /**
   * The Teacher's view-only visit: the Teacher is Ollie (with their name tag),
   * starting on the Teacher's Desk. No kid or buddy, and nothing only for
   * Students (emotes, sit, pet, the Prize Wheel spin, All games, My Room,
   * the door). Settings has no Log out. Students never see the Teacher.
   */
  viewer?: LobbyViewer
  data: LobbyData
  /** The Student's Log out (the Teacher logs out from the planner). */
  onLogOut?: () => void
  /** Opens a mission game (without it, Start says Coming soon). */
  onPlay?: (game: LobbyGameId, from: LobbyGameFrom) => void
  /** Opens All games; `spot`: the game corner the Student is at, for coming back. */
  onAllGames?: (spot: LobbySpot | null) => void
  /** Back from a mini game: start at that game's corner (the dev Lobby can start at any zone, e.g. ?at=shop). */
  startAt?: ZoneId
  /** The classroom is on screen, or couldn't open (called once). */
  onReady?: () => void
  /** Real classmates: who connects to the live Lobby. None (the dev Lobby): no classmates. */
  live?: LiveWho
}) {
  const { mission, ollieLines, garden, wheel } = data
  const [settings, changeSettings] = useLobbySettings()
  const { cast, failed: castFailed } = useLobbyCast(viewer ? null : (student ?? null))

  const hostRef = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState<LobbyGame | null>(null)
  const [gameFailed, setGameFailed] = useState(false)
  // How to play opens by itself for a Student (once per session), never for the Teacher.
  const [card, setCard] = useState<Card | null>(() => (viewer || howToSeen() ? null : { type: 'howto' }))
  const [near, setNear] = useState<NearAction | null>(null)
  const [bubbles, setBubbles] = useState<Record<string, BubbleContent>>({})
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [ollieLine, setOllieLine] = useState(0)
  const [scale, setScale] = useState(hudScale)
  const [fps] = useState(showFps)
  const [spun, setSpun] = useState<WheelPrize | null>(readSpin)
  /** Stars won on the wheel this visit (FAKE: the backend will add them to the Student's count). */
  const [bonusStars, setBonusStars] = useState(() => readSpin()?.stars ?? 0)

  // Real classmates (the live Lobby). The game sends the Student's spot and emotes through liveRef.
  const liveClassmates = useLiveClassmates(live ?? null, game)
  const { classmates, status: liveStatus } = liveClassmates
  const liveRef = useRef(liveClassmates)
  useEffect(() => {
    liveRef.current = liveClassmates
  }, [liveClassmates])

  // Their Buddy card closes when the classmate leaves.
  if (card?.type === 'buddy' && !classmates.some((c) => c.id === card.id)) setCard(null)

  // The same Student opened the Lobby in another tab: classmates show there now.
  const [shownStatus, setShownStatus] = useState(liveStatus)
  if (liveStatus !== shownStatus) {
    setShownStatus(liveStatus)
    if (liveStatus === 'elsewhere') setToast({ text: 'Your classroom is open in another tab, so your classmates show there', id: -1 })
  }

  // Finishing Ollie's mission earns one spin a day, and waters the Class Garden.
  // The Teacher's view shows the section's garden as it is, and no news (they only look).
  const viewOnly = !!viewer
  const missionDone = !viewOnly && mission.state === 'complete'
  const wheelState: WheelState = !missionDone ? 'locked' : spun ? 'used' : 'ready'
  const gardenDone = Math.min(garden.goal, garden.done + (missionDone ? 1 : 0))
  const gardenStage = gardenDone >= garden.goal ? 4 : Math.min(3, Math.floor((gardenDone / garden.goal) * 4))
  const news: ZoneNews = useMemo(
    () => (viewOnly ? {} : { ollie: mission.state === 'open', stage: wheelState === 'ready' }),
    [viewOnly, mission.state, wheelState],
  )
  const gardenRef = useRef(gardenStage)
  // Fixed for the game's life (it is made once).
  const viewOnlyRef = useRef(viewOnly)

  useEffect(() => {
    if (viewOnly) return
    try {
      sessionStorage.setItem(HOWTO_KEY, '1')
    } catch {
      // Ignore: How to play just opens again next visit.
    }
  }, [viewOnly])

  // The words on the walls.
  const { section: mySection } = useSession()
  const section = viewer?.section ?? mySection ?? SECTION
  const roomText = useMemo(
    () => ({
      hello: `Hello, ${section.split('–').pop()?.trim() ?? section}!`,
      today: mission.state === 'none' ? 'No mission yet' : `Today: ${mission.name}`,
      banner: section,
    }),
    [section, mission.state, mission.name],
  )

  // The first startAt, for the game (created once).
  const startAtRef = useRef(startAt)

  // The game starts with the saved settings; later changes go through its methods.
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Create the game once the pictures are ready; destroy it on the way out.
  useEffect(() => {
    const host = hostRef.current
    if (!cast || !host) return
    const saved = settingsRef.current
    let toasts = 0
    const created = new LobbyGame(
      host,
      cast,
      {
        angle: saved.angle,
        zoom: saved.zoom,
        classmateEmotes: saved.emotes,
        lessMotion: saved.motion === 'less',
        startAt: startAtRef.current,
        gardenStage: gardenRef.current,
        viewer: viewOnlyRef.current,
      },
      roomText,
      {
        ready: () => setGame(created),
        failed: () => setGameFailed(true),
        near: setNear,
        tapPerson: (id) => setCard({ type: 'buddy', id }),
        tapZone: (id) => {
          if (id === 'ollie') setCard({ type: 'mission' })
          else if (id === 'board') setCard({ type: 'board' })
          else if (id === 'stars') setCard({ type: 'soon', kind: 'stars' })
          else if (id === 'stage') {
            // Spinning is for Students.
            if (viewOnlyRef.current) setToast({ text: 'Students spin the Prize Wheel after their mission', id: ++toasts })
            else setCard({ type: 'wheel' })
          }
          else if (id === 'match') setCard({ type: 'garden' })
          // The Star Shop: a Coming soon card (also in the Teacher's view, without the stars line).
          else if (id === 'shop') setCard({ type: 'shop' })
        },
        atDoor: () => setCard({ type: 'door' }),
        bubble: (who, bubble) =>
          setBubbles((prev) => {
            const next = { ...prev }
            if (bubble) next[who] = bubble
            else delete next[who]
            return next
          }),
        toast: (text) => setToast({ text, id: ++toasts }),
        moved: () => setHasMoved(true),
        spot: (spot) => liveRef.current.sendSpot(spot),
        emoted: (emote) => liveRef.current.sendEmote(emote),
      },
    )
    void created.start()
    return () => {
      created.destroy()
      setGame(null)
    }
  }, [cast, roomText])

  useEffect(() => game?.setNews(news), [game, news])
  useEffect(() => game?.setGardenStage(gardenStage), [game, gardenStage])

  // Settings -> game.
  useEffect(() => {
    if (!game) return
    game.setAngle(settings.angle)
    game.setZoom(settings.zoom)
    game.setOptions({ classmateEmotes: settings.emotes, lessMotion: settings.motion === 'less' })
  }, [game, settings])

  useEffect(() => {
    return onViewportChange(() => setScale(hudScale()))
  }, [])
  // The room's canvas too: Pixi only listens for `resize`, which phones can send too early.
  useEffect(() => (game ? onViewportChange(() => game.refit()) : undefined), [game])
  useEffect(() => game?.setUiScale(Math.max(0.68, scale)), [game, scale])

  // No walking or actions while a card is open.
  useEffect(() => game?.setInputEnabled(card === null), [game, card])

  // Escape closes a card; a walking key closes How to play; C turns the camera.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (card) {
        if (e.key === 'Escape' || (card.type === 'howto' && isWalkKey(e.key))) setCard(null)
        return
      }
      if (e.key.toLowerCase() === 'c' && !e.repeat) changeSettings({ angle: settings.angle === 'diag' ? 'straight' : 'diag' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, settings.angle, changeSettings])

  // Ollie's speech bubble rotates a few short lines.
  useEffect(() => {
    const timer = window.setInterval(() => setOllieLine((i) => i + 1), 14000)
    return () => window.clearInterval(timer)
  }, [])

  // The joystick (touch screens) walks the Student; see LobbyGame.setStick.
  const moveStick = useCallback((x: number, y: number) => game?.setStick(x, y), [game])

  const close = () => setCard(null)
  const soon = (kind: SoonKind) => setCard({ type: 'soon', kind })
  const allGames = (spot: LobbySpot | null) => (onAllGames ? onAllGames(spot) : soon('allGames'))
  /** The mission's Play: the next unfinished mission game (the first one again when all are done). No mission: All games. */
  const missionGames = mission.games.filter(isLobbyGame)
  const nextMissionGame = missionGames.find((g) => !mission.done.includes(g)) ?? missionGames[0]
  const startMission = () =>
    mission.state === 'none' || !nextMissionGame ? allGames(null) : onPlay ? onPlay(nextMissionGame, 'mission') : soon('mission')
  const buddyCardOf = card?.type === 'buddy' ? classmates.find((c) => c.id === card.id) : undefined
  const failed = castFailed || gameFailed

  // Tell whoever is covering the Lobby (the loading video) that it can go.
  const shown = game !== null || failed
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])
  useEffect(() => {
    if (shown) onReadyRef.current?.()
  }, [shown])
  const rootStyle = { '--s': scale, '--tag-scale': Math.max(0.68, scale) } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle}>
      <div ref={hostRef} className={styles.game} />

      {game && cast && (
        <>
          {/* Things that follow the room: the game moves them every frame. */}
          <div className={styles.world}>
            {ZONE_IDS.filter((id) => id !== 'ollie' && !(viewer && id === 'door')).map((id) => {
              const zone = ZONE_UI[id]
              return (
                <button
                  key={id}
                  ref={game.anchorRef(`zone:${id}`)}
                  type="button"
                  className={`${styles.anchored} ${styles.zone} ${id === 'door' ? styles.zoneDoor : ''} ${news[id] ? styles.zoneNews : ''}`}
                  style={zone.tint ? ({ '--tint': `var(${zone.tint})` } as CSSProperties) : undefined}
                  onClick={() => game.walkToZone(id)}
                >
                  <span className={styles.zoneIcon}>
                    <LobbyIcon name={zone.icon} />
                  </span>
                  <span>
                    <b>{zone.name}</b>
                    {id === 'stage' && wheelState === 'ready' ? <small>Spin ready!</small> : zone.sub && <small>{zone.sub}</small>}
                  </span>
                </button>
              )
            })}
            {/* Ollie's speech bubble is for Students: in the Teacher's view, Ollie is the Teacher. */}
            {!viewer && (
              <button ref={game.anchorRef('zone:ollie')} type="button" className={`${styles.anchored} ${styles.ollieBubble}`} onClick={() => game.walkToZone('ollie')}>
                {ollieLines[ollieLine % ollieLines.length]}
              </button>
            )}
            {ZONE_IDS.map((id) => (
              <span key={id} ref={game.anchorRef(`excl:${id}`)} className={`${styles.anchored} ${styles.excl}`} aria-hidden="true">
                !
              </span>
            ))}

            {ZONE_IDS.map((id) => (
              <button
                key={id}
                ref={game.anchorRef(`edge:${id}`)}
                type="button"
                className={`${styles.anchored} ${styles.edge}`}
                aria-label={`Go to ${ZONE_UI[id].name}`}
                onClick={() => game.walkToZone(id)}
              >
                <span className={styles.arrow} aria-hidden="true" />
                <LobbyIcon name={ZONE_UI[id].icon} size={26} />
              </button>
            ))}

            {settings.names &&
              classmates.map((mate) => (
                <span key={mate.id} ref={game.anchorRef(`tag:${mate.id}`)} className={`${styles.anchored} ${styles.tag}`}>
                  <i className={styles.dot} />
                  {mate.name}
                </span>
              ))}
            <span ref={game.anchorRef(`tag:${game.playerId}`)} className={`${styles.anchored} ${styles.tag} ${styles.tagYou}`}>
              <i className={styles.dot} />
              {viewer ? viewer.name : `${student?.name ?? ''} (you)`}
            </span>

            {Object.entries(bubbles).map(([who, bubble]) => (
              <span key={who} ref={game.anchorRef(`bubble:${who}`)} className={`${styles.anchored} ${styles.bubble} ${bubble.emoji ? styles.bubbleEmoji : ''}`}>
                {bubble.text}
              </span>
            ))}

            {near && !card && <ActionButton key={near.id} id={near.id} label={near.label} anchorRef={game.anchorRef('action')} onRun={() => game.runAction()} />}
          </div>

          {viewer ? (
            <ViewerHud
              section={viewer.section}
              studentsHere={classmates.length}
              zoom={settings.zoom}
              showHint={!hasMoved}
              onBack={viewer.onBack}
              onZoom={() => changeSettings({ zoom: settings.zoom === 'close' ? 'far' : 'close' })}
              onSettings={() => setCard({ type: 'settings' })}
            >
              {toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
            </ViewerHud>
          ) : (
            <Hud
              student={{ ...data.student, name: student?.name ?? '', stars: data.student.stars + bonusStars }}
              headUrl={cast.me?.kid.url ?? ''}
              mission={mission}
              classmatesHere={classmates.length}
              zoom={settings.zoom}
              showHint={!hasMoved}
              onStart={startMission}
              onMission={() => setCard({ type: 'mission' })}
              onMyRoom={() => soon('myRoom')}
              onAllGames={() => allGames(null)}
              onZoom={() => changeSettings({ zoom: settings.zoom === 'close' ? 'far' : 'close' })}
              onSettings={() => setCard({ type: 'settings' })}
              onEmote={(text, emoji) => game.emote(text, emoji)}
            >
              {toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
            </Hud>
          )}

          {/* Phones and tablets: the walking joystick, bottom left (in the
              Teacher's view-only Lobby it moves Ollie). Hidden while a card is open. */}
          {IS_TOUCH && !card && <Joystick onMove={moveStick} />}

          {fps && <output ref={(el) => game.setFpsElement(el)} className={styles.fps} />}

          {card?.type === 'howto' && <HowToPlayCard buddyName={student?.buddyName ?? ''} onClose={close} />}
          {card?.type === 'settings' && (
            <SettingsCard
              settings={settings}
              onChange={changeSettings}
              onHowTo={viewer ? undefined : () => setCard({ type: 'howto' })}
              onLogOut={viewer ? undefined : onLogOut}
              onClose={close}
            />
          )}
          {card?.type === 'shop' && <StarShopCard stars={viewer ? undefined : data.student.stars + bonusStars} onClose={close} />}
          {card?.type === 'door' && <DoorCard onGo={() => soon('island')} onClose={close} />}
          {card?.type === 'mission' && (
            <MissionCard mission={mission} viewOnly={viewOnly} onPlay={startMission} onAllGames={() => allGames(null)} onClose={close} />
          )}
          {card?.type === 'board' && <BoardCard mission={mission} onClose={close} />}
          {card?.type === 'wheel' && (
            <PrizeWheelCard
              state={wheelState}
              prizes={wheel}
              mission={mission}
              lastPrize={spun}
              lessMotion={settings.motion === 'less'}
              onSpinStart={() => game.spinWheel(3)}
              onWin={(prize) => {
                saveSpin(prize)
                setBonusStars((n) => n + prize.stars)
                game.cheer()
              }}
              onMission={() => setCard({ type: 'mission' })}
              onClose={() => {
                // The prize is kept once it's shown: closing after a win moves the wheel to "used".
                setSpun(readSpin())
                close()
              }}
            />
          )}
          {card?.type === 'garden' && <GardenCard garden={{ ...garden, done: gardenDone }} stage={gardenStage} section={section} onClose={close} />}
          {card?.type === 'soon' && <ComingSoonCard kind={card.kind} onClose={close} />}
          {buddyCardOf && (
            <BuddyCard
              classmate={buddyCardOf}
              kidUrl={buddyCardOf.kidUrl}
              buddyUrl={buddyCardOf.buddyUrl}
              // The Teacher's view: the same card, without Wave.
              onWave={
                viewer
                  ? undefined
                  : () => {
                      close()
                      game.wave()
                    }
              }
              onClose={close}
            />
          )}
        </>
      )}

      {!game && !failed && <OpeningClassroom />}

      {failed && (
        <div className={styles.cover}>
          <div className={styles.message} role="alert">
            <h1>Oops! The classroom can't open here.</h1>
            <p>
              Try Chrome or Edge, and turn on <b>Use graphics acceleration</b> in the browser's settings.
            </p>
            {/* Which part failed, for whoever fixes it: P = drawing the kids, G = the graphics. */}
            <p className={styles.messageCode}>Code {castFailed ? 'P' : 'G'}</p>
            <div className={styles.messageButtons}>
              <button type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
              {viewer ? (
                <button type="button" onClick={viewer.onBack}>
                  Back to planner
                </button>
              ) : (
                <button type="button" onClick={onLogOut}>
                  Log out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
