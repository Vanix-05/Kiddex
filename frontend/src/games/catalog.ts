// Every mini game, for the All games page. Add a new game here (with its card
// picture) and the page lists it; nothing else on the page needs to change.
import matchThumb from '../assets/games/thumbs/match-up.webp'
import quizThumb from '../assets/games/thumbs/quiz-show.webp'
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type CardType } from '../content/questionCard'
import { cardsOf } from './lessonCards'
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
]

export const catalogGame = (id: GameId) => CATALOG.find((g) => g.id === id)

/** What one card of each type is called, for "Needs 2 more pairs". */
const CARD_WORD: Record<CardType, [one: string, many: string]> = {
  multiple_choice: ['question', 'questions'],
  matching_pair: ['pair', 'pairs'],
  fill_blank: ['sentence', 'sentences'],
}

export type CanPlay = { ok: true } | { ok: false; reason: string }

/** Has the lesson at least MIN_CARDS approved cards of the game's type? */
export function canPlay(game: Pick<CatalogGame, 'cardType'>, lessonId: string): CanPlay {
  const need = MIN_CARDS[TEMPLATE_FOR_TYPE[game.cardType]]
  const have = cardsOf(lessonId).filter((c) => c.status === 'approved' && c.type === game.cardType).length
  if (have >= need) return { ok: true }
  const missing = need - have
  const [one, many] = CARD_WORD[game.cardType]
  return { ok: false, reason: `Needs ${missing} more ${missing === 1 ? one : many}` }
}
