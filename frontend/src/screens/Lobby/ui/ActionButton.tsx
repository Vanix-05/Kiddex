import type { Ref } from 'react'
import { usePhoneSideways } from '../../../hooks/usePhoneSideways'
import { LobbyIcon } from './icons'
import { IS_TOUCH } from './touch'
import styles from './ui.module.css'

/**
 * What the Student can do right here ("Sit", "Talk to Ollie", ...). The game
 * keeps it over their head; keyboard users press E instead. On a phone held
 * sideways, petting the buddy shows a paw and the buddy's name (no "Pet").
 */
export function ActionButton({ id, label, anchorRef, onRun }: { id: string; label: string; anchorRef: Ref<HTMLButtonElement>; onRun: () => void }) {
  const phone = usePhoneSideways()
  const pawOnly = phone && id === 'pet'
  return (
    <button
      ref={anchorRef}
      type="button"
      className={`${styles.action} ${IS_TOUCH ? styles.actionTouch : ''}`}
      aria-label={pawOnly ? label : undefined}
      onClick={onRun}
    >
      {!IS_TOUCH && (
        <kbd className={styles.key} aria-hidden="true">
          E
        </kbd>
      )}
      {pawOnly ? (
        <>
          <LobbyIcon name="paw" size={20} />
          {label.replace(/^Pet /, '')}
        </>
      ) : (
        label
      )}
    </button>
  )
}
