/**
 * KIDDEX theme: the single source of truth for colors, fonts and sizing.
 *
 * `applyTheme()` (called once in main.tsx) writes every token below to a CSS
 * variable on <html>, e.g. `colors.buttonBg` -> `--color-button-bg`.
 * Stylesheets should only ever use those variables, never raw hex values.
 *
 * Contrast ratios (WCAG 2.x) are noted next to text/indicator colors.
 */
export const theme = {
  colors: {
    // Scene
    sky: '#A9DCF2',
    skyLight: '#D3EEF9',
    sea: '#6CC2E8',
    seaDeep: '#4FAEDB',

    // Card
    cardBg: '#FCF4E6',
    cardBorder: '#6B4A33',
    titlePillBg: '#F9DC9A',
    titleRays: '#F0A050',

    // Text
    text: '#4A3426', // 10.6:1 on cardBg
    textMuted: '#5C4636', // 8.1:1 on cardBg
    textSubtle: '#735A48', // 5.9:1 on cardBg
    link: '#9A4A16', // 5.7:1 on cardBg

    // Buttons: keep the mockup's soft orange and use dark brown text.
    buttonBg: '#F0A050',
    buttonBgHover: '#F3B068',
    buttonBorder: '#C77A36',
    buttonText: '#4A2A12', // 6.0:1 on buttonBg (AA)
    buttonDisabledBg: '#F2DEC6',
    buttonDisabledText: '#8C7360',

    // Inputs
    inputBg: '#FFFBF4',
    // Light border to match the mockup. Note: 1.9:1, below the WCAG 3:1
    // guideline for field outlines. The focused field gets a dark border + ring.
    inputBorder: '#C9B49E',
    inputBorderFocus: '#6B4A33',
    inputPlaceholder: '#7A6150', // 5.6:1 on inputBg (AA)
    inputIcon: '#6B4A33',

    // Selection (border + check badge). The badge and scale-up mean the
    // selected state never relies on color alone.
    selected: '#BF5A16', // ≥3:1 on cream and pink card backgrounds
    focusRing: '#2F6FB5',

    // Option card backgrounds
    tintLavender: '#DCD6F2',
    tintPink: '#F9D9D3',
    tintPeach: '#F9E4CB',
    tintPeriwinkle: '#DCDDF5',
    labelPillBg: '#FFF8EE',

    // Logo
    logoOrange: '#F08A4B',
    logoOutline: '#FFF6E8',
    logoShadow: '#E2B48A',
  },

  fonts: {
    body: "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif",
    display: "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif",
  },

  radii: {
    sm: '12px',
    md: '18px',
    lg: '24px',
    xl: '36px',
    pill: '999px',
  },

  sizes: {
    tapTarget: '48px', // minimum height/width for anything tappable
    controlHeight: '56px', // buttons and inputs
    cardBorder: '3px',
    inputBorder: '1.5px',
    // Sun in the scene background. Shared so layouts can keep clear of it.
    sun: 'clamp(110px, min(13vw, 20vh), 210px)',
    sunInset: '4vw',
  },

  shadows: {
    card: '0 10px 0 rgba(107, 74, 51, 0.12), 0 18px 40px rgba(60, 110, 140, 0.18)',
    button: '0 4px 0 #C77A36',
  },
} as const

/** camelCase -> kebab-case, e.g. buttonBg -> button-bg */
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

const prefixes: Record<keyof typeof theme, string> = {
  colors: 'color',
  fonts: 'font',
  radii: 'radius',
  sizes: 'size',
  shadows: 'shadow',
}

/** Writes all theme tokens to CSS variables on the root element. */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const group of Object.keys(theme) as (keyof typeof theme)[]) {
    for (const [key, value] of Object.entries(theme[group])) {
      root.style.setProperty(`--${prefixes[group]}-${kebab(key)}`, value)
    }
  }
}
