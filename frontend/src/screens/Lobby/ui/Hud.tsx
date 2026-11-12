import type { ReactNode } from 'react'
import type { Zoom } from '../game/LobbyGame'
import type { Mission, StudentProgress } from '../lobbyData'
import { EmoteBar } from './EmoteBar'
import { LobbyIcon } from './icons'
import { IS_TOUCH } from './touch'
import styles from './ui.module.css'

/**
 * The screen UI around the room, kept clean for kids:
 * top left the Student card, top right today's mission and who's here,
 * bottom left My Room, bottom middle the emote bar, bottom right Zoom, the
 * Settings gear and All games.
 */
export function Hud({
  student,
  headUrl,
  mission,
  classmatesHere,
  zoom,
  showHint,
  onStart,
  onMyRoom,
  onAllGames,
  onZoom,
  onSettings,
  onEmote,
  children,
}: {
  student: StudentProgress
  /** The Student's picture; the card shows the head. */
  headUrl: string
  mission: Mission
  classmatesHere: number
  zoom: Zoom
  /** "WASD or click to walk", until the first move. */
  showHint: boolean
  onStart: () => void
  onMyRoom: () => void
  onAllGames: () => void
  onZoom: () => void
  onSettings: () => void
  onEmote: (text: string, emoji: boolean) => void
  /** The toast. */
  children?: ReactNode
}) {
  const xpPercent = Math.min(100, Math.round((student.xp / student.xpGoal) * 100))
  return (
    <div className={styles.hud}>
      <section className={styles.board} aria-label="You">
        <div className={styles.ava}>
          <img src={headUrl} alt="" draggable={false} />
        </div>
        <div>
          <h2 className={styles.name}>
            {student.name} <span className={styles.lv}>Lv {student.level}</span>
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

      <div className={`${styles.hint} ${showHint ? '' : styles.hintGone}`} aria-hidden={!showHint}>
        {IS_TOUCH ? (
          'Tap the floor to walk'
        ) : (
          <>
            <span className={styles.keys}>
              {['W', 'A', 'S', 'D'].map((k) => (
                <kbd key={k} className={styles.key}>
                  {k}
                </kbd>
              ))}
            </span>
            or click to walk
          </>
        )}
      </div>

      <div className={styles.topRight}>
        <section className={styles.note} aria-label="Today's mission">
          <span className={styles.pin} aria-hidden="true" />
          <div className={styles.kicker}>Today's mission · {mission.teacher}</div>
          <h2 className={styles.noteTitle}>{mission.title}</h2>
          <div className={styles.noteSub}>
            {mission.subject} · {mission.gamesDone} of {mission.games} games · due {mission.due}
          </div>
          <div className={styles.noteRow}>
            <span className={styles.chip}>+{mission.xp} XP</span>
            <span className={styles.chip}>+{mission.stars} stars</span>
            <button type="button" className={styles.start} onClick={onStart}>
              Start
            </button>
          </div>
        </section>
        <div className={styles.online}>
          <span className={styles.dot} aria-hidden="true" />
          {classmatesHere} {classmatesHere === 1 ? 'classmate' : 'classmates'} here
        </div>
      </div>

      <div className={styles.bottomLeft}>
        <button type="button" className={styles.pill} onClick={onMyRoom}>
          <span className={styles.pillIcon}>
            <LobbyIcon name="house" />
          </span>
          My Room
        </button>
      </div>

      <EmoteBar onEmote={onEmote} />

      <div className={styles.bottomRight}>
        <button type="button" className={styles.round} onClick={onZoom} aria-label={zoom === 'close' ? 'Zoom out' : 'Zoom in'}>
          <LobbyIcon name={zoom === 'close' ? 'zoomOut' : 'zoomIn'} size={28} />
        </button>
        <button type="button" className={styles.round} onClick={onSettings} aria-label="Settings">
          <LobbyIcon name="gear" size={28} />
        </button>
        <button type="button" className={`${styles.pill} ${styles.pillOrange}`} onClick={onAllGames}>
          <span className={styles.pillIcon}>
            <LobbyIcon name="pad" />
          </span>
          All games
        </button>
      </div>

      {children}
    </div>
  )
}
