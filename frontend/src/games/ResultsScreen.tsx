import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, Flame, Lightbulb, RotateCcw, Target, Zap } from 'lucide-react'
import type { RoundSummary } from './roundEnd'
import { GAMES, nextStarLine, starsFor } from './session'
import type { GameId } from './types'
import styles from './ResultsScreen.module.css'

/** The Results board's contents, shared by every game (each game puts it in its own board frame). */
export function ResultsBoard({
  game,
  name,
  summary,
  lookAgain,
  compact,
  onPlayAgain,
  onNext,
}: {
  game: GameId
  name: string
  summary: RoundSummary
  /** Up to 2 cards the Student got wrong, with the right answer. */
  lookAgain: { prompt: string; answer: string }[]
  /** Short windows: room for one card to look at again. */
  compact?: boolean
  onPlayAgain: () => void
  onNext: () => void
}) {
  const { right, total, xpGained, xpBefore, streakDays, nextGame } = summary
  const stars = starsFor(right, total)
  const title = game === 'match-up' ? `All tied up, ${name}!` : `Great show, ${name}!`
  const after = xpBefore.xp + xpGained
  const next = xpBefore.level + 1
  const xpLine = after >= xpBefore.goal ? `Level ${next} reached!` : `${xpBefore.goal - after} more to Level ${next}`
  const nextButton = useRef<HTMLButtonElement>(null)
  const again = lookAgain.slice(0, compact ? 1 : 2)

  // The main button takes focus, so Enter goes on.
  useEffect(() => {
    nextButton.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className={styles.results}>
      <div className={styles.stars} role="img" aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((n) => (
          <Star key={n} on={n <= stars} big={n === 2} />
        ))}
      </div>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.line}>{nextStarLine(right, total)}</p>

      <div className={styles.stats}>
        <Stat icon={<Target size={24} strokeWidth={2.4} />} big={`${right} of ${total}`} small="correct" />
        <Stat icon={<Zap size={24} strokeWidth={2.4} />} big={`+${xpGained} XP`} small={xpLine} />
        <Stat icon={<Flame size={24} strokeWidth={2.4} />} big={`${streakDays} ${streakDays === 1 ? 'day' : 'days'}`} small="in a row" />
      </div>

      <div className={styles.xpRow}>
        <span className={styles.lv}>Lv {xpBefore.level}</span>
        <span
          className={styles.xpBar}
          role="img"
          aria-label={`XP: ${Math.min(after, xpBefore.goal)} of ${xpBefore.goal} to level ${next}`}
          style={
            {
              '--old': `${(xpBefore.xp / xpBefore.goal) * 100}%`,
              '--new': `${(Math.min(after, xpBefore.goal) / xpBefore.goal) * 100}%`,
            } as CSSProperties
          }
        >
          <span className={styles.xpNew} />
          <span className={styles.xpOld} />
        </span>
        <span className={styles.lv}>Lv {next}</span>
      </div>

      {again.length > 0 && (
        <section className={styles.again}>
          <h2 className={styles.againTitle}>
            <Lightbulb size={20} strokeWidth={2.4} aria-hidden="true" /> {again.length === 1 ? 'One to look at again' : 'Two to look at again'}
          </h2>
          <ul className={styles.againList}>
            {again.map((item, i) => (
              <li key={i}>
                <span className={styles.againPrompt}>{item.prompt}</span>
                <span className={styles.pill}>
                  <span className="visually-hidden">Right answer: </span>
                  {item.answer}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.buttons}>
        <button type="button" className={styles.again2} onClick={onPlayAgain}>
          <RotateCcw size={22} strokeWidth={2.6} aria-hidden="true" /> Play again
        </button>
        <button ref={nextButton} type="button" className={styles.next} onClick={onNext}>
          {nextGame ? `Next game: ${GAMES[nextGame].name}` : 'Back to Lobby'} <ArrowRight size={24} strokeWidth={2.8} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function Stat({ icon, big, small }: { icon: ReactNode; big: string; small: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.statText}>
        <b>{big}</b>
        <small>{small}</small>
      </span>
    </div>
  )
}

function Star({ on, big }: { on: boolean; big: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={big ? `${styles.star} ${styles.starBig}` : styles.star} aria-hidden="true">
      <path
        d="M50 6 L62 36 L94 38 L69 59 L77 92 L50 74 L23 92 L31 59 L6 38 L38 36 Z"
        fill={on ? 'var(--color-game-star)' : 'var(--color-game-star-pale)'}
        stroke={on ? 'var(--color-card-border)' : 'var(--color-neutral-line)'}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {on && <path d="M40 30 L46 18" stroke="var(--color-input-bg)" strokeWidth="6" strokeLinecap="round" opacity="0.7" />}
    </svg>
  )
}

/** Results top right: "Mission ● ◎ ○ 1 of 3 games". */
export function MissionPill({ games, done, next }: { games: GameId[]; done: GameId[]; next: GameId | null }) {
  const ring = next ?? games.find((g) => !done.includes(g)) ?? null
  return (
    <div className={styles.mission}>
      <span className={styles.missionLabel}>Mission</span>
      <span className={styles.missionDots} aria-hidden="true">
        {games.map((g) => (
          <span key={g} className={`${styles.mDot} ${done.includes(g) ? styles.mDone : g === ring ? styles.mNext : ''}`} />
        ))}
      </span>
      <span className={styles.missionCount}>
        {done.length} of {games.length} games
      </span>
    </div>
  )
}
