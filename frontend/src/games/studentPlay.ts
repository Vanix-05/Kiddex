import { createContext } from 'react'
import type { PlayLesson } from './studentData'
import type { Progress, RoundBody, SavedRound, ServerMission } from './studentGames'
import type { Level } from './types'

/**
 * What a game needs from the logged-in Student: their progress, levels, lessons and
 * mission, and a way to save a round. ONLY the Student's /play route provides it
 * (PlayScreen). The Teacher Preview and the dev pages have none, so they can never
 * read a Student's data or save a round.
 */
export interface StudentPlay {
  progress: Progress
  /** Topic key (trimmed, lowercase) → level. */
  levels: Record<string, Level>
  lessons: PlayLesson[]
  mission: ServerMission | null
  /** Saves a round (useSaveRound). Throws when it couldn't be saved. */
  save: (body: RoundBody, topic: string) => Promise<SavedRound>
}

export const StudentPlayContext = createContext<StudentPlay | null>(null)
