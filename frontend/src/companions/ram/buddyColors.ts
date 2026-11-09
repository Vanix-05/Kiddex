import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Ram buddy colors. The keys are its body colors (from node scripts/list-fills.mjs ram);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const ramBuddyKeys: ColorKeys = {
  wool: { main: '#FAD8D6', shade: '#FCE3DF', max: 20 }, // main fur
  face: { main: '#FEF5F0', shade: '#F8EBE4', max: 16 }, // light fur / belly / face
  horns: { main: '#D3B5AC', shade: '#D0A099', max: 26 }, // dark accents (ears, paws, mask)
  inner: { main: '#FAAFA4', shade: '#FAAFA4', max: 18 }, // inner ears / gills
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const ramPalettes: BuddyPalettes = {
  pink: { wool: { main: '#FAD6E9', shade: '#FDE1EE' }, face: { main: '#FFF4F6', shade: '#FBE9ED' }, horns: { main: '#D7B2BF', shade: '#D29DB6' }, inner: { main: '#FDAAD1', shade: '#FDAAD1' } },
  blue: { wool: { main: '#C4E6E8', shade: '#D4EDF1' }, face: { main: '#EFF8FD', shade: '#E3F0F7' }, horns: { main: '#A2C0C9', shade: '#83B3BA' }, inner: { main: '#82CDD8', shade: '#82CDD8' } },
  mint: { wool: { main: '#CDE7C9', shade: '#D9EED8' }, face: { main: '#EEFAF2', shade: '#E1F2E6' }, horns: { main: '#A5C3A9', shade: '#8DB58B' }, inner: { main: '#91D08F', shade: '#91D08F' } },
  purple: { wool: { main: '#DCDDFB', shade: '#E8E6FE' }, face: { main: '#F9F5FF', shade: '#F1EBFB' }, horns: { main: '#BEB7D7', shade: '#A9A6D3' }, inner: { main: '#BDB8FF', shade: '#BDB8FF' } },
  gold: { wool: { main: '#F1DAAB', shade: '#F3DEB4' }, face: { main: '#F9F5ED', shade: '#F5EEE0' }, horns: { main: '#D7955B', shade: '#D38A4A' }, inner: { main: '#EED094', shade: '#EED094' } },
}
