import { lazy, Suspense, useEffect, useState } from 'react'
import { LoadingVideo } from '../../components/LoadingVideo/LoadingVideo'
import { useSession } from '../../session/session'
import { isBuddyId } from '../../setup/quizData'
import { OpeningClassroom } from './OpeningClassroom'
import { preloadLobby, prewarmLobby } from './preloadLobby'

const Lobby = lazy(() => preloadLobby().then((m) => ({ default: m.LobbyScreen })))
const TeacherLobby = lazy(() => import('./TeacherLobbyScreen').then((m) => ({ default: m.TeacherLobbyScreen })))
const DevLobby = import.meta.env.DEV
  ? lazy(() => import('../DevLobby/DevLobbyScreen').then((m) => ({ default: m.DevLobbyScreen })))
  : null

/**
 * /lobby, downloaded on demand (see preloadLobby.ts).
 *
 * The first time the Lobby opens after a login (New Student or Returning
 * Student), the loading video plays over it while it loads behind it (code
 * and pictures). The video always plays to the end: if the Lobby is ready
 * first, it fades in when the video ends; if the video ends first, it holds
 * on its last frame until the Lobby is ready, then fades. The Student never
 * sees "Opening your classroom…" then, unless the video can't play: that
 * screen is the fallback. Later entries in the same session show "Opening
 * your classroom…" instead, as before.
 */
export function LazyLobbyScreen() {
  const { seenLoadingVideo, markLoadingVideoSeen, avatar, companionId, look } = useSession()
  // Decided once, when this entry starts.
  const [withVideo] = useState(!seenLoadingVideo)
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoGone, setVideoGone] = useState(false)
  const [lobbyReady, setLobbyReady] = useState(false)
  const video = withVideo && !videoFailed && !videoGone

  useEffect(() => {
    if (!withVideo) return
    markLoadingVideoSeen()
    // The video has started: load the Lobby behind it right away (its code,
    // and the Student's and their buddy's pictures).
    void preloadLobby()
    if (avatar && isBuddyId(companionId)) void prewarmLobby(avatar, companionId, look, 0)
    // Once, as the video starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withVideo, markLoadingVideoSeen])

  return (
    <>
      <Suspense fallback={video ? null : <OpeningClassroom />}>
        <Lobby onReady={() => setLobbyReady(true)} />
      </Suspense>
      {video && (
        <LoadingVideo
          onDone={() => setVideoEnded(true)}
          onFail={() => setVideoFailed(true)}
          leaving={videoEnded && lobbyReady}
          onGone={() => setVideoGone(true)}
        />
      )}
    </>
  )
}

/**
 * The Teacher's view-only visit to a section's classroom, downloaded on
 * demand. The Teacher sees "Opening your classroom…" while it loads (never
 * the Students' loading video).
 */
export function LazyTeacherLobbyScreen(props: { teacherName: string; section: string; onBack: () => void }) {
  return (
    <Suspense fallback={<OpeningClassroom />}>
      <TeacherLobby {...props} />
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
