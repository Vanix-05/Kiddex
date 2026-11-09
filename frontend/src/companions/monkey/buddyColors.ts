import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Monkey buddy colors. The keys are its body colors (from node scripts/list-fills.mjs monkey);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const monkeyBuddyKeys: ColorKeys = {
  fur: { main: '#A3847A', shade: '#A1756D', max: 26 }, // main fur
  face: { main: '#F5D9C8', shade: '#F1C0B2', max: 26 }, // light fur / belly / face
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const monkeyPalettes: BuddyPalettes = {
  pink: { fur: { main: '#E27294', shade: '#E0668A' }, face: { main: '#F2DCE3', shade: '#EBC9D3' } },
  blue: { fur: { main: '#72AEE2', shade: '#66A7E0' }, face: { main: '#DCE8F2', shade: '#C9DBEB' } },
  mint: { fur: { main: '#83D2A8', shade: '#78CEA0' }, face: { main: '#DFEFE7', shade: '#CEE6D9' } },
  purple: { fur: { main: '#A47FD5', shade: '#9C74D2' }, face: { main: '#E6DEF0', shade: '#D8CDE7' } },
  gold: { fur: { main: '#E7BF6D', shade: '#E5B960' }, face: { main: '#F3EBDB', shade: '#EDE0C7' } },
}
