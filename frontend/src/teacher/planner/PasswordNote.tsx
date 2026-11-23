import { KeyRound, X } from 'lucide-react'
import styles from './planner.module.css'

/**
 * The "still temporary" sticky note. Laptop: in the top bar, left of Full
 * screen, outside the book. Phone (sideways): the screen's bottom-right corner.
 * TeacherPlanner shows it only while the password is temporary and the note
 * wasn't closed.
 */
export function PasswordNote({ phone, onChange, onHide }: { phone: boolean; onChange: () => void; onHide: () => void }) {
  return (
    <aside className={phone ? `${styles.note} ${styles.notePhone}` : styles.note} aria-label="Password reminder">
      <span className={styles.noteTape} aria-hidden="true" />
      <KeyRound className={styles.noteKey} size={26} strokeWidth={2.4} aria-hidden="true" />
      <div className={styles.noteText}>
        <b>Your password is still temporary.</b>
        <button type="button" className={styles.noteLink} onClick={onChange} aria-haspopup="dialog">
          Change it now
        </button>
      </div>
      <button type="button" className={styles.noteClose} aria-label="Hide this note" onClick={onHide}>
        <X size={18} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </aside>
  )
}
