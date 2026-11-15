import { createElement, type ComponentType } from 'react'
import { useSection } from '../data/useTeacherData'
import { CheckLeft, CheckRight } from '../pages/Check'
import { ComingSoonRight, LobbyLeft, ProgressLeft } from '../pages/ComingSoon'
import { GamesLeft, GamesRight } from '../pages/Games'
import { HomeLeft, HomeRight } from '../pages/Home'
import { LessonsLeft, MakingLeft, MakingRight, UploadRight } from '../pages/Lessons'
import { NoSectionLeft, NoSectionRight } from '../pages/NoSection'
import type { PageKey, PageProps, Spread } from './pages'

/** A spread that only makes sense with a section: before the first one, a friendly empty page. */
function needsSection(spread: Spread, title: string, line: string): Spread {
  const Left: ComponentType<PageProps> = (props) =>
    useSection().active ? createElement(spread.Left, props) : createElement(NoSectionLeft, { title, line, live: props.live })
  const Right: ComponentType<PageProps> = (props) => (useSection().active ? createElement(spread.Right, props) : createElement(NoSectionRight))
  return { Left, Right }
}

/** The left and right page for each planner page. */
export const SPREADS: Record<PageKey, Spread> = {
  home: { Left: HomeLeft, Right: HomeRight },
  lessons: needsSection(
    { Left: LessonsLeft, Right: UploadRight },
    'My lessons',
    'Your sections become the tabs on top of this planner. Then upload a lesson for one of them.',
  ),
  making: { Left: MakingLeft, Right: MakingRight },
  check: { Left: CheckLeft, Right: CheckRight },
  games: { Left: GamesLeft, Right: GamesRight },
  progress: needsSection(
    { Left: ProgressLeft, Right: ComingSoonRight },
    'Progress',
    'Your sections become the tabs on top of this planner. Their progress shows up here.',
  ),
  lobby: { Left: LobbyLeft, Right: ComingSoonRight },
}
