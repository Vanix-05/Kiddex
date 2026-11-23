import { useEffect, useRef, useState } from 'react'
import { Check, KeyRound, Printer, X } from 'lucide-react'
import { errorMessage } from '../api/client'
import { buddyHeads } from '../assets'
import type { Student } from '../data/types'
import { useNewCode, useSection, useTeacher } from '../data/useTeacherData'
import { toLoginCards, usePrintCards } from '../print/printCards'
import { Popup } from './Dialogs'
import dialogs from './dialogs.module.css'
import styles from './newCode.module.css'

/** The Student in a pill: buddy head (or an empty circle), School ID, "Mochi · Registered". */
function StudentPill({ student }: { student: Student }) {
  const detail = [student.buddyName, student.registered ? 'Registered' : 'Not yet'].filter(Boolean).join(' · ')
  return (
    <div className={styles.pill}>
      {student.buddy ? (
        <img src={buddyHeads[student.buddy]} alt="" className={styles.head} />
      ) : (
        <span className={`${styles.head} ${styles.headEmpty}`} aria-hidden="true" />
      )}
      <strong className={styles.schoolId}>{student.schoolId}</strong>
      <span className={styles.detail}>{detail}</span>
    </div>
  )
}

/** "730-264" in 6 big boxes (3 + dash + 3). */
function CodeBoxes({ code }: { code: string }) {
  const digits = code.replace(/\D/g, '').split('')
  return (
    <div className={styles.code}>
      <span className="visually-hidden">New code: {code}</span>
      <span className={styles.boxes} aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i} className={styles.boxGroup}>
            {i === 3 && <span className={styles.dash}>-</span>}
            <span className={styles.box}>{d}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

/**
 * Give a new login code? (lost card or forgotten PIN code). After "Make new code"
 * the same popup shows the new code, with Done and Print card (just this Student).
 */
export function NewCodeDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const newCode = useNewCode()
  const print = usePrintCards()
  const { active } = useSection()
  const teacher = useTeacher()
  const [made, setMade] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  // The new code is on the screen: focus Done.
  useEffect(() => {
    if (made) doneRef.current?.focus({ preventScroll: true })
  }, [made])

  const make = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      setMade(await newCode(student.id))
    } catch (err) {
      setError(errorMessage(err))
    }
    setSaving(false)
  }

  if (made) {
    return (
      <Popup title="New login code" icon={<Check size={34} strokeWidth={3} />} onClose={onClose} initialFocus={doneRef}>
        <StudentPill student={student} />
        <CodeBoxes code={made.oneTimeCode ?? ''} />
        <p className={styles.note}>Works once. Give it to the Student yourself.</p>
        <div className={dialogs.row}>
          <button ref={doneRef} type="button" className={dialogs.stay} onClick={onClose}>
            Done
          </button>
          <button
            type="button"
            className={dialogs.save}
            onClick={() => active && print(toLoginCards([made], active, teacher.name))}
          >
            <Printer size={20} strokeWidth={2.4} aria-hidden="true" /> Print card
          </button>
        </div>
      </Popup>
    )
  }

  return (
    <Popup
      title="Give a new login code?"
      icon={<KeyRound size={32} strokeWidth={2.4} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <StudentPill student={student} />
      <ul className={styles.lines}>
        <li>
          <span className={`${styles.tile} ${styles.tileRed}`} aria-hidden="true">
            <X size={16} strokeWidth={3} />
          </span>
          Their PIN code stops working now.
        </li>
        <li>
          <span className={`${styles.tile} ${styles.tileBlue}`} aria-hidden="true">
            <KeyRound size={16} strokeWidth={2.4} />
          </span>
          They log in with the new code and make a new PIN code.
        </li>
        <li>
          <span className={`${styles.tile} ${styles.tileGreen}`} aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
          Their buddy, stars and progress are kept.
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
        <button type="button" className={dialogs.save} disabled={saving} onClick={make}>
          {saving ? 'Making…' : 'Make new code'}
        </button>
      </div>
    </Popup>
  )
}
