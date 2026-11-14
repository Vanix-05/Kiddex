import { lazy, Suspense, useEffect, useState } from 'react'
import { LoadingVideo } from '../../components/LoadingVideo/LoadingVideo'
import { useSession } from '../../session/session'
import { OpeningClassroom } from './OpeningClassroom'
import { preloadLobby } from './preloadLobby'

const Lobby = lazy(() => preloadLobby().then((m) => ({ default: m.LobbyScreen })))
const DevLobby = import.meta.env.DEV
  ? lazy(() => import('../DevLobby/DevLobbyScreen').then((m) => ({ default: m.DevLobbyScreen })))
  : null

/**
 * /lobby, downloaded on demand (see preloadLobby.ts).
 *
 * The first time the Lobby opens in a session, the loading video plays over
 * it while it loads. The video always plays to the end: if the Lobby is ready
 * first, it appears when the video ends; if the video ends first, it holds on
 * its last frame until the Lobby is ready. Later entries in the same session
 * show "Opening your classroom…" instead, as before.
 */
export function LazyLobbyScreen() {
  const { seenLoadingVideo, markLoadingVideoSeen } = useSession()
  // Decided once, when this entry starts.
  const [withVideo] = useState(!seenLoadingVideo)
  const [videoEnded, setVideoEnded] = useState(false)
  const [lobbyReady, setLobbyReady] = useState(false)

  useEffect(() => {
    if (withVideo) markLoadingVideoSeen()
  }, [withVideo, markLoadingVideoSeen])

  return (
    <>
      <Suspense fallback={withVideo ? null : <OpeningClassroom />}>
        <Lobby onReady={() => setLobbyReady(true)} />
      </Suspense>
      {withVideo && !(videoEnded && lobbyReady) && <LoadingVideo onDone={() => setVideoEnded(true)} />}
    </>
  )
}

/** Dev only: /dev/lobby, loaded the same way. */
export function LazyDevLobbyScreen() {
  if (!DevLobby) return null
  return (
    <Suspense fallback={<OpeningClassroom />}>
      <DevLobby />
    </Suspense>
  )
}
