import { useNavigate, useSearchParams } from 'react-router-dom'
import { MatchUp } from './match-up/MatchUp'
import { QuizShow } from './quiz-show/QuizShow'
import { GAMES } from './session'
import type { DemoState, GameFrom, GameId, Player } from './types'
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
      <div className={styles.empty}>
        <div className={styles.card} role="alert">
          <h1>{GAMES[gameId].name} isn’t ready yet</h1>
          <p>Your teacher hasn’t added enough questions for this game.</p>
          <button type="button" onClick={leave}>
            {from === 'games' ? 'Back to games' : 'Back to the classroom'}
          </button>
        </div>
      </div>
    )
  }

  const props = {
    player,
    lesson,
    cards,
    lessonCanPlay,
    demo,
    leaveTo: from === 'games' ? ('games' as const) : ('lobby' as const),
    onLeave: leave,
    onPlayGame: (next: GameId) => navigate(`${base}/${next}?lesson=${lesson.id}&from=${from}`),
  }
  // A new key per game and lesson: a fresh round when the URL changes.
  const key = `${gameId}:${lesson.id}:${demo ?? ''}`
  return gameId === 'match-up' ? <MatchUp key={key} {...props} /> : <QuizShow key={key} {...props} />
}
