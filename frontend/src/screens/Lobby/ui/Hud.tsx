import type { ReactNode } from 'react'
import type { Zoom } from '../game/LobbyGame'
import type { Mission, StudentProgress } from '../lobbyData'
import { useToday } from '../../../games/useToday'
import { dueText } from '../../../games/studentData'
import { EmoteBar } from './EmoteBar'
import { LobbyIcon } from './icons'
import { IS_TOUCH } from './touch'
import { usePhoneSideways } from '../../../hooks/usePhoneSideways'
import { PhoneHud } from './PhoneHud'
import styles from './ui.module.css'

/**
 * The screen UI around the room, kept clean for kids:
 * top left the Student card, top right today's mission and who's here,
 * bottom left My Room (under the Student card on touch screens, where the
 * joystick takes the bottom left), bottom middle the emote bar, bottom right Zoom, the
 * Settings gear and All games. A phone held sideways gets the folded-up PhoneHud
 * instead (no Zoom button there: Settings has Camera: Close / Far).
 */
export function Hud({
  student,
  headUrl,
  mission,
  classmatesHere,
  zoom,
  showHint,
  onStart,
  onMission,
  onMyRoom,
  onAllGames,
  onZoom,
  onSettings,
  onEmote,
  children,
}: {
  /** `name`: the buddy's name (Students have no names in KIDDEX). */
  student: StudentProgress & { name: string }
  /** The Student's picture; the card shows the head. */
  headUrl: string
  mission: Mission
  classmatesHere: number
  zoom: Zoom
  /** "WASD or click to walk" ("Use the joystick to walk" on touch screens), until the first move. */
  showHint: boolean
  /** Plays the next mission game. */
  onStart: () => void
  /** Opens Ollie's mission card (the note's View, when the mission is complete). */
  onMission: () => void
  onMyRoom: () => void
  onAllGames: () => void
  onZoom: () => void
  onSettings: () => void
  onEmote: (text: string, emoji: boolean) => void
  /** The toast. */
  children?: ReactNode
}) {
  const phone = usePhoneSideways()
  if (phone) {
    return (
      <PhoneHud {...{ student, headUrl, mission, classmatesHere, showHint, onStart, onMission, onMyRoom, onAllGames, onSettings, onEmote }}>
        {children}
      </PhoneHud>
    )
  }

  const xpPercent = Math.min(100, Math.round((student.xp / student.xpGoal) * 100))
  const studentCard = (
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
  )
  const myRoom = (
    <button type="button" className={styles.pill} onClick={onMyRoom}>
      <span className={styles.pillIcon}>
        <LobbyIcon name="house" />
      </span>
      My Room
    </button>
  )

  return (
    <div className={styles.hud}>
      {/* Touch screens: My Room right under the Student card (the joystick is bottom left). */}
      {IS_TOUCH ? (
        <div className={styles.topLeft}>
          {studentCard}
          {myRoom}
        </div>
      ) : (
        studentCard
      )}

      <div className={`${styles.hint} ${showHint ? '' : styles.hintGone}`} aria-hidden={!showHint}>
        {IS_TOUCH ? (
          'Use the joystick to walk'
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
        <MissionNote mission={mission} onPlay={onStart} onView={onMission} onAllGames={onAllGames} />
        <div className={styles.online}>
          <span className={styles.dot} aria-hidden="true" />
          {classmatesHere} {classmatesHere === 1 ? 'classmate' : 'classmates'} here
        </div>
      </div>

      {!IS_TOUCH && <div className={styles.bottomLeft}>{myRoom}</div>}

      <EmoteBar onEmote={onEmote} />

      <div className={styles.bottomRight}>
        {/* Hidden on a phone held sideways (ui.module.css): zoom is in Settings, Camera Close / Far. */}
        <button type="button" className={`${styles.round} ${styles.zoomButton}`} onClick={onZoom} aria-label={zoom === 'close' ? 'Zoom out' : 'Zoom in'}>
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

/** The pinned note, top right: today's mission (open, complete) or "No mission yet". */
function MissionNote({
  mission,
  onPlay,
  onView,
  onAllGames,
}: {
  mission: Mission
  onPlay: () => void
  onView: () => void
  onAllGames: () => void
}) {
  const today = useToday()
  if (mission.state === 'none') {
    return (
      <section className={styles.note} aria-label="Today's mission">
        <span className={styles.pin} aria-hidden="true" />
        <div className={styles.kicker}>Today's mission</div>
        <h2 className={styles.noteTitle}>No mission yet</h2>
        <div className={styles.noteSub}>Practice your lessons in All games</div>
        <div className={styles.noteRow}>
          <button type="button" className={styles.start} onClick={onAllGames}>
            All games
          </button>
        </div>
      </section>
    )
  }

  const complete = mission.state === 'complete'
  const due = mission.dueDate ? dueText(mission.dueDate, today, 'note') : null
  const subject = mission.subject ? `${mission.subject} · ` : ''
  const line = complete
    ? `${subject}All ${mission.games.length} ${mission.games.length === 1 ? 'game' : 'games'} done ✓`
    : `${subject}${mission.done.length} of ${mission.games.length} games${due ? ` · ${due}` : ''}`
  return (
    <section className={styles.note} aria-label="Today's mission">
      <span className={styles.pin} aria-hidden="true" />
      <div className={styles.kicker}>Today's mission{mission.teacher ? ` · ${mission.teacher}` : ''}</div>
      <h2 className={styles.noteTitle}>{mission.name}</h2>
      <div className={styles.noteSub}>{line}</div>
      <div className={styles.noteRow}>
        <span className={styles.chip}>{complete ? 'Mission complete' : `Up to +${mission.maxXp} XP`}</span>
        <button type="button" className={styles.start} onClick={complete ? onView : onPlay}>
          {complete ? 'View' : 'Play'}
        </button>
      </div>
    </section>
  )
}
