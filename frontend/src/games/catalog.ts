// Every mini game, for the All games page. Add a new game here (with its card
// picture) and the page lists it; nothing else on the page needs to change.
import blankThumb from '../assets/games/thumbs/fill-blank.webp'
import matchThumb from '../assets/games/thumbs/match-up.webp'
import quizThumb from '../assets/games/thumbs/quiz-show.webp'
import type { CardType } from '../content/questionCard'
import type { PlayLesson } from './studentData'
import type { GameId } from './types'

export interface CatalogGame {
  id: GameId
  name: string
  /** How to play, in a few words. */
  line: string
  /** The question cards it plays with. */
  cardType: CardType
  /** The card picture. */
  thumb: string
}

export const CATALOG: readonly CatalogGame[] = [
  { id: 'quiz-show', name: 'Quiz Show', line: 'Pick the best answer', cardType: 'multiple_choice', thumb: quizThumb },
  { id: 'match-up', name: 'Match Up', line: 'Tie each one to its partner', cardType: 'matching_pair', thumb: matchThumb },
  { id: 'fill-blank', name: 'Fill the Blank', line: 'Tap the word that fits', cardType: 'fill_blank', thumb: blankThumb },
]

export const catalogGame = (id: GameId) => CATALOG.find((g) => g.id === id)

export type CanPlay = { ok: true } | { ok: false; reason: string }

/**
 * Can this lesson play the game? Only a game in the lesson's assignment that is
 * 'playable' (enough approved questions, says the backend); else its reason.
 */
export function canPlay(game: Pick<CatalogGame, 'id'>, lesson: PlayLesson | undefined): CanPlay {
  const entry = lesson?.games.find((g) => g.id === game.id)
  if (!entry) return { ok: false, reason: 'Not in this lesson' }
  return entry.playable ? { ok: true } : { ok: false, reason: entry.reason ?? 'Not ready yet' }
}
