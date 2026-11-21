import type { Player } from './types'

/**
 * The sample Student of the dev games page (/dev/games): Ana, a girl with a
 * purple fox called Mochi. The Teacher preview plays with the same look, named "Preview".
 */
export const SAMPLE_PLAYER: Player = {
  name: 'Ana',
  avatar: 'girl',
  buddy: 'fox',
  buddyName: 'Mochi',
  look: { hair: 'ginger', shirt: 'mint', youExtra: 'flower', buddyColor: 'purple', buddyExtra: 'scarf' },
}

/** The fixed player of a Teacher preview. */
export const PREVIEW_PLAYER: Player = { ...SAMPLE_PLAYER, name: 'Preview' }
