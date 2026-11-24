import { useNavigate } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { GamesLoading, LoadProblem } from '../LoadProblem'
import { AllGamesPage } from './AllGamesPage'
import { lobbySpot } from './pageMemory'
import { useAllGames } from './useAllGames'

/** /games: All games for the logged-in Student, with their Teacher's lessons. */
export function AllGamesScreen() {
  const navigate = useNavigate()
  const { data, error, retry } = useAllGames()
  if (!data) {
    return error ? (
      <LoadProblem title="We couldn’t open your games" error={error} onRetry={retry} />
    ) : (
      <GamesLoading text="Getting the games ready…" />
    )
  }
  return (
    <AllGamesPage
      data={data}
      onLobby={() => {
        const spot = lobbySpot()
        navigate(spot ? `${paths.lobby}?at=${spot}` : paths.lobby)
      }}
      onOpen={(game, lessonId) => navigate(`${paths.play}/${game}?lesson=${lessonId}&from=games`)}
    />
  )
}
