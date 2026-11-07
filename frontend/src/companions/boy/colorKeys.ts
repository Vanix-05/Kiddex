import type { ColorKeys } from '../rig/recolor'

/**
 * Customize recolor keys (from node scripts/list-fills.mjs boy). His white
 * shirt's shading is close to his skin, so the shirt only covers the body and
 * arms; his dark hair is close to the outline, so hair has a small distance.
 */
export const boyColorKeys: ColorKeys = {
  skin: { main: '#FEEBDC', shade: '#FACFC4', max: 22, keep: ['#FEEECD'] }, // eye rings
  hair: { main: '#5F4B69', shade: '#635372', max: 14, parts: ['head'] },
  shirt: { main: '#FEFAEE', shade: '#FADDD4', max: 22, parts: ['body', 'armLeft', 'armRight'] },
}
