import { useNavigate, useSearchParams } from 'react-router-dom'
import { AllGamesPage } from '../allGames/AllGamesPage'
import type { AllGamesData, GamesMission } from '../allGames/useAllGames'
import type { PlayLesson } from '../studentData'
import type { GameId } from '../types'
import { SAMPLE_LESSONS } from './sampleCards'

const MISSION: GamesMission = {
  lessonId: 'g4-fractions',
  lessonName: 'Fractions',
  teacher: 'Ms. Cruz',
  subject: 'Math',
  dueDate: '2026-11-27',
  maxXp: 85,
  games: ['quiz-show', 'match-up'],
  done: [],
}

/** The sample lessons with Match Up switched off in Mixed Numbers (as if a Teacher deleted its pairs). */
const NO_MATCH: PlayLesson[] = SAMPLE_LESSONS.map((l) =>
  l.id !== 'mixed'
    ? l
    : { ...l, games: l.games.map((g) => (g.id === 'match-up' ? { ...g, playable: false, reason: 'Needs at least 4 approved pairs.' } : g)) },
)

function sampleData(sample: string | null): { data: AllGamesData; lesson?: string } {
  const stars =
    (fake: Partial<Record<GameId, number>>) =>
    (game: GameId, lessonId: string): number =>
      lessonId === MISSION.lessonId ? (fake[game] ?? 0) : 0
  const data: AllGamesData = { stars: 125, mission: MISSION, lessons: SAMPLE_LESSONS, bestStars: stars({}) }
  switch (sample) {
    case 'none':
      return { data: { ...data, mission: null }, lesson: SAMPLE_LESSONS[0]?.id }
    case 'done':
      return { data: { ...data, mission: { ...MISSION, done: MISSION.games }, bestStars: stars({ 'quiz-show': 2, 'match-up': 3 }) } }
    case 'nomatch':
      return { data: { ...data, lessons: NO_MATCH }, lesson: 'mixed' }
    case 'empty':
      return { data: { ...data, mission: null, lessons: [] } }
    default:
      return { data: { ...data, mission: { ...MISSION, done: ['quiz-show'] }, bestStars: stars({ 'quiz-show': 2 }) }, lesson: MISSION.lessonId }
  }
}

/**
 * Dev only (/dev/all-games?sample=…): All games with the sample lessons, no login.
 * - (none) / today: like the mockup: Quiz Show done with 2 stars, Match Up next
 * - none:    no mission: no banner, the newest lesson
 * - done:    every mission game done: the green banner
 * - nomatch: Mixed Numbers picked, its Match Up is grey (with the backend-style reason)
 * - empty:   no lessons at all: the friendly empty card
 */
export function DevAllGamesScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sample = params.get('sample')
  const { data, lesson } = sampleData(sample)
  return (
    <AllGamesPage
      key={sample ?? 'today'}
      data={data}
      initialLesson={lesson}
      onLobby={() => navigate('/dev/lobby')}
      onOpen={(game, lessonId) => navigate(`/dev/play/${game}?lesson=${lessonId}&from=games`)}
    />
  )
}
