import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { LogOut, Plus, UserPlus } from 'lucide-react'
import { SECTION_GRADES, useAddStudent, useSection, useStudents } from '../data/useTeacherData'
import styles from './dialogs.module.css'

/**
 * A small popup over the blurred dashboard. Esc or a click on the blur closes
 * it; focus goes to `initialFocus` (or the card) and back where it was after.
 */
function Popup({
  title,
  icon,
  tone = 'orange',
  onClose,
  initialFocus,
  children,
}: {
  title: string
  icon: ReactNode
  tone?: 'orange' | 'maroon'
  onClose: () => void
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const titleId = useId()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ;(initialFocus?.current ?? cardRef.current)?.focus({ preventScroll: true })
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [initialFocus])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    // Capture: closes this popup before the Students window sees the Esc.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      className={styles.veil}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <span className={tone === 'maroon' ? `${styles.ring} ${styles.ringMaroon}` : styles.ring} aria-hidden="true">
          {icon}
        </span>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

/** Log out? Stay / Log out. */
export function LogOutDialog({ onStay, onLogOut }: { onStay: () => void; onLogOut: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null)
  return (
    <Popup title="Log out?" icon={<LogOut size={34} strokeWidth={2.4} />} tone="maroon" onClose={onStay} initialFocus={stayRef}>
      <p className={styles.text}>You can log in again anytime.</p>
      <div className={styles.row}>
        <button ref={stayRef} type="button" className={styles.stay} onClick={onStay}>
          Stay
        </button>
        <button type="button" className={styles.leave} onClick={onLogOut}>
          <LogOut size={20} strokeWidth={2.4} aria-hidden="true" /> Log out
        </button>
      </div>
    </Popup>
  )
}

/** New section: Grade 3 to 6 and the section's name. Saving adds its tab and opens it. */
export function NewSectionDialog({ onClose }: { onClose: () => void }) {
  const { addSection, sections } = useSection()
  const [grade, setGrade] = useState(4)
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const errorId = useId()
  const clean = name.trim()
  const taken = sections.some((s) => s.grade === grade && s.name.toLowerCase() === clean.toLowerCase())
  const error = !clean ? 'Type the section’s name.' : taken ? `You already have Grade ${grade} – ${clean}.` : null

  const save = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (error) {
      nameRef.current?.focus()
      return
    }
    addSection(grade, clean)
    onClose()
  }

  return (
    <Popup title="New section" icon={<Plus size={34} strokeWidth={2.6} />} onClose={onClose} initialFocus={nameRef}>
      <p className={styles.text}>It becomes a tab on top of your planner.</p>
      <form className={styles.form} onSubmit={save} noValidate>
        <fieldset className={styles.field}>
          <legend className={styles.label}>Grade</legend>
          <div className={styles.grades} role="radiogroup" aria-label="Grade">
            {SECTION_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={g === grade}
                className={g === grade ? `${styles.grade} ${styles.gradeOn}` : styles.grade}
                onClick={() => setGrade(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nameId}>
            Section name
          </label>
          <input
            ref={nameRef}
            id={nameId}
            className={styles.input}
            value={name}
            maxLength={30}
            placeholder="Sampaguita"
            autoComplete="off"
            aria-invalid={tried && !!error}
            aria-describedby={tried && error ? errorId : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {tried && error && (
            <p id={errorId} className={styles.error}>
              {error}
            </p>
          )}
        </div>
        <div className={styles.row}>
          <button type="button" className={styles.stay} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.save}>
            Save section
          </button>
        </div>
      </form>
    </Popup>
  )
}

/** Add student: name and School ID. KIDDEX makes their one-time login code. */
export function AddStudentDialog({ onClose }: { onClose: () => void }) {
  const addStudent = useAddStudent()
  const students = useStudents()
  const { label } = useSection()
  const [name, setName] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [tried, setTried] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const idId = useId()
  const errorId = useId()
  const cleanId = schoolId.trim()
  const error = !name.trim()
    ? 'Type the student’s name.'
    : !cleanId
      ? 'Type their School ID.'
      : students.some((s) => s.schoolId === cleanId)
        ? `School ID ${cleanId} is already in your class.`
        : null

  const save = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (error) return
    addStudent(name, cleanId)
    // Ready for the next one.
    setAdded(name.trim())
    setName('')
    setSchoolId('')
    setTried(false)
    nameRef.current?.focus()
  }

  return (
    <Popup title="Add a student" icon={<UserPlus size={32} strokeWidth={2.4} />} onClose={onClose} initialFocus={nameRef}>
      <p className={styles.text}>To {label}. KIDDEX makes a one-time login code for them.</p>
      <form className={styles.form} onSubmit={save} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nameId}>
            Name
          </label>
          <input
            ref={nameRef}
            id={nameId}
            className={styles.input}
            value={name}
            maxLength={40}
            placeholder="Ana Reyes"
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={idId}>
            School ID
          </label>
          <input
            id={idId}
            className={styles.input}
            value={schoolId}
            maxLength={20}
            placeholder="2026-0144"
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => setSchoolId(e.target.value)}
          />
        </div>
        <p className={tried && error ? styles.error : styles.added} id={errorId} role="status">
          {tried && error ? error : added ? `${added} was added. Add another, or close.` : ''}
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.stay} onClick={onClose}>
            {added ? 'Done' : 'Cancel'}
          </button>
          <button type="submit" className={styles.save}>
            Add student
          </button>
        </div>
      </form>
    </Popup>
  )
}
