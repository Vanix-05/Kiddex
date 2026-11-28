import { useId, useRef, useState, type FormEvent } from 'react'
import { Check, RotateCcw, Trash2, UserMinus, X } from 'lucide-react'
import { usePhoneSideways } from '../../hooks/usePhoneSideways'
import { errorMessage } from '../api/client'
import type { Student } from '../data/types'
import { useStudentRemoval } from '../data/useTeacherData'
import { sameSchoolId } from '../pages/removeStudents'
import { Popup } from './Dialogs'
import { StudentPill } from './NewCodeDialog'
import dialogs from './dialogs.module.css'
import styles from './newCode.module.css'

/**
 * Remove this Student? (mockups 2-remove and 8-phone-remove). Nothing is deleted:
 * they can't log in and leave the list and the Lobby until they are restored.
 * Focus starts on Cancel; Esc closes; focus goes back to the row's ⋯.
 */
export function RemoveStudentDialog({
  student,
  onClose,
  onRemoved,
}: {
  student: Student
  onClose: () => void
  onRemoved: (student: Student) => void
}) {
  const { remove } = useStudentRemoval()
  const phone = usePhoneSideways()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const go = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await remove(student.id)
      onClose()
      onRemoved(student)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Popup
      title="Remove this Student?"
      icon={<UserMinus size={32} strokeWidth={2.4} />}
      tone="maroon"
      split={phone}
      aside={<StudentPill student={student} short={phone} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <ul className={styles.lines}>
        <li>
          <span className={`${styles.tile} ${styles.tileRed}`} aria-hidden="true">
            <X size={16} strokeWidth={3} />
          </span>
          They can't log in, and they leave your list and the Lobby.
        </li>
        <li>
          <span className={`${styles.tile} ${styles.tileGreen}`} aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
          Nothing is deleted. Their buddy, stars and progress are kept.
        </li>
        <li>
          <span className={`${styles.tile} ${styles.tileBlue}`} aria-hidden="true">
            <RotateCcw size={16} strokeWidth={2.6} />
          </span>
          Bring them back anytime from “Removed”.
        </li>
      </ul>
      {error && (
        <p className={dialogs.error} role="alert">
          {error}
        </p>
      )}
      <div className={dialogs.row}>
        <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={dialogs.leave} disabled={saving} onClick={go}>
          <UserMinus size={20} strokeWidth={2.4} aria-hidden="true" /> {saving ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </Popup>
  )
}

/**
 * Delete forever? (mockups 5-delete, 6-delete2, 11 and 12 on a phone). Only for a
 * removed Student. The Teacher types the School ID (dash or not); the button stays
 * faded until it matches. The typed School ID is sent too (the server checks it again).
 */
export function DeleteStudentDialog({
  student,
  onClose,
  onDeleted,
}: {
  student: Student
  onClose: () => void
  onDeleted: (student: Student) => void
}) {
  const { deleteForever } = useStudentRemoval()
  const phone = usePhoneSideways()
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const matches = sameSchoolId(typed, student.schoolId)

  const go = async (e: FormEvent) => {
    e.preventDefault()
    if (saving || !matches) return
    setSaving(true)
    setError(null)
    try {
      await deleteForever(student.id, typed.trim())
      onClose()
      onDeleted(student)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Popup
      title="Delete forever?"
      icon={<Trash2 size={32} strokeWidth={2.4} />}
      tone="maroon"
      split={phone}
      aside={<StudentPill student={student} short={phone} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <ul className={styles.lines}>
        <li>
          <span className={`${styles.tile} ${styles.tileRed}`} aria-hidden="true">
            <X size={16} strokeWidth={3} />
          </span>
          Their account, buddy, stars and scores are erased.
        </li>
        <li>
          <span className={`${styles.tile} ${styles.tileRed}`} aria-hidden="true">
            <X size={16} strokeWidth={3} />
          </span>
          This can't be undone.
        </li>
      </ul>
      <form className={styles.confirm} onSubmit={go}>
        <label className={styles.confirmLabel} htmlFor={inputId}>
          Type <strong className={styles.confirmId}>{student.schoolId}</strong> to confirm
        </label>
        <input
          id={inputId}
          className={dialogs.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          placeholder="School ID"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onFocus={(e) => {
            // The phone keyboard opens: keep the box and the button on screen.
            const box = e.currentTarget
            window.setTimeout(() => box.closest('form')?.scrollIntoView({ block: 'end' }), 300)
          }}
        />
        {error && (
          <p className={dialogs.error} role="alert">
            {error}
          </p>
        )}
        <div className={dialogs.row}>
          <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={dialogs.leave} disabled={!matches || saving}>
            <Trash2 size={20} strokeWidth={2.4} aria-hidden="true" /> {saving ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </form>
    </Popup>
  )
}
