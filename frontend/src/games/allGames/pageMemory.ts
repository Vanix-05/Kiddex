// What All games remembers for this session only (sessionStorage): the lesson
// the Student picked, and the Lobby corner they came from (for the Lobby button).
// Kept tiny (no imports) so the Lobby can set the corner without loading the page.

const LESSON_KEY = 'kiddex.games.lesson'
const SPOT_KEY = 'kiddex.games.lobbySpot'

export type LobbySpot = 'stage' | 'match'

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // Storage blocked: the page just starts fresh.
  }
}

export const pickedLesson = () => read(LESSON_KEY)
export const rememberLesson = (lessonId: string) => write(LESSON_KEY, lessonId)

/** Where the Lobby button goes back to (null: where the Student starts). */
export function lobbySpot(): LobbySpot | null {
  const spot = read(SPOT_KEY)
  return spot === 'stage' || spot === 'match' ? spot : null
}
/** The Lobby calls this on its way to All games. */
export const rememberLobbySpot = (spot: LobbySpot | null) => write(SPOT_KEY, spot)
