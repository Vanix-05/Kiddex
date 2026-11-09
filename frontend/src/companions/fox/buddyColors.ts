import type { BuddyPalettes, ColorKeys } from '../rig/recolor'

/**
 * Fox buddy colors. The keys are its body colors (from node scripts/list-fills.mjs fox);
 * every fill near a key moves with it, keeping the shading. The outline, eyes,
 * nose, mouth and blush are never in a key, so they stay as drawn.
 */
export const foxBuddyKeys: ColorKeys = {
  fur: { main: '#F7BF93', shade: '#F3A983', max: 26 }, // main fur
  inner: { main: '#F7D7D3', shade: '#F6CDCA', max: 18 }, // inner ears / gills
  belly: { main: '#FBF4ED', shade: '#FBF4ED', max: 14 }, // light fur / belly / face
  dark: { main: '#A88C7D', shade: '#A67D70', max: 22 }, // dark accents (ears, paws, mask)
}

/**
 * Each Customize buddy color, per group (main + shade). Pastel and bright,
 * belly kept light, dark accents a darker shade of the same color; checked on
 * /dev/looks. Edit freely: tweak a hex and reload /dev/looks.
 */
export const foxPalettes: BuddyPalettes = {
  pink: { fur: { main: '#FFB4BE', shade: '#FF9EB6' }, inner: { main: '#F8D5E6', shade: '#F6CBE2' }, belly: { main: '#FFF2F3', shade: '#FFF2F3' }, dark: { main: '#AF8891', shade: '#AC798A' } },
  blue: { fur: { main: '#99D1FD', shade: '#79C3E9' }, inner: { main: '#C4E4E8', shade: '#B5DEE1' }, belly: { main: '#EFF6FD', shade: '#EFF6FD' }, dark: { main: '#7A96A5', shade: '#648D9A' } },
  mint: { fur: { main: '#86DEAD', shade: '#71CF8E' }, inner: { main: '#CBE5C9', shade: '#C0DFBB' }, belly: { main: '#EBF8F2', shade: '#EBF8F2' }, dark: { main: '#769A82', shade: '#66906D' } },
  purple: { fur: { main: '#E4B9FF', shade: '#CBA8FF' }, inner: { main: '#DCDBF9', shade: '#D2D3F8' }, belly: { main: '#FAF3FE', shade: '#FAF3FE' }, dark: { main: '#998BAE', shade: '#8A7FAC' } },
  gold: { fur: { main: '#EECF93', shade: '#EBC881' }, inner: { main: '#F1D8A7', shade: '#EFD49E' }, belly: { main: '#F9F4EB', shade: '#F9F4EB' }, dark: { main: '#CE7E37', shade: '#C67630' } },
}
