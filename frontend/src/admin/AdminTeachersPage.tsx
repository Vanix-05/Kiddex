import { KeyRound, LogOut, Plus, Power } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button/Button'
import { KiddexLogo } from '../components/KiddexLogo/KiddexLogo'
import { TextInput } from '../components/TextInput/TextInput'
import { paths } from '../routes/paths'
import { LOGIN_ENDED_NOTICE } from '../session/session'
import { ApiError, errorMessage } from '../teacher/api/client'
import { adminApi, setAdminLoginEndedHandler, type AdminTeacher } from './adminApi'
import { AdminDialog } from './AdminDialog'
import { clearAdminToken, getAdminToken } from './adminToken'
import { lastLoginText } from './lastLogin'
import styles from './admin.module.css'

type Popup =
  | { kind: 'add' }
  | { kind: 'password'; name: string; email: string; password: string }
  | { kind: 'reset'; teacher: AdminTeacher }
  | { kind: 'off'; teacher: AdminTeacher }
  | { kind: 'logOut' }

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; teachers: AdminTeacher[] }

/**
 * The Admin page (/admin): every Teacher account as a card, + Add Teacher,
 * Reset password and Turn off / Turn on. Teacher accounts only. Without an
 * admin token it goes to Admin Login.
 */
export function AdminTeachersPage() {
  const [hasToken] = useState(() => Boolean(getAdminToken()))
  if (!hasToken) return <Navigate to={paths.admin.login} replace />
  return <TeachersScreen />
}

function TeachersScreen() {
  const navigate = useNavigate()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [popup, setPopup] = useState<Popup | null>(null)
  /** The Teacher whose Turn on is running (no confirm for Turn on). */
  const [turningOn, setTurningOn] = useState<string | null>(null)
  const [pageError, setPageError] = useState('')
  // The button that opened the current popup: it gets focus back when the popup closes.
  const opener = useRef<HTMLElement | null>(null)

  // The backend ended the admin login: back to Admin Login with a quiet notice.
  useEffect(() => {
    setAdminLoginEndedHandler(() =>
      navigate(paths.admin.login, { replace: true, state: { notice: LOGIN_ENDED_NOTICE } }),
    )
    return () => setAdminLoginEndedHandler(null)
  }, [navigate])

  const load = useCallback(async () => {
    setList({ status: 'loading' })
    try {
      setList({ status: 'ready', teachers: await adminApi.teachers() })
    } catch (err) {
      setList({ status: 'error', message: errorMessage(err) })
    }
  }, [])

  useEffect(() => {
    // Runs the first load; load() only sets state after the answer comes back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const open = (next: Popup, event?: MouseEvent<HTMLElement>) => {
    if (event) opener.current = event.currentTarget
    setPageError('')
    setPopup(next)
  }

  const close = () => {
    setPopup(null)
    // After React has removed the popup.
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus()
    })
  }

  /** Puts a changed or new Teacher into the list (new ones at the top). */
  const putTeacher = (teacher: AdminTeacher) =>
    setList((current) => {
      if (current.status !== 'ready') return current
      const exists = current.teachers.some((t) => t.id === teacher.id)
      return {
        status: 'ready',
        teachers: exists ? current.teachers.map((t) => (t.id === teacher.id ? teacher : t)) : [teacher, ...current.teachers],
      }
    })

  const turnOn = async (teacher: AdminTeacher) => {
    setPageError('')
    setTurningOn(teacher.id)
    try {
      putTeacher((await adminApi.setActive(teacher.id, true)).teacher)
    } catch (err) {
      setPageError(`Could not turn on ${teacher.name}. ${errorMessage(err)}`)
    } finally {
      setTurningOn(null)
    }
  }

  const logOut = () => {
    clearAdminToken()
    navigate(paths.admin.login, { replace: true })
  }

  const count = list.status === 'ready' ? list.teachers.length : null

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <KiddexLogo size="sm" className={styles.topLogo} />
          <span className={styles.brandWord}>Admin</span>
        </div>
        <button type="button" className={styles.ghostButton} onClick={(e) => open({ kind: 'logOut' }, e)}>
          <LogOut size={20} aria-hidden="true" /> Log out
        </button>
      </header>

      <main className={styles.column}>
        <h1 className={styles.pageTitle}>
          Teachers{count !== null && <span className={styles.count}> · {count}</span>}
        </h1>
        <Button fullWidth className={styles.bigButton} onClick={(e) => open({ kind: 'add' }, e)}>
          <span className={styles.buttonInner}>
            <Plus size={24} strokeWidth={2.6} aria-hidden="true" /> Add Teacher
          </span>
        </Button>

        {pageError && (
          <p className={styles.pageError} role="alert">
            {pageError}
          </p>
        )}

        {list.status === 'loading' && (
          <ul className={styles.cards} aria-label="Loading Teachers" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true">
                <span className={styles.skeletonLine} style={{ width: '55%' }} />
                <span className={styles.skeletonLine} style={{ width: '80%' }} />
                <span className={styles.skeletonLine} style={{ width: '40%' }} />
                <span className={styles.skeletonButtons} />
              </li>
            ))}
          </ul>
        )}

        {list.status === 'error' && (
          <div className={styles.listMessage} role="alert">
            <p>{list.message}</p>
            <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {list.status === 'ready' && list.teachers.length === 0 && (
          <p className={styles.listMessage}>No Teachers yet. Tap + Add Teacher to make the first account.</p>
        )}

        {list.status === 'ready' && list.teachers.length > 0 && (
          <ul className={styles.cards}>
            {list.teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                busy={turningOn === teacher.id}
                onReset={(e) => open({ kind: 'reset', teacher }, e)}
                onTurnOff={(e) => open({ kind: 'off', teacher }, e)}
                onTurnOn={() => void turnOn(teacher)}
              />
            ))}
          </ul>
        )}
      </main>

      {popup?.kind === 'add' && (
        <AddTeacherDialog
          onCancel={close}
          onMade={({ teacher, temporaryPassword }) => {
            putTeacher(teacher)
            setPopup({ kind: 'password', name: teacher.name, email: teacher.email, password: temporaryPassword })
          }}
        />
      )}
      {popup?.kind === 'password' && (
        <PasswordDialog name={popup.name} email={popup.email} password={popup.password} onDone={close} />
      )}
      {popup?.kind === 'reset' && (
        <ConfirmDialog
          title="Reset password?"
          text={`Reset the password for ${popup.teacher.name}? Their current password will stop working.`}
          confirmLabel="Reset"
          busyLabel="Resetting…"
          onCancel={close}
          onConfirm={async () => {
            const { teacher, temporaryPassword } = await adminApi.resetPassword(popup.teacher.id)
            putTeacher(teacher)
            setPopup({ kind: 'password', name: teacher.name, email: teacher.email, password: temporaryPassword })
          }}
        />
      )}
      {popup?.kind === 'off' && (
        <ConfirmDialog
          title="Turn off?"
          text={`Turn off ${popup.teacher.name}? They can't log in until you turn the account back on. Their lessons are kept.`}
          confirmLabel="Turn off"
          busyLabel="Turning off…"
          danger
          onCancel={close}
          onConfirm={async () => {
            putTeacher((await adminApi.setActive(popup.teacher.id, false)).teacher)
            close()
          }}
        />
      )}
      {popup?.kind === 'logOut' && (
        <ConfirmDialog title="Log out?" confirmLabel="Log out" cancelLabel="Stay" onCancel={close} onConfirm={async () => logOut()} />
      )}
    </div>
  )
}

// ---------- One Teacher ----------

function TeacherCard({
  teacher,
  busy,
  onReset,
  onTurnOff,
  onTurnOn,
}: {
  teacher: AdminTeacher
  busy: boolean
  onReset: (event: MouseEvent<HTMLButtonElement>) => void
  onTurnOff: (event: MouseEvent<HTMLButtonElement>) => void
  onTurnOn: () => void
}) {
  return (
    <li className={`${styles.card} ${teacher.active ? '' : styles.cardOff}`}>
      <div className={styles.cardInfo}>
        <div className={styles.cardHead}>
          <h2 className={styles.teacherName}>{teacher.name}</h2>
          <span className={teacher.active ? styles.badgeOn : styles.badgeOff}>{teacher.active ? 'Active' : 'Off'}</span>
        </div>
        <p className={styles.teacherEmail}>{teacher.email}</p>
        <p className={styles.teacherFacts}>
          <span>Last login: {lastLoginText(teacher.lastLoginAt)}</span>
          <span>Lessons: {teacher.lessonCount}</span>
        </p>
      </div>
      <div className={styles.cardActions}>
        <button type="button" className={styles.secondaryButton} onClick={onReset}>
          <KeyRound size={18} aria-hidden="true" /> Reset password
        </button>
        {teacher.active ? (
          <button type="button" className={`${styles.secondaryButton} ${styles.dangerButton}`} onClick={onTurnOff}>
            <Power size={18} aria-hidden="true" /> Turn off
          </button>
        ) : (
          <button type="button" className={styles.secondaryButton} onClick={onTurnOn} disabled={busy}>
            <Power size={18} aria-hidden="true" /> {busy ? 'Turning on…' : 'Turn on'}
          </button>
        )}
      </div>
    </li>
  )
}

// ---------- Popups ----------

/** "Reset password?", "Turn off?", "Log out?": a short question with two buttons. */
function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string
  text?: string
  confirmLabel: string
  busyLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      // A login that ended already moved the page to Admin Login.
      if (err instanceof ApiError && err.code === 'LOGIN_NEEDED') return
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AdminDialog title={title} onClose={busy ? undefined : onCancel} initialFocus={cancelRef}>
      {text && <p className={styles.dialogText}>{text}</p>}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogButtons}>
        <button ref={cancelRef} type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? styles.dangerSolidButton : styles.primaryButton}
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy && busyLabel ? busyLabel : confirmLabel}
        </button>
      </div>
    </AdminDialog>
  )
}

const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/** Add Teacher: name + email. On success the page shows the temporary password. */
function AddTeacherDialog({
  onCancel,
  onMade,
}: {
  onCancel: () => void
  onMade: (made: { teacher: AdminTeacher; temporaryPassword: string }) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const nameProblem =
      cleanName.length < 2
        ? 'Please type the Teacher’s name (at least 2 letters).'
        : cleanName.length > 60
          ? 'The name can be at most 60 characters.'
          : ''
    const emailProblem = !cleanEmail
      ? 'Please type the Teacher’s email.'
      : !looksLikeEmail(cleanEmail)
        ? 'This email does not look right. Use one like name@school.ph.'
        : ''
    setNameError(nameProblem)
    setEmailError(emailProblem)
    setFormError('')
    if (nameProblem || emailProblem) return

    setBusy(true)
    try {
      onMade(await adminApi.addTeacher(cleanName, cleanEmail))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LOGIN_NEEDED') return
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setEmailError(err.message)
      else setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AdminDialog title="Add Teacher" onClose={busy ? undefined : onCancel}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <TextInput
            label="Name, like Ms. Santos"
            icon="user"
            name="name"
            autoComplete="off"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'add-name-error' : undefined}
          />
          {nameError && (
            <p id="add-name-error" className={styles.fieldError}>
              {nameError}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <TextInput
            label="Email"
            icon="mail"
            type="email"
            name="email"
            autoComplete="off"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'add-email-error' : undefined}
          />
          {emailError && (
            <p id="add-email-error" className={styles.fieldError}>
              {emailError}
            </p>
          )}
        </div>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <div className={styles.dialogButtons}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>
            {busy ? 'Making…' : 'Make account'}
          </button>
        </div>
      </form>
    </AdminDialog>
  )
}

/**
 * The temporary password, shown once after Add Teacher or Reset password.
 * It does not close by Esc or a tap outside: only Done, so it can't be lost by accident.
 */
function PasswordDialog({ name, email, password, onDone }: { name: string; email: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const passwordRef = useRef<HTMLSpanElement>(null)
  const copyRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  /** If the clipboard is blocked, select the password so it can be copied by hand. */
  const selectPassword = () => {
    const node = passwordRef.current
    const selection = window.getSelection()
    if (!node || !selection) return
    const range = document.createRange()
    range.selectNodeContents(node)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      selectPassword()
    }
  }

  return (
    <AdminDialog title={`Password for ${name}`} initialFocus={copyRef}>
      <p className={styles.passwordEmail}>{email}</p>
      <div className={styles.passwordBox}>
        <span ref={passwordRef} className={styles.password} aria-label={`Temporary password: ${password.split('').join(' ')}`}>
          {password}
        </span>
      </div>
      <button ref={copyRef} type="button" className={styles.secondaryButton} onClick={() => void copy()}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <span className="visually-hidden" role="status">
        {copied ? 'Copied' : ''}
      </span>
      <p className={styles.dialogText}>Give this to the Teacher privately. It won’t be shown again.</p>
      <div className={styles.dialogButtons}>
        <button type="button" className={`${styles.primaryButton} ${styles.wide}`} onClick={onDone}>
          Done
        </button>
      </div>
    </AdminDialog>
  )
}
