import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Otter buddy colors. The keys are its body colors (from node scripts/list-fills.mjs otter);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const otterBuddyKeys: ColorKeys = {
  fur: { main: '#B19692', shade: '#AD8381', max: 24 }, // main fur
  light: { main: '#FCF0E4', shade: '#F8D4CB', max: 26 }, // light fur / belly / face
  dark: { main: '#613C3C', shade: '#624443', max: 22 }, // dark accents (ears, paws, mask)
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const otterPalettes: BuddyPalettes = {
  pink: { fur: { main: '#E57F9D', shade: '#E16D90' }, light: { main: '#F7E9ED', shade: '#EFD3DC' }, dark: { main: '#8A3750', shade: '#903953' } },
  blue: { fur: { main: '#7FB5E5', shade: '#6DABE1' }, light: { main: '#E9F0F7', shade: '#D3E2EF' }, dark: { main: '#37638A', shade: '#396890' } },
  mint: { fur: { main: '#8ED6AF', shade: '#7ED0A5' }, light: { main: '#EBF5F0', shade: '#D8EBE1' }, dark: { main: '#437E5F', shade: '#468363' } },
  purple: { fur: { main: '#AD8AD9', shade: '#A17BD4' }, light: { main: '#EFEAF5', shade: '#E0D7EC' }, dark: { main: '#5C4181', shade: '#604386' } },
  gold: { fur: { main: '#EAC47A', shade: '#E7BC68' }, light: { main: '#F8F2E8', shade: '#F0E6D2' }, dark: { main: '#9B5D26', shade: '#A26127' } },
}
