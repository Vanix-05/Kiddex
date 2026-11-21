import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { GameRoute } from '../GameRoute'
import { SAMPLE_PLAYER as ANA } from '../samplePlayer'
import { GAMES, isGameId } from '../session'
import { DEMO_STATES, type DemoState } from '../types'
import styles from './DevGamesScreen.module.css'

// Dev only (not in production builds): every mini game screen at a glance,
// with a sample Student (the same Ana as /dev/lobby). Nothing is saved
// from a ?state= screen; a plain play-through saves like the real game.

const STATES: { game: string; state?: DemoState; label: string }[] = [
  { game: 'quiz-show', label: 'Quiz Show: play a round' },
  { game: 'quiz-show', state: 'question', label: 'Quiz Show: a question (q1)' },
  { game: 'quiz-show', state: 'right', label: 'Quiz Show: right answer (q2)' },
  { game: 'quiz-show', state: 'wrong', label: 'Quiz Show: wrong answer (q3)' },
  { game: 'quiz-show', state: 'results', label: 'Quiz Show: Results (q4)' },
  { game: 'match-up', label: 'Match Up: play a round' },
  { game: 'match-up', state: 'picked', label: 'Match Up: a card picked (m1)' },
  { game: 'match-up', state: 'miss', label: 'Match Up: a wrong pair (m2)' },
  { game: 'match-up', state: 'results', label: 'Match Up: Results' },
  { game: 'fill-blank', label: 'Fill the Blank: play a round' },
  { game: 'fill-blank', state: 'question', label: 'Fill the Blank: a sentence (f1)' },
  { game: 'fill-blank', state: 'help-used', label: 'Fill the Blank: Buddy Help, the first letter (f2)' },
  { game: 'fill-blank', state: 'right', label: 'Fill the Blank: right word (f3)' },
  { game: 'fill-blank', state: 'wrong', label: 'Fill the Blank: wrong word (f4)' },
  { game: 'fill-blank', state: 'help-earned', label: 'Fill the Blank: 3 right in a row, a new help earned' },
  { game: 'fill-blank', state: 'help-none', label: 'Fill the Blank: 0 helps left' },
  { game: 'fill-blank', state: 'results', label: 'Fill the Blank: Results' },
  { game: 'quiz-show', state: 'help-ready', label: 'Buddy Help: a help ready (Quiz Show, q4)' },
  { game: 'quiz-show', state: 'help-used', label: 'Buddy Help: help used, one wrong choice knocked away (Quiz Show)' },
  { game: 'quiz-show', state: 'help-earned', label: 'Buddy Help: 3 right in a row, a new help earned (Quiz Show)' },
  { game: 'quiz-show', state: 'help-none', label: 'Buddy Help: 0 helps left (Quiz Show)' },
  { game: 'match-up', state: 'match-help', label: 'Buddy Help: a card picked, its partner glows (Match Up)' },
  { game: 'quiz-show', state: 'results', label: 'Buddy Help on Results: 7 of 8, 1 with the buddy’s help (Quiz Show)' },
]

/** /dev/all-games samples (see DevAllGamesScreen). */
const ALL_GAMES: { sample?: string; label: string }[] = [
  { sample: 'today', label: 'All games (sample, like the mockup: Quiz Show done)' },
  { sample: 'none', label: 'All games: no mission' },
  { sample: 'done', label: 'All games: mission done' },
  { sample: 'nomatch', label: 'All games: a lesson where Match Up is unavailable' },
  { label: 'All games: your real progress (play from here to see it update)' },
]

const isDemo = (v: string | null): v is DemoState => DEMO_STATES.includes(v as DemoState)

/** /dev/games: a link for each game and each state. */
export function DevGamesScreen() {
  return (
    <main className={styles.page}>
      <h1>Mini games (dev)</h1>
      <p>Sample Student: Ana, a girl with a purple fox. Add &amp;lesson=mixed to use the Mixed Numbers cards.</p>
      <ul>
        {STATES.map((s) => (
          <li key={s.label}>
            <Link to={`/dev/play/${s.game}?from=dev${s.state ? `&state=${s.state}` : ''}`}>{s.label}</Link>
          </li>
        ))}
        <li>
          <Link to="/dev/lobby">The Lobby (All games opens the games page)</Link>
        </li>
      </ul>
      <h2>All games</h2>
      <ul>
        {ALL_GAMES.map((s) => (
          <li key={s.label}>
            <Link to={`/dev/all-games${s.sample ? `?sample=${s.sample}` : ''}`}>{s.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

/** /dev/play/:gameId?state=…: a game with the sample Student, no login. */
export function DevPlayScreen() {
  const { gameId } = useParams()
  const [params] = useSearchParams()
  if (!isGameId(gameId) || !GAMES[gameId].built) return <Navigate to="/dev/games" replace />
  const state = params.get('state')
  return <GameRoute gameId={gameId} player={ANA} base="/dev/play" lobby="/dev/lobby" games="/dev/all-games" demo={isDemo(state) ? state : undefined} />
}
