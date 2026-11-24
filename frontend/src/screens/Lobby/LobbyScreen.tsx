import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { companionRegistry } from '../../companions/registry'
import { rememberLobbySpot } from '../../games/allGames/pageMemory'
import { LoadProblem } from '../../games/LoadProblem'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { isBuddyId } from '../../setup/quizData'
import { MainLobby } from './MainLobby'
import { OpeningClassroom } from './OpeningClassroom'
import { useLobbyData } from './useLobbyData'

/**
 * Rene Island, the class Lobby (/lobby): the logged-in Student walks around
 * their section's classroom with their buddy, in their Customize look.
 * Their progress and mission are real (useLobbyData); classmates are still fake.
 * onReady: the classroom is on screen (or couldn't open), so a loading screen over it can go.
 */
export function LobbyScreen({ onReady }: { onReady?: () => void }) {
  const navigate = useNavigate()
  const { avatar, companionId, buddyName, look, logOut } = useSession()
  const { data, error, retry } = useLobbyData()
  const [params] = useSearchParams()
  const at = params.get('at')

  // The data couldn't load: let the loading video go, so the Try again card shows.
  const failed = !data && !!error
  useEffect(() => {
    if (failed) onReady?.()
  }, [failed, onReady])

  // No character or buddy yet: the first-time setup comes first.
  if (!avatar || !isBuddyId(companionId)) return <Navigate to={paths.setup.quiz} replace />
  if (!data) return failed ? <LoadProblem title="We couldn’t open your classroom" error={error} onRetry={retry} /> : <OpeningClassroom />

  // Students have no names in KIDDEX: the top bar and name tag show the buddy's name.
  const buddy = buddyName ?? companionRegistry[companionId].name
  const { mission } = data

  return (
    <MainLobby
      student={{
        name: buddy,
        avatar,
        buddy: companionId,
        buddyName: buddy,
        look,
      }}
      data={data}
      startAt={at === 'stage' || at === 'match' ? at : undefined}
      onReady={onReady}
      onPlay={(game, from) =>
        mission.lessonId ? navigate(`${paths.play}/${game}?from=${from}&lesson=${mission.lessonId}`) : navigate(paths.games)
      }
      onAllGames={(spot) => {
        rememberLobbySpot(spot)
        navigate(paths.games)
      }}
      onLogOut={() => {
        logOut()
        navigate(paths.welcome)
      }}
    />
  )
}
