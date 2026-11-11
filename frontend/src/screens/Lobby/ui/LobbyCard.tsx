import type { CSSProperties, ReactNode } from 'react'
import { LobbyIcon, type LobbyIconName } from './icons'
import styles from './ui.module.css'

/**
 * A card over the dimmed room. Closes with its ✕, a tap outside it, or Escape
 * (LobbyScreen listens for the key). Scrolls if it is taller than the screen.
 */
export function LobbyCard({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={styles.dim}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

/** The round picture at the top of a card. `tint` is a theme color variable. */
export function BigIcon({ icon, tint, children }: { icon?: LobbyIconName; tint: string; children?: ReactNode }) {
  return (
    <div className={styles.bigIcon} style={{ '--tint': `var(${tint})` } as CSSProperties}>
      {icon ? <LobbyIcon name={icon} size={48} /> : children}
    </div>
  )
}

/** A card button. The `primary` one takes focus when the card opens. */
export function CardButton({
  children,
  onClick,
  color,
  primary = false,
}: {
  children: ReactNode
  onClick: () => void
  color?: 'orange' | 'green'
  primary?: boolean
}) {
  const tone = color === 'orange' ? styles.btnOrange : color === 'green' ? styles.btnGreen : ''
  return (
    <button type="button" className={`${styles.btn} ${tone}`} onClick={onClick} autoFocus={primary}>
      {children}
    </button>
  )
}
