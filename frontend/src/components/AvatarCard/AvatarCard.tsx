import type { CardTint, OptionItem } from '../../data/types'
import { Icon } from '../Icon/Icon'
import styles from './AvatarCard.module.css'

interface AvatarCardProps {
  item: OptionItem
  tint: CardTint
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * A selectable picture card (a companion, ...).
 * Selected state = thick orange border + check badge + slight scale-up (with
 * a small bounce when picked), so it never relies on color alone.
 */
export function AvatarCard({ item, tint, selected, onSelect }: AvatarCardProps) {
  return (
    <button
      type="button"
      className={[styles.card, styles[tint], selected && styles.selected].filter(Boolean).join(' ')}
      aria-pressed={selected}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.media}>
        <img src={item.image} alt="" className={styles.image} draggable={false} decoding="async" />
      </span>
      <span className={styles.label}>{item.name}</span>
      {selected && (
        <span className={styles.badge} aria-hidden="true">
          <Icon name="check" size={22} />
        </span>
      )}
    </button>
  )
}
