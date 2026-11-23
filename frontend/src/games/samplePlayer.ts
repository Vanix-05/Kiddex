import type { Player } from './types'

/**
 * The sample Student of the dev games page (/dev/games): a girl with a purple
 * fox called Mochi (no name: Students have none). The Teacher preview plays with the same look.
 */
export const SAMPLE_PLAYER: Player = {
  avatar: 'girl',
  buddy: 'fox',
  buddyName: 'Mochi',
  look: { hair: 'ginger', shirt: 'mint', youExtra: 'flower', buddyColor: 'purple', buddyExtra: 'scarf' },
}

/** The fixed player of a Teacher preview. */
export const PREVIEW_PLAYER: Player = { ...SAMPLE_PLAYER }
