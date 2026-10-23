/** Background tints available for option cards (see colors.tint* in theme.ts). */
export type CardTint = 'lavender' | 'pink' | 'peach' | 'periwinkle'

/** One selectable option, e.g. a companion. */
export interface OptionItem {
  id: string
  /** Shown under the picture. */
  name: string
  image: string
}
