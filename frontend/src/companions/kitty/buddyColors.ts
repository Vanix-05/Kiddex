import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Kitty buddy colors. The keys are its body colors (from node scripts/list-fills.mjs kitty);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const kittyBuddyKeys: ColorKeys = {
  fur: { main: '#F5D0CC', shade: '#F4CFCB', max: 22 }, // main fur
  belly: { main: '#F9ECE5', shade: '#F9ECE5', max: 14 }, // light fur / belly / face
  mask: { main: '#A3847A', shade: '#A1756D', max: 26 }, // face mask and paws
  inner: { main: '#BE6B59', shade: '#B5675A', max: 20 }, // inner ears / gills
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const kittyPalettes: BuddyPalettes = {
  pink: { fur: { main: '#EDA9BD', shade: '#EDA7BC' }, belly: { main: '#F7E8EC', shade: '#F7E8EC' }, mask: { main: '#BA617C', shade: '#B55773' }, inner: { main: '#DF5F86', shade: '#DD5980' } },
  blue: { fur: { main: '#A9CDED', shade: '#A7CCED' }, belly: { main: '#E8F0F7', shade: '#E8F0F7' }, mask: { main: '#6190BA', shade: '#5789B5' }, inner: { main: '#5FA3DF', shade: '#599FDD' } },
  mint: { fur: { main: '#B3E3C9', shade: '#B1E3C8' }, belly: { main: '#EAF5EF', shade: '#EAF5EF' }, mask: { main: '#6EAD8B', shade: '#65A784' }, inner: { main: '#72CC9C', shade: '#6CCA98' } },
  purple: { fur: { main: '#C7B1E6', shade: '#C6AFE5' }, belly: { main: '#EFEAF5', shade: '#EFEAF5' }, mask: { main: '#896BAF', shade: '#8162AA' }, inner: { main: '#986ED0', shade: '#9468CE' } },
  gold: { fur: { main: '#F1D8A5', shade: '#F0D7A4' }, belly: { main: '#F7F2E7', shade: '#F7F2E7' }, mask: { main: '#CC894F', shade: '#C98143' }, inner: { main: '#E4B65A', shade: '#E3B353' } },
}
