import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Pin, Play, Plus } from 'lucide-react'
import { canPlay, CATALOG, catalogGame, type CanPlay, type CatalogGame } from '../catalog'
import type { GameId } from '../types'
import { pickedLesson, rememberLesson } from './pageMemory'
import type { AllGamesData, GamesMission } from './useAllGames'
import styles from './AllGamesPage.module.css'

/**
 * All games: every mini game as a picture card, with the Teacher's mission at
 * the top. The only way into the games (the Lobby's corners point here).
 * The data comes from useAllGames; this component only draws it.
 */
export function AllGamesPage({
  data,
  initialLesson,
  onLobby,
  onOpen,
}: {
  data: AllGamesData
  /** Dev samples: start with this lesson picked. */
  initialLesson?: string
  onLobby: () => void
  onOpen: (game: GameId, lessonId: string) => void
}) {
  const { mission, lessons, bestStars, stars } = data
  const [lessonId, setLessonId] = useState(() => {
    const known = (id: string | null | undefined) => (id && lessons.some((l) => l.id === id) ? id : null)
    return known(initialLesson) ?? known(pickedLesson()) ?? mission?.lessonId ?? lessons[0]?.id ?? ''
  })
  const lesson = lessons.find((l) => l.id === lessonId)
  const [picking, setPicking] = useState(false)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const changeButton = useRef<HTMLButtonElement>(null)

  const pick = (id: string) => {
    setLessonId(id)
    rememberLesson(id)
    setPicking(false)
    changeButton.current?.focus()
  }

  // Mission games first, then games the lesson can play, then grey ones.
  const isMissionLesson = !!mission && mission.lessonId === lessonId
  const rows = useMemo(() => {
    const missionOrder = (g: CatalogGame) => (isMissionLesson && mission ? mission.games.indexOf(g.id) : -1)
    return CATALOG.map((game) => ({ game, check: canPlay(game, lessonId), assigned: missionOrder(game) >= 0 }))
      .map((row, i) => ({ ...row, rank: row.assigned && row.check.ok ? 0 : row.check.ok ? 1 : 2, order: row.assigned ? missionOrder(row.game) : i }))
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
  }, [lessonId, isMissionLesson, mission])

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.lobby} onClick={onLobby}>
          <span className={styles.lobbyIcon} aria-hidden="true">
            <ChevronLeft size={22} strokeWidth={3} />
          </span>
          Lobby
        </button>
        <p className={styles.stars} aria-label={`${stars} stars`}>
          <StarIcon on size={26} /> {stars}
        </p>
      </header>

      <main className={styles.main}>
        <h1 className="visually-hidden">All games</h1>

        {mission && <MissionBanner mission={mission} bestStars={bestStars} onOpen={onOpen} />}

        <section aria-labelledby="pick-title">
          <div className={styles.pickHead}>
            <h2 id="pick-title" className={styles.pickTitle}>
              Pick a game <small>{CATALOG.length === 1 ? '1 game' : `${CATALOG.length} games`}</small>
            </h2>
            <div className={styles.lessonPill}>
              <span>
                Playing with <b>{lesson?.name ?? 'no lesson yet'}</b>
              </span>
              {lessons.length > 1 && (
                <button ref={changeButton} type="button" className={styles.change} onClick={() => setPicking(true)} aria-haspopup="dialog">
                  Change
                </button>
              )}
            </div>
          </div>

          <ul className={styles.grid}>
            {rows.map(({ game, check, assigned }) => (
              <li key={game.id}>
                <GameCard
                  game={game}
                  check={check}
                  stars={bestStars(game.id, lessonId)}
                  teacher={assigned ? mission?.teacher : undefined}
                  onOpen={() => onOpen(game.id, lessonId)}
                  onBlocked={(reason) => setToast({ text: `${game.name}: ${reason.toLowerCase().replace(/^needs/, 'this lesson needs')}`, id: Date.now() })}
                />
              </li>
            ))}
            <li className={styles.soon} aria-label="More games coming. Keep playing to be ready!">
              <span className={styles.soonPlus} aria-hidden="true">
                <Plus size={26} strokeWidth={3} />
              </span>
              <b>More games coming</b>
              <span>Keep playing to be ready!</span>
            </li>
          </ul>
        </section>
      </main>

      {picking && <LessonPicker lessons={lessons} current={lessonId} onPick={pick} onClose={() => { setPicking(false); changeButton.current?.focus() }} />}

      {toast && (
        <div key={toast.id} className={styles.toast} role="status" onAnimationEnd={() => setToast(null)}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

// ---------- Mission banner ----------

function MissionBanner({
  mission,
  bestStars,
  onOpen,
}: {
  mission: GamesMission
  bestStars: AllGamesData['bestStars']
  onOpen: (game: GameId, lessonId: string) => void
}) {
  const allDone = mission.games.every((g) => mission.done.includes(g))
  const next = mission.games.find((g) => !mission.done.includes(g) && canPlayGame(g, mission.lessonId).ok)

  return (
    <section className={`${styles.mission} ${allDone ? styles.missionDone : ''}`} aria-labelledby="mission-title">
      <div className={styles.missionInfo}>
        <p className={styles.from}>
          <Pin size={17} strokeWidth={2.6} aria-hidden="true" /> From {mission.teacher}
        </p>
        <h2 id="mission-title" className={styles.missionTitle}>
          {mission.lessonName}
        </h2>
        <p className={styles.missionMeta}>
          {mission.subject} · Due {mission.due}
        </p>
        <p className={styles.missionCount}>
          <span className={styles.missionDots} aria-hidden="true">
            {mission.games.map((g) => (
              <span key={g} className={`${styles.mDot} ${mission.done.includes(g) ? styles.mDotDone : ''}`} />
            ))}
          </span>
          {allDone ? `Mission done! +${mission.xp} XP` : `${mission.done.length} of ${mission.games.length} games done`}
        </p>
      </div>

      <ul className={styles.missionGames}>
        {mission.games.map((id) => {
          const game = catalogGame(id)
          if (!game) return null
          const done = mission.done.includes(id)
          const check = canPlay(game, mission.lessonId)
          const play = () => onOpen(id, mission.lessonId)
          return (
            <li key={id} className={`${styles.mGame} ${id === next ? styles.mGameNext : ''}`}>
              <img className={styles.mThumb} src={game.thumb} alt="" draggable={false} />
              <div className={styles.mBody}>
                <h3 className={styles.mName}>{game.name}</h3>
                {done ? (
                  <>
                    <Stars count={bestStars(id, mission.lessonId)} />
                    <span className={styles.donePill}>
                      <Check size={16} strokeWidth={3.4} aria-hidden="true" /> Done
                    </span>
                    <button type="button" className={styles.again} onClick={play} aria-label={`Play ${game.name} again`}>
                      Play again
                    </button>
                  </>
                ) : check.ok ? (
                  <>
                    <p className={styles.mLine}>{game.line}</p>
                    <button type="button" className={styles.play} onClick={play} aria-label={`Play ${game.name}`}>
                      <Play size={20} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> Play
                    </button>
                  </>
                ) : (
                  <span className={styles.reason}>{check.reason}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const canPlayGame = (id: GameId, lessonId: string): CanPlay => {
  const game = catalogGame(id)
  return game ? canPlay(game, lessonId) : { ok: false, reason: 'Coming soon' }
}

// ---------- Grid card ----------

function GameCard({
  game,
  check,
  stars,
  teacher,
  onOpen,
  onBlocked,
}: {
  game: CatalogGame
  check: CanPlay
  stars: number
  /** Set on mission games: the Teacher who assigned it. */
  teacher?: string
  onOpen: () => void
  onBlocked: (reason: string) => void
}) {
  const label = [
    game.name,
    check.ok ? `${stars} of 3 stars` : `can't play yet. ${check.reason}`,
    teacher ? `from ${teacher}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      className={`${styles.card} ${teacher ? styles.cardMission : ''} ${check.ok ? '' : styles.cardOff}`}
      aria-label={label}
      aria-disabled={!check.ok || undefined}
      onClick={() => (check.ok ? onOpen() : onBlocked(check.reason))}
    >
      {teacher && (
        <span className={styles.tag} aria-hidden="true">
          <Pin size={15} strokeWidth={2.6} /> {teacher}
        </span>
      )}
      <img className={styles.thumb} src={game.thumb} alt="" draggable={false} />
      <span className={styles.cardName} aria-hidden="true">
        {game.name}
      </span>
      <span className={styles.cardFoot} aria-hidden="true">
        <span className={styles.cardLine}>{game.line}</span>
        {check.ok ? <Stars count={stars} /> : <span className={styles.reason}>{check.reason}</span>}
      </span>
    </button>
  )
}

// ---------- Lesson picker ----------

function LessonPicker({
  lessons,
  current,
  onPick,
  onClose,
}: {
  lessons: AllGamesData['lessons']
  current: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const currentButton = useRef<HTMLButtonElement>(null)
  useEffect(() => currentButton.current?.focus(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={styles.dim}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.picker} role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 id="picker-title" className={styles.pickerTitle}>
          Pick a lesson
        </h2>
        <ul className={styles.lessons}>
          {lessons.map((l) => {
            const games = CATALOG.filter((g) => canPlay(g, l.id).ok).length
            const on = l.id === current
            return (
              <li key={l.id}>
                <button
                  ref={on ? currentButton : undefined}
                  type="button"
                  className={`${styles.lesson} ${on ? styles.lessonOn : ''}`}
                  aria-current={on || undefined}
                  onClick={() => onPick(l.id)}
                >
                  <span className={styles.lessonText}>
                    <b>{l.name}</b>
                    <span>
                      {l.subject} · {games === 1 ? 'Plays 1 game' : `Plays ${games} games`}
                    </span>
                  </span>
                  {on && <Check size={22} strokeWidth={3.2} aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ---------- Stars ----------

function Stars({ count }: { count: number }) {
  return (
    <span className={styles.starRow} role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <StarIcon key={n} on={n <= count} size={20} />
      ))}
    </span>
  )
}

function StarIcon({ on, size }: { on: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={styles.star}>
      <path
        d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
        fill={on ? 'var(--color-game-star)' : 'var(--color-game-star-pale)'}
        stroke={on ? 'var(--color-game-star-edge)' : 'var(--color-neutral-line)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
