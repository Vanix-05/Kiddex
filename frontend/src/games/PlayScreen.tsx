import { Navigate, useParams } from 'react-router-dom'
import { companionRegistry } from '../companions/registry'
import { paths } from '../routes/paths'
import { useLobbyData } from '../screens/Lobby/useLobbyData'
import { useSession } from '../session/session'
import { isBuddyId } from '../setup/quizData'
import { GameRoute } from './GameRoute'
import { GAMES, isGameId } from './session'

/**
 * /play/:gameId?lesson=…&from=… : a mini game for the logged-in Student, in
 * their Customize look. Leave and Back to games return to the Lobby corner
 * they came from.
 */
export function PlayScreen() {
  const { gameId } = useParams()
  const { avatar, companionId, buddyName, look } = useSession()
  const { student } = useLobbyData()

  if (!isGameId(gameId) || !GAMES[gameId].built) return <Navigate to={paths.lobby} replace />
  if (!avatar || !isBuddyId(companionId)) return <Navigate to={paths.setup.quiz} replace />

  const player = { name: student.name, avatar, buddy: companionId, buddyName: buddyName ?? companionRegistry[companionId].name, look }
  return <GameRoute gameId={gameId} player={player} base={paths.play} lobby={paths.lobby} />
}
