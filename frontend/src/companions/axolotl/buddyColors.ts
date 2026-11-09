import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Axolotl buddy colors. The keys are its body colors (from node scripts/list-fills.mjs axolotl);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const axolotlBuddyKeys: ColorKeys = {
  body: { main: '#FBBFC5', shade: '#FCC6CC', max: 26 }, // main fur
  light: { main: '#FED7E3', shade: '#FCD2DE', max: 20 }, // light fur / face
  gills: { main: '#FB95A7', shade: '#FEA7B9', max: 24 }, // inner ears / gills
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const axolotlPalettes: BuddyPalettes = {
  pink: { body: { main: '#F5BEE5', shade: '#F6C5E8' }, light: { main: '#F5D8F6', shade: '#F3D3F2' }, gills: { main: '#EC94DB', shade: '#EFA7E5' } },
  blue: { body: { main: '#9DD9D3', shade: '#A8DED8' }, light: { main: '#C2E9DD', shade: '#BCE6DA' }, gills: { main: '#5DC3B1', shade: '#78CFBD' } },
  mint: { body: { main: '#B1E3C8', shade: '#B7E5CC' }, light: { main: '#D0EDDD', shade: '#CBEBDA' }, gills: { main: '#9FDCBB', shade: '#AEE2C6' } },
  purple: { body: { main: '#BFCCFA', shade: '#C6D2FB' }, light: { main: '#D1E2FA', shade: '#CCDEF8' }, gills: { main: '#8FADF6', shade: '#A0BDF8' } },
  gold: { body: { main: '#F0D6A3', shade: '#F1DAAA' }, light: { main: '#F5E6C8', shade: '#F3E3C2' }, gills: { main: '#EDCD8E', shade: '#F0D5A0' } },
}
