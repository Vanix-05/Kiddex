import { CheckLeft, CheckRight } from '../pages/Check'
import { ComingSoonRight, LobbyLeft, ProgressLeft } from '../pages/ComingSoon'
import { GamesLeft, GamesRight } from '../pages/Games'
import { HomeLeft, HomeRight } from '../pages/Home'
import { LessonsLeft, MakingLeft, MakingRight, UploadRight } from '../pages/Lessons'
import type { PageKey, Spread } from './pages'

/** The left and right page for each planner page. */
export const SPREADS: Record<PageKey, Spread> = {
  home: { Left: HomeLeft, Right: HomeRight },
  lessons: { Left: LessonsLeft, Right: UploadRight },
  making: { Left: MakingLeft, Right: MakingRight },
  check: { Left: CheckLeft, Right: CheckRight },
  games: { Left: GamesLeft, Right: GamesRight },
  progress: { Left: ProgressLeft, Right: ComingSoonRight },
  lobby: { Left: LobbyLeft, Right: ComingSoonRight },
}
