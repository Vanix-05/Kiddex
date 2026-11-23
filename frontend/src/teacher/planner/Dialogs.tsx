import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { Check, Eye, EyeOff, KeyRound, LogOut, Plus } from 'lucide-react'
import { authApi } from '../api/authApi'
import { ApiError, errorMessage } from '../api/client'
import { setToken } from '../../session/authToken'
import { SECTION_GRADES, useSection } from '../data/useTeacherData'
import { useSetPasswordFlags } from '../data/usePasswordFlags'
import { passwordFormProblem, serverProblemField, type PasswordField, type PasswordProblem } from './passwordForm'
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
  split = false,
  intro,
  onClose,
  initialFocus,
  children,
}: {
  title: string
  icon: ReactNode
  tone?: 'orange' | 'maroon'
  /** 600px instead of 440px (Add students). */
  wide?: boolean
  /**
   * Short screens (a phone held sideways): two columns, the ring, title and
   * intro on the left and the rest on the right, so nothing scrolls.
   */
  split?: boolean
  /** A short line under the title (on the left in a split card). */
  intro?: ReactNode
  onClose: () => void
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const titleId = useId()
  const cardRef = useRef<HTMLDivElement>(null)

  // What had focus when the popup opened gets it back when it closes (once, even
  // if the popup changes inside, like Change password -> Password changed).
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    ;(initialFocus?.current ?? cardRef.current)?.focus({ preventScroll: true })
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
      <div
        ref={cardRef}
        className={[styles.card, wide && styles.cardWide, split && styles.cardSplit].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <span className={tone === 'maroon' ? `${styles.ring} ${styles.ringMaroon}` : styles.ring} aria-hidden="true">
            {icon}
          </span>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {intro && <p className={styles.text}>{intro}</p>}
        </div>
        <div className={styles.body}>{children}</div>
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

// ---------- Change password ----------

/** One password box: its label, the box (the first one has the eye button), and its error or hint. */
function PasswordBox({
  inputRef,
  label,
  value,
  onChange,
  show,
  autoComplete,
  error,
  hint,
  eye,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  autoComplete: 'current-password' | 'new-password'
  error: string | null
  hint?: string
  /** The show / hide button inside this box (first box only). */
  eye?: ReactNode
}) {
  const id = useId()
  const underId = useId()
  const under = error ?? hint
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.passBox}>
        <input
          ref={inputRef}
          id={id}
          className={eye ? `${styles.input} ${styles.inputWithEye}` : styles.input}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={200}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={under ? underId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {eye}
      </div>
      {under && (
        <p id={underId} className={error ? styles.error : styles.hint}>
          {under}
        </p>
      )}
    </div>
  )
}

/**
 * Change password: current, new, new again. On success this tab gets the new
 * token (other computers are logged out) and the popup says "Password changed".
 */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const setFlags = useSetPasswordFlags()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [problem, setProblem] = useState<PasswordProblem | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const currentRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)
  const againRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  const showProblem = (p: PasswordProblem) => {
    setProblem(p)
    const box = { current: currentRef, new: newRef, again: againRef, form: null }[p.field]
    box?.current?.focus()
  }

  const errorFor = (field: PasswordField) => (problem?.field === field ? problem.message : null)
  /** Typing clears the shown problem. */
  const typed = (set: (value: string) => void) => (value: string) => {
    set(value)
    setProblem(null)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const before = passwordFormProblem(current, next, again)
    if (before) {
      showProblem(before)
      return
    }
    setProblem(null)
    setSaving(true)
    try {
      const { token } = await authApi.changePassword(current, next)
      setToken(token)
      setFlags({ temporary: false, noteHidden: true })
      setDone(true)
    } catch (err) {
      setSaving(false)
      // The login ended: the app already opens Teacher Login.
      if (err instanceof ApiError && err.code === 'LOGIN_NEEDED') return
      showProblem({ field: serverProblemField(err instanceof ApiError ? err.code : ''), message: errorMessage(err) })
    }
  }

  if (done) {
    return (
      <Popup
        title="Password changed"
        icon={<Check size={34} strokeWidth={3} />}
        intro="Use your new password next time you log in. Other computers logged in as you were logged out."
        onClose={onClose}
        initialFocus={doneRef}
      >
        <div className={styles.row}>
          <button ref={doneRef} type="button" className={styles.save} onClick={onClose}>
            Done
          </button>
        </div>
      </Popup>
    )
  }

  return (
    <Popup
      title="Change password"
      icon={<KeyRound size={34} strokeWidth={2.4} />}
      intro="Use one only you know."
      split
      // While saving it stays open, so the answer is never lost.
      onClose={saving ? () => {} : onClose}
      initialFocus={currentRef}
    >
      <form className={styles.form} onSubmit={save} noValidate>
        <PasswordBox
          inputRef={currentRef}
          label="Current password"
          value={current}
          onChange={typed(setCurrent)}
          show={show}
          autoComplete="current-password"
          error={errorFor('current')}
          eye={
            <button
              type="button"
              className={styles.eye}
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
            </button>
          }
        />
        <PasswordBox
          inputRef={newRef}
          label="New password"
          value={next}
          onChange={typed(setNext)}
          show={show}
          autoComplete="new-password"
          error={errorFor('new')}
          hint="At least 8 characters."
        />
        <PasswordBox
          inputRef={againRef}
          label="Type it again"
          value={again}
          onChange={typed(setAgain)}
          show={show}
          autoComplete="new-password"
          error={errorFor('again')}
        />
        {problem?.field === 'form' && (
          <p className={`${styles.error} ${styles.formError}`} role="alert">
            {problem.message}
          </p>
        )}
        <div className={styles.row}>
          <button type="button" className={styles.stay} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.save} disabled={saving}>
            <KeyRound size={20} strokeWidth={2.4} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
    </Popup>
  )
}
