import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { LogOut, Plus } from 'lucide-react'
import { errorMessage } from '../api/client'
import { SECTION_GRADES, useSection } from '../data/useTeacherData'
import styles from './dialogs.module.css'

/**
 * A small popup over the blurred dashboard. Esc or a click on the blur closes
 * it; focus goes to `initialFocus` (or the card) and back where it was after.
 */
export function Popup({
  title,
  icon,
  tone = 'orange',
  wide = false,
  onClose,
  initialFocus,
  children,
}: {
  title: string
  icon: ReactNode
  tone?: 'orange' | 'maroon'
  /** 600px instead of 440px (Add students). */
  wide?: boolean
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
      <div ref={cardRef} className={wide ? `${styles.card} ${styles.cardWide}` : styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
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

/** New section: Grade 3 to 6 and the section's name. Saving adds its tab and opens it (saved on the server). */
export function NewSectionDialog({ onClose }: { onClose: () => void }) {
  const { addSection, sections } = useSection()
  const [grade, setGrade] = useState(4)
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const errorId = useId()
  const clean = name.trim()
  const taken = sections.some((s) => s.grade === grade && s.name.toLowerCase() === clean.toLowerCase())
  const error = !clean
    ? 'Type the section’s name.'
    : taken
      ? `You already have Grade ${grade} – ${clean}.`
      : serverError

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setTried(true)
    if (error) {
      nameRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await addSection(grade, clean)
      onClose()
    } catch (err) {
      setServerError(errorMessage(err))
      setSaving(false)
      nameRef.current?.focus()
    }
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
                onClick={() => {
                  setGrade(g)
                  setServerError(null)
                }}
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
            onChange={(e) => {
              setName(e.target.value)
              setServerError(null)
            }}
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
          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      </form>
    </Popup>
  )
}
