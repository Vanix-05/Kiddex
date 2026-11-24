import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { companionRegistry } from '../companions/registry'
import { paths } from '../routes/paths'
import { useSession } from '../session/session'
import { isBuddyId } from '../setup/quizData'
import { GameRoute } from './GameRoute'
import { GamesLoading, LoadProblem } from './LoadProblem'
import { GAMES, isGameId } from './session'
import { toPlayLessons } from './studentData'
import { StudentPlayContext, type StudentPlay } from './studentPlay'
import { useSaveRound, useStudentGames } from './useStudentGames'

/**
 * /play/:gameId?lesson=…&from=… : a mini game for the logged-in Student, in
 * their Customize look, with their Teacher's real questions. Finished rounds are
 * saved (StudentPlayContext: only this screen provides it, never the Teacher Preview).
 * Leave and Back to games return to All games (?from=games), or the Lobby otherwise.
 */
export function PlayScreen() {
  const { gameId } = useParams()
  const { avatar, companionId, buddyName, look } = useSession()
  const games = useStudentGames()
  const save = useSaveRound()
  const { data } = games

  const play = useMemo(
    (): StudentPlay | null =>
      data ? { progress: data.progress, levels: data.levels, lessons: toPlayLessons(data), mission: data.mission, save } : null,
    [data, save],
  )

  if (!isGameId(gameId) || !GAMES[gameId].built) return <Navigate to={paths.lobby} replace />
  if (!avatar || !isBuddyId(companionId)) return <Navigate to={paths.setup.quiz} replace />
  if (!play) {
    return games.error ? (
      <LoadProblem title="We couldn’t open your games" error={games.error} onRetry={() => void games.refetch()} />
    ) : (
      <GamesLoading text="Getting the game ready…" />
    )
  }

  // No Student name: Students have none in KIDDEX (lines spoken to them use no name).
  const player = { avatar, buddy: companionId, buddyName: buddyName ?? companionRegistry[companionId].name, look }
  return (
    <StudentPlayContext.Provider value={play}>
      <GameRoute gameId={gameId} player={player} lessons={play.lessons} base={paths.play} lobby={paths.lobby} games={paths.games} />
    </StudentPlayContext.Provider>
  )
}
