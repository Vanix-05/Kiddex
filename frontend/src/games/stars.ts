// Kept tiny (no imports) so the Lobby and All games can count stars without loading the games.

/** 1 star for finishing, 2 at 75% or more, 3 for a perfect round. */
export function starsFor(right: number, total: number): 1 | 2 | 3 {
  if (total > 0 && right === total) return 3
  if (total > 0 && right / total >= 0.75) return 2
  return 1
}
