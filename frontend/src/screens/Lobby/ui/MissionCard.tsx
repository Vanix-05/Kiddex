import { characterArt } from '../../../assets/art'
import { catalogGame } from '../../../games/catalog'
import { useToday } from '../../../games/useToday'
import { dueText, teacherWords } from '../../../games/studentData'
import type { GameId } from '../../../games/types'
import type { Mission } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import { LobbyIcon } from './icons'
import styles from './ui.module.css'
import m from './mission.module.css'

/** 0 to 3 stars. */
export function MiniStars({ count }: { count: number }) {
  return (
    <span className={m.stars} role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="15" height="15" className={i <= count ? m.on : m.off} aria-hidden="true">
          <path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z" />
        </svg>
      ))}
    </span>
  )
}

/** The mission games: done (best stars + ✓ Done), Up next (the first not done) or Not yet. */
function GameRows({ mission, next }: { mission: Mission; next: GameId | undefined }) {
  return (
    <ul className={m.games}>
      {mission.games.map((id) => {
        const game = catalogGame(id)
        if (!game) return null
        const done = mission.done.includes(id)
        return (
          <li key={id} className={id === next ? m.isNext : ''}>
            <img src={game.thumb} alt="" draggable={false} />
            <span className={m.gname}>{game.name}</span>
            {done ? (
              <span className={m.done}>
                <MiniStars count={mission.bestStars[id] ?? 1} />
                <span className={m.check}>✓ Done</span>
              </span>
            ) : id === next ? (
              <span className={m.next}>Up next</span>
            ) : (
              <span className={m.todo}>Not yet</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Ollie tells the Student about today's mission (mockups m1, m2, m3).
 * `viewOnly`: the Teacher's view of the Lobby (one Okay button, nothing to play).
 */
export function MissionCard({
  mission,
  viewOnly = false,
  onPlay,
  onAllGames,
  onClose,
}: {
  mission: Mission
  viewOnly?: boolean
  /** Plays the next mission game. */
  onPlay: () => void
  onAllGames: () => void
  onClose: () => void
}) {
  const today = useToday()
  const ollie = (
    <BigIcon tint="--color-tint-peach">
      <img src={characterArt.ollie} alt="Ollie" draggable={false} />
    </BigIcon>
  )

  if (mission.state === 'none') {
    return (
      <LobbyCard label="Today's mission" onClose={onClose}>
        {ollie}
        <h2 className={styles.cardTitle}>No mission right now</h2>
        <p className={styles.sub}>Hoo! {teacherWords(mission.teacher, true)} hasn’t given your class a new mission yet.</p>
        <div className={m.note}>
          <LobbyIcon name="book" size={22} />
          {mission.hasLessons ? (
            <span>
              You can still practice your lessons in <b>All games</b>.
            </span>
          ) : (
            <span>Your games will show up here when your teacher gives your class a lesson.</span>
          )}
        </div>
        <div className={styles.acts}>
          {mission.hasLessons && !viewOnly ? (
            <>
              <CardButton onClick={onClose}>Okay</CardButton>
              <CardButton color="orange" primary onClick={onAllGames}>
                All games
              </CardButton>
            </>
          ) : (
            <CardButton color="orange" primary onClick={onClose}>
              Okay
            </CardButton>
          )}
        </div>
      </LobbyCard>
    )
  }

  const complete = mission.state === 'complete'
  const next = mission.games.find((g) => !mission.done.includes(g))
  const due = mission.dueDate ? dueText(mission.dueDate, today, 'card') : null

  return (
    <LobbyCard label="Today's mission" onClose={onClose}>
      {ollie}
      {complete && <div className={m.ribbon}>Mission complete!</div>}
      <h2 className={styles.cardTitle}>{mission.name}</h2>
      <p className={styles.sub}>
        {complete
          ? 'Hoo-hoo! You finished every game. Play again any time for more XP.'
          : `Hoo! ${teacherWords(mission.teacher, true)} made this from your ${mission.subject ? `${mission.subject} ` : ''}lesson, ${mission.lessonTitle}.`}
      </p>
      <div className={m.meta}>
        {due && <span className={m.due}>{due}</span>}
        <span className={m.count}>
          <b>
            {mission.done.length} of {mission.games.length}
          </b>{' '}
          games done
        </span>
      </div>
      <GameRows mission={mission} next={complete ? undefined : next} />
      {!complete && (
        <div className={styles.badges}>
          <span className={styles.badge}>
            <LobbyIcon name="star" size={16} /> Up to +{mission.maxXp} XP
          </span>
        </div>
      )}
      <div className={styles.acts}>
        {viewOnly ? (
          <CardButton color="orange" primary onClick={onClose}>
            Okay
          </CardButton>
        ) : complete ? (
          <>
            <CardButton onClick={onClose}>Okay</CardButton>
            <CardButton color="orange" primary onClick={onAllGames}>
              All games
            </CardButton>
          </>
        ) : (
          <>
            <CardButton onClick={onClose}>Later</CardButton>
            <CardButton color="orange" primary onClick={onPlay}>
              Play {next ? catalogGame(next)?.name : ''}
            </CardButton>
          </>
        )}
      </div>
    </LobbyCard>
  )
}
