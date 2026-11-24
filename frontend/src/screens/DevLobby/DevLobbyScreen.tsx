import { useNavigate, useSearchParams } from 'react-router-dom'
import { MainLobby } from '../Lobby/MainLobby'
import { SAMPLE_PROGRESS, sampleMission } from '../../games/dev/sampleCards'
import { lobbyDataFrom, lobbyProgress } from '../Lobby/useLobbyData'
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
 * Dev only (/dev/lobby): the Main Lobby with a sample Student and the sample
 * lessons (games/dev/sampleCards.ts), no login needed. ?p=a (girl + fox) or ?p=b
 * (boy + axolotl); ?mission=open (1 of 2 done, the default), done (complete, a spin
 * is ready), none (no mission), ideas (the chalkboard's key ideas); add &fps to see
 * the frame rate.
 */
export function DevLobbyScreen() {
  const [params] = useSearchParams()
  // &done (old link): the same as ?mission=done. &garden=N: missions the class has done.
  const garden = params.get('garden')
  const sample = lobbyDataFrom(lobbyProgress(SAMPLE_PROGRESS), sampleMission(params.has('done') ? 'done' : params.get('mission')))
  const data = { ...sample, garden: garden === null ? sample.garden : { ...sample.garden, done: Number(garden) } }
  const navigate = useNavigate()
  const student = PRESETS[params.get('p') ?? 'a'] ?? PRESETS.a
  const at = params.get('at')
  return (
    <MainLobby
      student={student}
      data={data}
      onLogOut={() => window.location.assign('/')}
      startAt={at === 'stage' || at === 'match' ? at : undefined}
      onPlay={(game, from) => navigate(`/dev/play/${game}?from=${from}&lesson=${data.mission.lessonId ?? ''}`)}
      onAllGames={() => navigate('/dev/all-games')}
    />
  )
}
