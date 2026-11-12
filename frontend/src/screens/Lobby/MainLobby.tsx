import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { SECTION } from '../../setup/customizeData'
import { isWalkKey, LobbyGame, type BubbleContent, type NearAction, type ZoneId } from './game/LobbyGame'
import { ZONE_IDS } from './game/room'
import type { LobbyData } from './lobbyData'
import { ActionButton } from './ui/ActionButton'
import { BoardCard } from './ui/BoardCard'
import { BuddyCard } from './ui/BuddyCard'
import { ComingSoonCard, type SoonKind } from './ui/ComingSoonCard'
import { DoorCard } from './ui/DoorCard'
import { HowToPlayCard } from './ui/HowToPlayCard'
import { Hud } from './ui/Hud'
import { LobbyIcon, type LobbyIconName } from './ui/icons'
import { MissionCard } from './ui/MissionCard'
import { OpeningClassroom } from './OpeningClassroom'
import { SettingsCard } from './ui/SettingsCard'
import { Toast } from './ui/Toast'
import { useLobbyCast, type LobbyStudent } from './useLobbyCast'
import { useLobbySettings } from './useLobbySettings'
import styles from './LobbyScreen.module.css'

type Card =
  | { type: 'howto' | 'settings' | 'door' | 'mission' | 'board' }
  | { type: 'buddy'; id: string }
  | { type: 'soon'; kind: SoonKind }

/** The floating labels over the game corners, and their edge arrows. */
const ZONE_UI: Record<ZoneId, { name: string; sub?: string; icon: LobbyIconName; tint?: string }> = {
  ollie: { name: 'Ollie', icon: 'owl' },
  nook: { name: 'Word Nook', sub: 'Tap to play', icon: 'book', tint: '--color-tint-pink' },
  stage: { name: 'Quiz Stage', sub: 'Tap to play', icon: 'mic', tint: '--color-tint-lavender' },
  match: { name: 'Match Corner', sub: 'Tap to play', icon: 'puzzle', tint: '--color-tint-mint' },
  door: { name: 'Outside', sub: 'To the island', icon: 'palm' },
}

const HOWTO_KEY = 'kiddex.lobby.howto'
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

const SHOW_FPS = import.meta.env.DEV && new URLSearchParams(window.location.search).has('fps')

/**
 * The Main Lobby: the Student's section classroom on Rene Island. The room is
 * a Pixi canvas (game/LobbyGame.ts); everything on top of it is React.
 */
/** The mini games the Lobby opens: from a game corner, or the mission's Start. */
export type LobbyGameId = 'quiz-show' | 'match-up'
export type LobbyGameFrom = 'stage' | 'match' | 'mission'

export function MainLobby({
  student,
  data,
  onLogOut,
  onPlay,
  startAt,
}: {
  student: LobbyStudent
  data: LobbyData
  onLogOut: () => void
  /** Opens a mini game (without it, the corners say Coming soon). */
  onPlay?: (game: LobbyGameId, from: LobbyGameFrom) => void
  /** Back from a mini game: start at that game's corner. */
  startAt?: 'stage' | 'match'
}) {
  const { mission, classmates, ollieLines } = data
  const [settings, changeSettings] = useLobbySettings()
  const { cast, failed: castFailed } = useLobbyCast(student, classmates)

  const hostRef = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState<LobbyGame | null>(null)
  const [gameFailed, setGameFailed] = useState(false)
  const [card, setCard] = useState<Card | null>(() => (howToSeen() ? null : { type: 'howto' }))
  const [near, setNear] = useState<NearAction | null>(null)
  const [bubbles, setBubbles] = useState<Record<string, BubbleContent>>({})
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [walkingWith, setWalkingWith] = useState<string | null>(null)
  const [ollieLine, setOllieLine] = useState(0)
  const [scale, setScale] = useState(hudScale)
  const [playAnyway, setPlayAnyway] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(HOWTO_KEY, '1')
    } catch {
      // Ignore: How to play just opens again next visit.
    }
  }, [])

  // The words on the walls.
  const roomText = useMemo(
    () => ({
      hello: `Hello, ${SECTION.split('–').pop()?.trim() ?? SECTION}!`,
      today: `Today: ${mission.title}`,
      banner: SECTION,
    }),
    [mission.title],
  )

  // The latest onPlay and the first startAt, for the game's callbacks (created once).
  const playRef = useRef(onPlay)
  useEffect(() => {
    playRef.current = onPlay
  }, [onPlay])
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
      { angle: saved.angle, zoom: saved.zoom, classmateEmotes: saved.emotes, lessMotion: saved.motion === 'less', startAt: startAtRef.current },
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
          else if (id === 'stage' && playRef.current) playRef.current('quiz-show', 'stage')
          else if (id === 'match' && playRef.current) playRef.current('match-up', 'match')
          else setCard({ type: 'soon', kind: id })
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
      },
    )
    void created.start()
    return () => {
      created.destroy()
      setGame(null)
    }
  }, [cast, roomText])

  // Settings -> game.
  useEffect(() => {
    if (!game) return
    game.setAngle(settings.angle)
    game.setZoom(settings.zoom)
    game.setOptions({ classmateEmotes: settings.emotes, lessMotion: settings.motion === 'less' })
  }, [game, settings])

  useEffect(() => {
    const onResize = () => setScale(hudScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
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

  const close = () => setCard(null)
  const soon = (kind: SoonKind) => setCard({ type: 'soon', kind })
  /** The mission's Start: Quiz Show, the first mission game. */
  const startMission = () => (onPlay ? onPlay('quiz-show', 'mission') : soon('mission'))
  const buddyCardOf = card?.type === 'buddy' ? classmates.find((c) => c.id === card.id) : undefined
  const buddyCardArt = buddyCardOf && cast?.classmates.find((c) => c.id === buddyCardOf.id)
  const failed = castFailed || gameFailed
  const rootStyle = { '--s': scale, '--tag-scale': Math.max(0.68, scale) } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle}>
      <div ref={hostRef} className={styles.game} />

      {game && cast && (
        <>
          {/* Things that follow the room: the game moves them every frame. */}
          <div className={styles.world}>
            {ZONE_IDS.filter((id) => id !== 'ollie').map((id) => {
              const zone = ZONE_UI[id]
              return (
                <button
                  key={id}
                  ref={game.anchorRef(`zone:${id}`)}
                  type="button"
                  className={`${styles.anchored} ${styles.zone} ${id === 'door' ? styles.zoneDoor : ''}`}
                  style={zone.tint ? ({ '--tint': `var(${zone.tint})` } as CSSProperties) : undefined}
                  onClick={() => game.walkToZone(id)}
                >
                  <span className={styles.zoneIcon}>
                    <LobbyIcon name={zone.icon} />
                  </span>
                  <span>
                    <b>{zone.name}</b>
                    <small>{zone.sub}</small>
                  </span>
                </button>
              )
            })}
            <button ref={game.anchorRef('zone:ollie')} type="button" className={`${styles.anchored} ${styles.ollieBubble}`} onClick={() => game.walkToZone('ollie')}>
              {ollieLines[ollieLine % ollieLines.length]}
            </button>
            <span ref={game.anchorRef('excl')} className={`${styles.anchored} ${styles.excl}`} aria-hidden="true">
              !
            </span>

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
            <span ref={game.anchorRef(`tag:${cast.me.id}`)} className={`${styles.anchored} ${styles.tag} ${styles.tagYou}`}>
              <i className={styles.dot} />
              {student.name} (you)
            </span>

            {Object.entries(bubbles).map(([who, bubble]) => (
              <span key={who} ref={game.anchorRef(`bubble:${who}`)} className={`${styles.anchored} ${styles.bubble} ${bubble.emoji ? styles.bubbleEmoji : ''}`}>
                {bubble.text}
              </span>
            ))}

            {near && !card && <ActionButton key={near.id} label={near.label} anchorRef={game.anchorRef('action')} onRun={() => game.runAction()} />}
          </div>

          <Hud
            student={{ ...data.student, name: student.name }}
            headUrl={cast.me.kid.url}
            mission={mission}
            classmatesHere={classmates.length}
            zoom={settings.zoom}
            showHint={!hasMoved}
            onStart={startMission}
            onMyRoom={() => soon('myRoom')}
            onAllGames={() => soon('allGames')}
            onZoom={() => changeSettings({ zoom: settings.zoom === 'close' ? 'far' : 'close' })}
            onSettings={() => setCard({ type: 'settings' })}
            onEmote={(text, emoji) => game.emote(text, emoji)}
          >
            {toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
          </Hud>

          {SHOW_FPS && <output ref={(el) => game.setFpsElement(el)} className={styles.fps} />}

          {card?.type === 'howto' && <HowToPlayCard buddyName={student.buddyName} onClose={close} />}
          {card?.type === 'settings' && (
            <SettingsCard settings={settings} onChange={changeSettings} onHowTo={() => setCard({ type: 'howto' })} onLogOut={onLogOut} onClose={close} />
          )}
          {card?.type === 'door' && <DoorCard onGo={() => soon('island')} onClose={close} />}
          {card?.type === 'mission' && <MissionCard mission={mission} onStart={startMission} onClose={close} />}
          {card?.type === 'board' && <BoardCard mission={mission} onClose={close} />}
          {card?.type === 'soon' && <ComingSoonCard kind={card.kind} onClose={close} />}
          {buddyCardOf && buddyCardArt && (
            <BuddyCard
              classmate={buddyCardOf}
              kidUrl={buddyCardArt.kid.url}
              buddyUrl={buddyCardArt.buddy.url}
              walking={walkingWith === buddyCardOf.id}
              onWave={() => {
                close()
                game.wave(buddyCardOf.id)
              }}
              onWalk={(walk) => {
                close()
                game.setFollow(buddyCardOf.id, walk)
                setWalkingWith(walk ? buddyCardOf.id : null)
              }}
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
            <div className={styles.messageButtons}>
              <button type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
              <button type="button" onClick={onLogOut}>
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phones and tablets held upright (CSS shows it): the room needs landscape. */}
      {!playAnyway && (
        <div className={styles.rotate}>
          <div className={styles.message}>
            <svg viewBox="0 0 64 64" width="90" height="90" aria-hidden="true">
              <rect x="18" y="6" width="28" height="52" rx="6" />
              <circle cx="32" cy="50" r="2.5" />
            </svg>
            <h1>Turn your phone sideways</h1>
            <p>The classroom is wider than it is tall.</p>
            <div className={styles.messageButtons}>
              <button type="button" onClick={() => setPlayAnyway(true)}>
                Play anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
