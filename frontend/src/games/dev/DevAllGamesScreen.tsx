import { useNavigate, useSearchParams } from 'react-router-dom'
import { AllGamesPage } from '../allGames/AllGamesPage'
import { useAllGames, type AllGamesData } from '../allGames/useAllGames'
import type { GameId } from '../types'

/**
 * Dev only (/dev/all-games?sample=…): All games with fake moments, no login.
 * Without ?sample, the real progress (play a game from here to see it update).
 * - today:   like the mockup: Quiz Show done with 2 stars, Match Up next
 * - none:    no mission today: no banner, the newest lesson
 * - done:    every mission game done: the green banner
 * - nomatch: Comparing Fractions picked: Match Up is grey ("Needs 2 more pairs")
 */
function withSample(data: AllGamesData, sample: string | null): { data: AllGamesData; lesson?: string } {
  const { mission } = data
  /** The mission lesson's stars, faked for these games. */
  const fakeStars =
    (stars: Partial<Record<GameId, number>>) =>
    (game: GameId, lessonId: string): number =>
      (mission && lessonId === mission.lessonId ? stars[game] : undefined) ?? data.bestStars(game, lessonId)

  switch (sample) {
    case 'today':
      return mission
        ? { data: { ...data, mission: { ...mission, done: mission.games.slice(0, 1) }, bestStars: fakeStars({ 'quiz-show': 2 }) }, lesson: mission.lessonId }
        : { data }
    case 'none':
      return { data: { ...data, mission: null }, lesson: data.lessons[0]?.id }
    case 'done':
      return mission
        ? { data: { ...data, mission: { ...mission, done: mission.games }, bestStars: fakeStars({ 'quiz-show': 2, 'match-up': 3 }) }, lesson: mission.lessonId }
        : { data }
    case 'nomatch':
      return { data, lesson: 'comparing' }
    default:
      return { data }
  }
}

export function DevAllGamesScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sample = params.get('sample')
  const { data, lesson } = withSample(useAllGames(), sample)
  return (
    <AllGamesPage
      key={sample ?? 'live'}
      data={data}
      initialLesson={lesson}
      onLobby={() => navigate('/dev/lobby')}
      onOpen={(game, lessonId) => navigate(`/dev/play/${game}?lesson=${lessonId}&from=games`)}
    />
  )
}
