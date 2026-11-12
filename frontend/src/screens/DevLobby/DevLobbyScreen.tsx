import { useNavigate, useSearchParams } from 'react-router-dom'
import { MainLobby } from '../Lobby/MainLobby'
import { useLobbyData } from '../Lobby/useLobbyData'
import type { LobbyStudent } from '../Lobby/useLobbyCast'

/** Sample Students for the Lobby (the same two as /dev/cutscene). */
const PRESETS: Record<string, LobbyStudent> = {
  // Girl + purple fox with a scarf
  a: {
    name: 'Ana',
    avatar: 'girl',
    buddy: 'fox',
    buddyName: 'Mochi',
    look: { hair: 'ginger', shirt: 'mint', youExtra: 'flower', buddyColor: 'purple', buddyExtra: 'scarf' },
  },
  // Boy (dark skin) + mint axolotl with a bow
  b: {
    name: 'Ben',
    avatar: 'boy',
    buddy: 'axolotl',
    buddyName: 'Axolotl',
    look: { skin: 'skin6', hair: 'black', shirt: 'blue', youExtra: 'glasses', buddyColor: 'mint', buddyExtra: 'bow' },
  },
}

/**
 * Dev only (/dev/lobby): the Main Lobby with a sample Student, no login
 * needed. ?p=a (girl + fox) or ?p=b (boy + axolotl); add &fps to see the
 * frame rate.
 */
export function DevLobbyScreen() {
  const [params] = useSearchParams()
  const data = useLobbyData()
  const navigate = useNavigate()
  const student = PRESETS[params.get('p') ?? 'a'] ?? PRESETS.a
  const at = params.get('at')
  return (
    <MainLobby
      student={student}
      data={data}
      onLogOut={() => window.location.assign('/')}
      startAt={at === 'stage' || at === 'match' ? at : undefined}
      onPlay={(game, from) => navigate(`/dev/play/${game}?from=${from}&lesson=${data.mission.lessonId}`)}
    />
  )
}
