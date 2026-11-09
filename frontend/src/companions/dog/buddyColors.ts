import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Dog buddy colors. The keys are its body colors (from node scripts/list-fills.mjs dog);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const dogBuddyKeys: ColorKeys = {
  fur: { main: '#F0BB95', shade: '#E6A486', max: 26 }, // main fur
  light: { main: '#F4D4A7', shade: '#F4D4A7', max: 18 }, // light fur / face
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const dogPalettes: BuddyPalettes = {
  pink: { fur: { main: '#FFB1BC', shade: '#F49BB3' }, light: { main: '#FFCAC5', shade: '#FFCAC5' } },
  blue: { fur: { main: '#97CCF2', shade: '#7ABCDA' }, light: { main: '#BBDBFF', shade: '#BBDBFF' } },
  mint: { fur: { main: '#89D8AA', shade: '#76C58B' }, light: { main: '#A0E9CD', shade: '#A0E9CD' } },
  purple: { fur: { main: '#DBB7FF', shade: '#BFA5F3' }, light: { main: '#F8C9FF', shade: '#F8C9FF' } },
  gold: { fur: { main: '#EDCE91', shade: '#EAC57B' }, light: { main: '#F1DDB5', shade: '#F1DDB5' } },
}
