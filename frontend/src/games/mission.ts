// Kept tiny (no imports) so the Lobby can count mission games without loading the games.
import type { GameId } from './types'

/** Today's mission plays the games in this order (the mission's `games` count takes the first ones). */
export const MISSION_GAMES: readonly GameId[] = ['quiz-show', 'match-up', 'fill-blank']

/** "2026-11-12" in the Student's own time zone. */
export const dayOf = (iso: string | number | Date) => new Date(iso).toLocaleDateString('en-CA')
