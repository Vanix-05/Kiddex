import { useNavigate, useSearchParams } from 'react-router-dom'
import type { QuestionCard } from '../content/questionCard'
import { MatchUp } from './match-up/MatchUp'
import { QuizShow } from './quiz-show/QuizShow'
import { GAMES } from './session'
import type { DemoState, GameFrom, GameId, GameLesson, Player } from './types'
import { useGameCards } from './useGameCards'
import styles from './GameRoute.module.css'

/** The Lobby corner each way in starts from (Leave and Back to games return there). */
const ZONE_OF: Partial<Record<GameFrom, 'stage' | 'match'>> = { stage: 'stage', match: 'match' }

const FROM: readonly GameFrom[] = ['games', 'stage', 'match', 'mission', 'dev']
const isGameFrom = (v: string | null): v is GameFrom => FROM.includes(v as GameFrom)

/**
 * One game for one lesson (?lesson=, else the first lesson with enough cards).
 * `base` is where games live (/play, or /dev/play), `lobby` where Leave goes,
 * `games` where it goes when the Student came from All games (?from=games).
 */
export function GameRoute({
  gameId,
  player,
  base,
  lobby,
  games,
  demo,
}: {
  gameId: GameId
  player: Player
  base: string
  lobby: string
  games: string
  demo?: DemoState
}) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const from: GameFrom = isGameFrom(params.get('from')) ? (params.get('from') as GameFrom) : 'mission'
  const { lesson, cards, lessonCanPlay } = useGameCards(gameId, params.get('lesson'))

  const zone = ZONE_OF[from]
  const leave = () => navigate(from === 'games' ? games : from === 'dev' ? '/dev/games' : zone ? `${lobby}?at=${zone}` : lobby)

  if (!lesson) {
    return (
      <GameNotReady
        title={`${GAMES[gameId].name} isn’t ready yet`}
        line="Your teacher hasn’t added enough questions for this game."
        button={from === 'games' ? 'Back to games' : 'Back to the classroom'}
        onBack={leave}
      />
    )
  }

  return (
    <GameScreen
      gameId={gameId}
      player={player}
      lesson={lesson}
      cards={cards}
      lessonCanPlay={lessonCanPlay}
      demo={demo}
      leaveTo={from === 'games' ? 'games' : 'lobby'}
      onLeave={leave}
      onPlayGame={(next) => navigate(`${base}/${next}?lesson=${lesson.id}&from=${from}`)}
    />
  )
}

/**
 * The game itself (Quiz Show or Match Up), the same for a Student, the dev
 * pages and a Teacher preview (`preview`: nothing is saved, see roundEnd.ts).
 */
export function GameScreen({
  gameId,
  player,
  lesson,
  cards,
  lessonCanPlay,
  demo,
  preview,
  leaveTo,
  onLeave,
  onPlayGame,
}: {
  gameId: GameId
  player: Player
  lesson: GameLesson
  /** The lesson's approved cards for this game. */
  cards: QuestionCard[]
  lessonCanPlay: (game: GameId) => boolean
  demo?: DemoState
  preview?: boolean
  leaveTo: 'lobby' | 'games'
  onLeave: () => void
  onPlayGame: (game: GameId) => void
}) {
  const props = { player, lesson, cards, lessonCanPlay, demo, preview, leaveTo, onLeave, onPlayGame }
  // A new key per game and lesson: a fresh round when the URL changes.
  const key = `${gameId}:${lesson.id}:${demo ?? ''}:${preview ? 'preview' : ''}`
  return gameId === 'match-up' ? <MatchUp key={key} {...props} /> : <QuizShow key={key} {...props} />
}

/** The friendly "isn't ready yet" card, with one button back. */
export function GameNotReady({ title, line, button, onBack }: { title: string; line: string; button: string; onBack: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.card} role="alert">
        <h1>{title}</h1>
        <p>{line}</p>
        <button type="button" onClick={onBack}>
          {button}
        </button>
      </div>
    </div>
  )
}
