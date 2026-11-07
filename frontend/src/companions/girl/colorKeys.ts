import type { ColorKeys } from '../rig/recolor'

/**
 * Customize recolor keys (from node scripts/list-fills.mjs girl). Each fill
 * near a key moves with it; the outline, eyes, blush, bow and skirt are far
 * enough away to stay as drawn. The white socks and eye rings are close to
 * the skin, so they are kept by name.
 */
export const girlColorKeys: ColorKeys = {
  skin: { main: '#FEEBDC', shade: '#FACFC4', max: 22, keep: ['#FEF8EF', '#FADBD5', '#FEEECD'] }, // socks, sock shading, eye rings
  hair: { main: '#9D756D', shade: '#9B6762', max: 20, parts: ['head'] },
  shirt: { main: '#FEDAA2', shade: '#FAC090', max: 28 },
}
