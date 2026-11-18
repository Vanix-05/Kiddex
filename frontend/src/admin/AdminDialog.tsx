import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import styles from './admin.module.css'

interface AdminDialogProps {
  title: string
  children: ReactNode
  /** Esc and tapping outside call this. Leave it out for a popup that must not close by accident. */
  onClose?: () => void
  /** What gets focus when it opens (else the first button or field). */
  initialFocus?: RefObject<HTMLElement | null>
}

/**
 * A popup on the Admin page: a panel that slides up from the bottom on phones
 * and a centered card on wide screens. It uses the browser's own modal
 * <dialog>, so focus stays inside and the page behind can't be reached.
 * The page that opens it moves focus back to the button that opened it.
 */
export function AdminDialog({ title, children, onClose, initialFocus }: AdminDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // The latest onClose, without reopening the dialog when it changes.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const target = initialFocus?.current ?? dialog.querySelector<HTMLElement>('input, button:not([disabled])')
    target?.focus()

    // Esc: close only when allowed (never for the password box).
    const onCancel = (event: Event) => {
      event.preventDefault()
      closeRef.current?.()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
    }
  }, [initialFocus])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="admin-dialog-title"
      // A tap on the dimmed area (the dialog itself, not the panel) closes it, when allowed.
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.()
      }}
    >
      <div className={styles.panel}>
        <h2 id="admin-dialog-title" className={styles.dialogTitle}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
