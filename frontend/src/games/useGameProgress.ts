import { useCallback, useState } from 'react'
import { START_LEVEL } from './difficulty'
import { dayOf } from './mission'
import type { GameId, GameResult, Level } from './types'

/**
 * The Student's game progress: every finished round, their level per topic,
 * and the XP and stars earned in games (the Lobby adds these to its own
 * numbers, see useLobbyData).
 *
 * FAKE for now: kept in this browser's localStorage. When the backend exists,
 * replace the insides of this hook with API calls; the games and the Lobby
 * don't change.
 */
interface Saved {
  levels: Record<string, Level>
  results: GameResult[]
  xpEarned: number
  starsEarned: number
}

const KEY = 'kiddex.games.progress'
const EMPTY: Saved = { levels: {}, results: [], xpEarned: 0, starsEarned: 0 }
const isLevel = (v: unknown): v is Level => v === 'easy' || v === 'medium' || v === 'hard'
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw) as Partial<Saved>
    const levels: Record<string, Level> = {}
    for (const [topic, level] of Object.entries(saved.levels ?? {})) if (isLevel(level)) levels[topic] = level
    return {
      levels,
      results: Array.isArray(saved.results) ? saved.results : [],
      xpEarned: count(saved.xpEarned),
      starsEarned: count(saved.starsEarned),
    }
  } catch {
    return EMPTY
  }
}

function store(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Storage blocked: progress just isn't remembered.
  }
}

export function useGameProgress() {
  const [saved, setSaved] = useState(load)

  /** The Student's level for a topic (easy until they've played it). */
  const levelFor = useCallback((topic: string): Level => saved.levels[topic] ?? START_LEVEL, [saved.levels])

  /** Saves a finished round, the topic's new level, and the XP and stars it earned. */
  const saveRound = useCallback((result: GameResult, nextLevel: Level, xp: number, stars: number) => {
    const now = load()
    const next: Saved = {
      levels: { ...now.levels, [result.topic]: nextLevel },
      results: [...now.results, result],
      xpEarned: now.xpEarned + xp,
      starsEarned: now.starsEarned + stars,
    }
    store(next)
    setSaved(next)
  }, [])

  /** The games finished today with this lesson. */
  const playedToday = useCallback(
    (lessonId: string): GameId[] => {
      const today = dayOf(Date.now())
      return [...new Set(saved.results.filter((r) => r.lessonId === lessonId && dayOf(r.endedAt) === today).map((r) => r.gameId))]
    },
    [saved.results],
  )

  return { levelFor, saveRound, playedToday, xpEarned: saved.xpEarned, starsEarned: saved.starsEarned }
}
