import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { Mission, StudentProgress } from '../lobbyData'
import { EMOTES } from '../game/emotes'
import { LobbyIcon } from './icons'
import styles from './phoneHud.module.css'

/**
 * The Lobby screen UI on a phone held sideways, where the full HUD covered
 * half the room. Same things, folded small:
 * top left a chip (face with an XP ring, level, stars) that drops down the full
 * Student card, and a round My Room button; top right a slim pinned mission note
 * with a big Play, and how many classmates are here; bottom right a 😊 button
 * (the 5 emotes slide out to its left) and the gear, over All games.
 * Laptops and tablets keep the full HUD (Hud.tsx).
 */
export function PhoneHud({
  student,
  headUrl,
  mission,
  classmatesHere,
  showHint,
  onStart,
  onMission,
  onMyRoom,
  onAllGames,
  onSettings,
  onEmote,
  children,
}: {
  student: StudentProgress & { name: string }
  headUrl: string
  mission: Mission
  classmatesHere: number
  showHint: boolean
  onStart: () => void
  onMission: () => void
  onMyRoom: () => void
  onAllGames: () => void
  onSettings: () => void
  onEmote: (text: string, emoji: boolean) => void
  children?: ReactNode
}) {
  const [cardOpen, setCardOpen] = useState(false)
  const [emotesOpen, setEmotesOpen] = useState(false)
  const youRef = useRef<HTMLDivElement>(null)
  const emoteRef = useRef<HTMLDivElement>(null)
  useCloseOnTapOutside(cardOpen, youRef, setCardOpen)
  useCloseOnTapOutside(emotesOpen, emoteRef, setEmotesOpen)

  const xpPercent = Math.min(100, Math.round((student.xp / student.xpGoal) * 100))

  return (
    <div className={styles.hud}>
      <div className={styles.topLeft} ref={youRef}>
        <div className={styles.topLeftRow}>
          <button
            type="button"
            className={styles.youChip}
            aria-label={`You: level ${student.level}, ${student.stars} stars`}
            aria-expanded={cardOpen}
            onClick={() => setCardOpen((open) => !open)}
          >
            {/* The ring fills up with XP toward the next level. */}
            <span className={styles.ring} style={{ background: `conic-gradient(var(--color-lobby-xp) ${xpPercent}%, var(--color-card-bg) 0)` }}>
              <span className={styles.face}>
                <img src={headUrl} alt="" draggable={false} />
              </span>
            </span>
            <span className={styles.lv}>Lv {student.level}</span>
            <span className={styles.stars}>
              <LobbyIcon name="star" size={15} /> {student.stars}
            </span>
          </button>
          <button type="button" className={styles.round} aria-label="My Room" onClick={onMyRoom}>
            <LobbyIcon name="house" size={24} />
          </button>
        </div>

        {cardOpen && (
          <section className={styles.youCard} aria-label="You">
            <span className={styles.bigFace}>
              <img src={headUrl} alt="" draggable={false} />
            </span>
            <div>
              <h2 className={styles.name}>
                {student.name} <span className={styles.lvSmall}>Lv {student.level}</span>
              </h2>
              <div className={styles.xp} role="img" aria-label={`${student.xp} of ${student.xpGoal} XP`}>
                <i style={{ width: `${xpPercent}%` }} />
              </div>
              <div className={styles.meta}>
                <span>
                  {student.xp}/{student.xpGoal} XP
                </span>
                <span>
                  <LobbyIcon name="star" size={14} /> <b>{student.stars}</b>
                </span>
                <span>
                  <LobbyIcon name="flame" size={14} /> <b>{student.streakDays} days</b>
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className={`${styles.hint} ${showHint ? '' : styles.hintGone}`} aria-hidden={!showHint}>
        Use the joystick to walk
      </div>

      <div className={styles.topRight}>
        <MissionBanner mission={mission} onPlay={onStart} onOpen={onMission} onAllGames={onAllGames} />
        <div className={styles.online} aria-label={`${classmatesHere} ${classmatesHere === 1 ? 'classmate' : 'classmates'} here`}>
          <span className={styles.dot} aria-hidden="true" />
          {classmatesHere} here
        </div>
      </div>

      <div className={styles.bottomRight}>
        <div className={styles.row} ref={emoteRef}>
          {emotesOpen && (
            <div className={styles.tray} role="toolbar" aria-label="Emotes">
              {EMOTES.map((emote) => (
                <button
                  key={emote.text}
                  type="button"
                  className={emote.emoji ? styles.emo : styles.phrase}
                  aria-label={emote.emoji ? emote.label : undefined}
                  onClick={() => {
                    onEmote(emote.text, emote.emoji)
                    setEmotesOpen(false)
                  }}
                >
                  {emote.text}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`${styles.round} ${emotesOpen ? styles.roundOn : ''}`}
            aria-label={emotesOpen ? 'Close emotes' : 'Emotes'}
            aria-expanded={emotesOpen}
            onClick={() => setEmotesOpen((open) => !open)}
          >
            {emotesOpen ? <span className={styles.close}>✕</span> : <span className={styles.smile}>😊</span>}
          </button>
          <button type="button" className={styles.round} aria-label="Settings" onClick={onSettings}>
            <LobbyIcon name="gear" size={26} />
          </button>
        </div>
        <button type="button" className={styles.games} onClick={onAllGames}>
          <span className={styles.gamesIcon}>
            <LobbyIcon name="pad" />
          </span>
          All games
        </button>
      </div>

      {children}
    </div>
  )
}

/** The slim pinned note: today's mission and a big Play (or View / All games). Tap the name for Ollie's mission card. */
function MissionBanner({
  mission,
  onPlay,
  onOpen,
  onAllGames,
}: {
  mission: Mission
  onPlay: () => void
  onOpen: () => void
  onAllGames: () => void
}) {
  if (mission.state === 'none') {
    return (
      <section className={styles.banner} aria-label="Today's mission">
        <span className={styles.pin} aria-hidden="true" />
        <div className={styles.bannerText}>
          <span className={styles.kicker}>Today's mission</span>
          <span className={styles.title}>No mission yet</span>
        </div>
        <button type="button" className={styles.play} onClick={onAllGames}>
          Games
        </button>
      </section>
    )
  }
  const complete = mission.state === 'complete'
  return (
    <section className={styles.banner} aria-label="Today's mission">
      <span className={styles.pin} aria-hidden="true" />
      <button type="button" className={styles.bannerText} onClick={onOpen}>
        <span className={styles.kicker}>{complete ? 'Mission complete ✓' : `Today's mission · ${mission.done.length} of ${mission.games.length}`}</span>
        <span className={styles.title}>{mission.name}</span>
      </button>
      <button type="button" className={`${styles.play} ${complete ? '' : styles.nudge}`} onClick={complete ? onOpen : onPlay}>
        {complete ? 'View' : 'Play'}
      </button>
    </section>
  )
}

/** Closes a pop-out when the Student taps anywhere else (the room, another button). */
function useCloseOnTapOutside(open: boolean, ref: RefObject<HTMLElement | null>, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open, ref, setOpen])
}
