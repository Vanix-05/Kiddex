import { useNavigate } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { AllGamesPage } from './AllGamesPage'
import { lobbySpot } from './pageMemory'
import { useAllGames } from './useAllGames'

/** /games: All games for the logged-in Student. */
export function AllGamesScreen() {
  const navigate = useNavigate()
  const data = useAllGames()
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
