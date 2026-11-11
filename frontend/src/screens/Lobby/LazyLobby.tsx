import { lazy, Suspense } from 'react'
import { OpeningClassroom } from './OpeningClassroom'
import { preloadLobby } from './preloadLobby'

const Lobby = lazy(() => preloadLobby().then((m) => ({ default: m.LobbyScreen })))
const DevLobby = import.meta.env.DEV
  ? lazy(() => import('../DevLobby/DevLobbyScreen').then((m) => ({ default: m.DevLobbyScreen })))
  : null

/** /lobby, downloaded on demand (see preloadLobby.ts). */
export function LazyLobbyScreen() {
  return (
    <Suspense fallback={<OpeningClassroom />}>
      <Lobby />
    </Suspense>
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
