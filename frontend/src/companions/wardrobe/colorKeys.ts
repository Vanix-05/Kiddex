import type { ColorKey } from '../rig/recolor'

/**
 * The wardrobe's recolor keys (from `npm run rig:wardrobe -- --colors`).
 * The pieces are drawn in prepared colors: hair in the girl's brown family,
 * clothes in main #BAC8DA + shade #A2AEC4, the outline #7B5062 everywhere.
 */
export const wardrobeColorKeys = {
  /** Every hair piece. The bow, outline and the skin between strands are far enough away. */
  hair: { main: '#9D756D', shade: '#9C6862', max: 20 },
  /** Every clothing piece (each with its own color). White, the plaid, skin and outline are far enough away. */
  cloth: { main: '#BAC8DA', shade: '#A2AEC4', max: 28 },
  /** The same as the girl's skin key: the bald base, the face, and any skin inside a hair piece. */
  skin: { main: '#FEEBDC', shade: '#FACFC4', max: 22 },
  /** The bald base's lavender shorts (and tank top, always under a top): Shorts take the bottom color. */
  shorts: { main: '#D6D0E9', shade: '#CEB2C8', max: 22, parts: ['body', 'legLeft', 'legRight'] },
  /** The face's eyes: dark pupils (the light rings are far away). */
  eyes: { main: '#50322C', shade: '#664A41', max: 30 },
} satisfies Record<string, ColorKey>
