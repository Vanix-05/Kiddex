import type { ReactNode } from 'react'

/** The Lobby's small pictures. Decorative: label the button or card instead. */
export type LobbyIconName =
  | 'star'
  | 'flame'
  | 'book'
  | 'mic'
  | 'puzzle'
  | 'palm'
  | 'owl'
  | 'house'
  | 'pad'
  | 'gear'
  | 'zoomIn'
  | 'zoomOut'
  | 'diagonal'
  | 'straight'
  | 'medal'

const INK = '#5b3a22'
const line = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const ui = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

const ICONS: Record<LobbyIconName, ReactNode> = {
  star: <path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z" {...line} fill="#ffd34d" />,
  flame: (
    <path d="M12 22c-4.4 0-7-2.9-7-6.6 0-3.6 2.6-5.8 4.1-8.6.6 1.9 1.6 2.9 2.7 3.4C12 7 13 4.3 15.3 2c.3 3.9 3.7 6.6 3.7 11.4C19 18.4 16.4 22 12 22z" {...line} fill="#ff9a4d" />
  ),
  book: (
    <g {...line}>
      <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" fill="#ffe2b8" />
      <path d="M12 6v13.5" />
    </g>
  ),
  mic: (
    <g {...line}>
      <rect x="8.5" y="2.5" width="7" height="11" rx="3.5" fill="#c9b6f0" />
      <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7" />
    </g>
  ),
  puzzle: <path d="M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4h-4a2 2 0 10-4 0H4v-4a2 2 0 100-4z" {...line} fill="#9fdcc0" />,
  palm: (
    <g {...line}>
      <path d="M12 21c0-5 .5-8 1.5-11" />
      <path d="M13.5 10c-2-3-5.5-3.5-8-2 2.5 0 4.5 1 6 3M13.5 10c1-3 4.5-4.5 7.5-3.5-2.5.5-4.5 2-5.5 4M13.5 10c-.5-3 1-6 3.5-7" fill="#8fd18a" />
      <path d="M8 21h9" />
    </g>
  ),
  owl: (
    <g {...line}>
      <ellipse cx="12" cy="13.5" rx="7.5" ry="8" fill="#f5e1c4" />
      <circle cx="9" cy="12" r="2.4" fill="#fff" />
      <circle cx="15" cy="12" r="2.4" fill="#fff" />
      <path d="M11 15l1 1.4 1-1.4z" fill="#f0a050" />
    </g>
  ),
  house: (
    <g {...line}>
      <path d="M3.5 11L12 3.5l8.5 7.5" />
      <path d="M5.5 9.5V20h13V9.5" fill="#ffe2b8" />
      <rect x="10" y="13.5" width="4" height="6.5" fill="#f0a050" />
    </g>
  ),
  pad: (
    <g {...line}>
      <path d="M7 7h10a4.5 4.5 0 014.4 5.5l-1 4.4a2.6 2.6 0 01-4.6 1l-1.6-2H9.8l-1.6 2a2.6 2.6 0 01-4.6-1l-1-4.4A4.5 4.5 0 017 7z" fill="#c9e7fa" />
      <path d="M7.5 10.5v3M6 12h3" />
      <circle cx="16" cy="11" r="1" fill={INK} />
      <circle cx="17.5" cy="13" r="1" fill={INK} />
    </g>
  ),
  medal: (
    <g {...line}>
      <path d="M8 2.5l4 6 4-6" fill="#9fd0f0" />
      <circle cx="12" cy="15" r="6" fill="#ffd34d" />
    </g>
  ),
  gear: (
    <g {...ui}>
      <path
        d="M10.3 2.5h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"
        fill="#ffe2b8"
      />
      <circle cx="12" cy="12" r="3.2" fill="#fff" />
    </g>
  ),
  zoomIn: (
    <g {...ui}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5M10.5 8v5M8 10.5h5" />
    </g>
  ),
  zoomOut: (
    <g {...ui}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5M8 10.5h5" />
    </g>
  ),
  diagonal: (
    <g {...ui}>
      <path d="M12 4l8 6-8 6-8-6z" />
      <path d="M4 10v4l8 6 8-6v-4" />
    </g>
  ),
  straight: (
    <g {...ui}>
      <path d="M5 6h14l2 9H3z" />
      <path d="M3 15v3h18v-3" />
    </g>
  ),
}

export function LobbyIcon({ name, size = 24 }: { name: LobbyIconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  )
}
