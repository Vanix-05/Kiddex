import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSession } from '../session/session'
import { addPending, neverSaves, readPending, resendPending } from './pendingRounds'
import { withSavedRound } from './studentData'
import { getGames, saveRound, type RoundBody, type SavedRound, type StudentGames } from './studentGames'
import { studentQueryClient } from './studentQueryClient'

export const STUDENT_GAMES_KEY = ['student', 'games'] as const

/** The old browser-only progress (before the backend saved rounds): removed once. */
const OLD_PROGRESS_KEY = 'kiddex.games.progress'
let oldProgressGone = false
function forgetOldProgress() {
  if (oldProgressGone) return
  oldProgressGone = true
  try {
    localStorage.removeItem(OLD_PROGRESS_KEY)
  } catch {
    // Storage blocked: nothing to remove.
  }
}

/** The logged-in Student (their School ID), or '' for anyone else. */
function useOwner() {
  const { user } = useSession()
  return user?.role === 'student' ? user.username : ''
}

/**
 * Loads the games data. Rounds that couldn't be saved before are sent first; if any
 * was saved, the data is loaded once more so it includes them.
 */
async function loadGames(owner: string): Promise<StudentGames> {
  forgetOldProgress()
  const first = await getGames()
  if (!readPending().some((p) => p.owner === owner)) return first
  const saved = await resendPending(owner, saveRound)
  return saved > 0 ? getGames().catch(() => first) : first
}

/**
 * The logged-in Student's games, progress, levels and mission (GET /api/student/games),
 * cached in studentQueryClient. Only for Students: the Teacher Preview and the
 * Teacher's view of the Lobby never use it.
 */
export function useStudentGames() {
  const owner = useOwner()
  return useQuery(
    {
      queryKey: STUDENT_GAMES_KEY,
      queryFn: () => loadGames(owner),
      enabled: !!owner,
    },
    studentQueryClient,
  )
}

/**
 * Saves a finished round (POST /api/student/rounds) and puts the answer in the cache
 * at once (progress, stars, mission). If it fails and could work later, the round is
 * kept in this browser to send again (pendingRounds.ts). Throws on any failure.
 */
export function useSaveRound() {
  const owner = useOwner()
  return useCallback(
    async (body: RoundBody, topic: string): Promise<SavedRound> => {
      try {
        const answer = await saveRound(body)
        studentQueryClient.setQueryData<StudentGames>(STUDENT_GAMES_KEY, (old) => old && withSavedRound(old, body, topic, answer))
        void studentQueryClient.invalidateQueries({ queryKey: STUDENT_GAMES_KEY })
        return answer
      } catch (err) {
        if (owner && !neverSaves(err)) addPending({ owner, body })
        throw err
      }
    },
    [owner],
  )
}
