import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Raccoon buddy colors. The keys are its body colors (from node scripts/list-fills.mjs raccoon);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const raccoonBuddyKeys: ColorKeys = {
  light: { main: '#DFD2D0', shade: '#DDC3C2', max: 20 }, // light fur / belly / face
  fur: { main: '#BAA6A4', shade: '#B89A99', max: 20 }, // main fur
  fur2: { main: '#B28D8E', shade: '#B59191', max: 16 }, // main fur
  inner: { main: '#D6A8AA', shade: '#D9B6B6', max: 18 }, // inner ears / gills
  mask: { main: '#756261', shade: '#735657', max: 12 }, // dark accents (ears, paws, mask)
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const raccoonPalettes: BuddyPalettes = {
  pink: { light: { main: '#F0D7DE', shade: '#ECCBD5' }, fur: { main: '#E788A4', shade: '#E57D9C' }, fur2: { main: '#E57D9C', shade: '#E683A1' }, inner: { main: '#E78AA6', shade: '#EA98B1' }, mask: { main: '#9E3F5C', shade: '#953C56' } },
  blue: { light: { main: '#D7E4F0', shade: '#CBDDEC' }, fur: { main: '#88BAE7', shade: '#7DB4E5' }, fur2: { main: '#7DB4E5', shade: '#83B8E6' }, inner: { main: '#8ABCE7', shade: '#98C4EA' }, mask: { main: '#3F729E', shade: '#3C6B95' } },
  mint: { light: { main: '#DBEDE3', shade: '#D0E7DB' }, fur: { main: '#96D9B5', shade: '#8CD5AE' }, fur2: { main: '#8DD5AF', shade: '#92D7B2' }, inner: { main: '#98DAB7', shade: '#A4DEBF' }, mask: { main: '#4D906D', shade: '#498866' } },
  purple: { light: { main: '#E2DAED', shade: '#DACFE8' }, fur: { main: '#B293DC', shade: '#AB89D9' }, fur2: { main: '#AC89D9', shade: '#AF8FDB' }, inner: { main: '#B495DD', shade: '#BDA2E1' }, mask: { main: '#6A4A93', shade: '#64468B' } },
  gold: { light: { main: '#F2E8D6', shade: '#EEE2CA' }, fur: { main: '#EBC983', shade: '#E9C478' }, fur2: { main: '#E9C479', shade: '#EAC67F' }, inner: { main: '#ECCA86', shade: '#EED095' }, mask: { main: '#B26A2B', shade: '#A86429' } },
}
