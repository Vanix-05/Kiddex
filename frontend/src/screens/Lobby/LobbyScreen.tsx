import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { companionRegistry } from '../../companions/registry'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { isBuddyId } from '../../setup/quizData'
import { MainLobby } from './MainLobby'
import { useLobbyData } from './useLobbyData'

/**
 * Rene Island, the class Lobby (/lobby): the logged-in Student walks around
 * their section's classroom with their buddy, in their Customize look.
 * Single player for now, with fake data (useLobbyData).
 * onReady: the classroom is on screen (or couldn't open), so a loading screen over it can go.
 */
export function LobbyScreen({ onReady }: { onReady?: () => void }) {
  const navigate = useNavigate()
  const { avatar, companionId, buddyName, look, logOut } = useSession()
  const data = useLobbyData()
  const [params] = useSearchParams()
  const at = params.get('at')

  // No character or buddy yet: the first-time setup comes first.
  if (!avatar || !isBuddyId(companionId)) return <Navigate to={paths.setup.quiz} replace />

  return (
    <MainLobby
      student={{
        name: data.student.name,
        avatar,
        buddy: companionId,
        buddyName: buddyName ?? companionRegistry[companionId].name,
        look,
      }}
      data={data}
      startAt={at === 'stage' || at === 'match' ? at : undefined}
      onReady={onReady}
      onPlay={(game, from) => navigate(`${paths.play}/${game}?from=${from}&lesson=${data.mission.lessonId}`)}
      onLogOut={() => {
        logOut()
        navigate(paths.welcome)
      }}
    />
  )
}
