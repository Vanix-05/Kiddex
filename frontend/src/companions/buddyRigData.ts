import type { BuddyId } from '../setup/quizData'
import type { RigParts } from './TracedRig'
import { axolotlBuddyKeys, axolotlPalettes } from './axolotl/buddyColors'
import { axolotlParts } from './axolotl/axolotlParts.generated'
import { dogBuddyKeys, dogPalettes } from './dog/buddyColors'
import { dogParts } from './dog/dogParts.generated'
import { foxBuddyKeys, foxPalettes } from './fox/buddyColors'
import { foxParts } from './fox/foxParts.generated'
import { kittyBuddyKeys, kittyPalettes } from './kitty/buddyColors'
import { kittyParts } from './kitty/kittyParts.generated'
import { monkeyBuddyKeys, monkeyPalettes } from './monkey/buddyColors'
import { monkeyParts } from './monkey/monkeyParts.generated'
import { otterBuddyKeys, otterPalettes } from './otter/buddyColors'
import { otterParts } from './otter/otterParts.generated'
import { raccoonBuddyKeys, raccoonPalettes } from './raccoon/buddyColors'
import { raccoonParts } from './raccoon/raccoonParts.generated'
import { ramBuddyKeys, ramPalettes } from './ram/buddyColors'
import { ramParts } from './ram/ramParts.generated'
import { buildRecolor, isBuddyColorId, type BuddyPalettes, type ColorKeys } from './rig/recolor'

/**
 * Each buddy's traced parts and color data, for drawing single parts of a
 * buddy outside its rig (the arms that reach out of the storybook).
 */
const DATA: Record<BuddyId, { parts: RigParts; keys: ColorKeys; palettes: BuddyPalettes }> = {
  otter: { parts: otterParts, keys: otterBuddyKeys, palettes: otterPalettes },
  fox: { parts: foxParts, keys: foxBuddyKeys, palettes: foxPalettes },
  kitty: { parts: kittyParts, keys: kittyBuddyKeys, palettes: kittyPalettes },
  axolotl: { parts: axolotlParts, keys: axolotlBuddyKeys, palettes: axolotlPalettes },
  dog: { parts: dogParts, keys: dogBuddyKeys, palettes: dogPalettes },
  monkey: { parts: monkeyParts, keys: monkeyBuddyKeys, palettes: monkeyPalettes },
  raccoon: { parts: raccoonParts, keys: raccoonBuddyKeys, palettes: raccoonPalettes },
  ram: { parts: ramParts, keys: ramBuddyKeys, palettes: ramPalettes },
}

/** One shape of an arm: its outline and its color (already in the Student's buddy color). */
export interface ArmShape {
  d: string
  fill: string
}

/**
 * A buddy's two arms as drawn in its picture (5000 x 5000 pixels; the
 * shoulder is at the top, the paw at the bottom), in the given buddy color
 * (a customizeData buddyColor id; anything else = as drawn).
 */
export function buddyArms(id: BuddyId, buddyColor?: string): { left: ArmShape[]; right: ArmShape[] } {
  const { parts, keys, palettes } = DATA[id]
  const recolor = isBuddyColorId(buddyColor) ? buildRecolor(parts, keys, palettes[buddyColor]) : {}
  const arm = (part: 'armLeft' | 'armRight') => parts[part].map(([d, fill]) => ({ d, fill: recolor[part]?.get(fill) ?? fill }))
  return { left: arm('armLeft'), right: arm('armRight') }
}
