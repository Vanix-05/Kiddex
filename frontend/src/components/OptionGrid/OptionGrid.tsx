import type { CSSProperties } from 'react'
import type { CardTint, OptionItem } from '../../data/types'
import { AvatarCard } from '../AvatarCard/AvatarCard'
import styles from './OptionGrid.module.css'

// Card backgrounds cycle through these, in order.
const TINTS: CardTint[] = ['lavender', 'pink', 'peach', 'periwinkle']

interface OptionGridProps {
  items: OptionItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Describes the group for screen readers, e.g. "Companions". */
  label: string
  /** Columns on laptops (1024px+). Extra items wrap onto new rows. */
  columns?: number
  /** Columns on tablets (600-1023px). Phones use 3, then 2 when very narrow. */
  tabletColumns?: number
  /** Lets a screen size the cards (see the variables in AvatarCard.module.css). */
  className?: string
}

/** Responsive grid of AvatarCards built from a data array. */
export function OptionGrid({
  items,
  selectedId,
  onSelect,
  label,
  columns = 2,
  tabletColumns = 2,
  className,
}: OptionGridProps) {
  return (
    <ul
      className={[styles.grid, className].filter(Boolean).join(' ')}
      aria-label={label}
      style={{ '--columns': columns, '--tablet-columns': tabletColumns } as CSSProperties}
    >
      {items.map((item, i) => (
        <li key={item.id} className={styles.cell}>
          <AvatarCard
            item={item}
            tint={TINTS[i % TINTS.length]}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}
