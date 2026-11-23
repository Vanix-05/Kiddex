import { BookOpen, Clock, KeyRound, LogOut, Plus, Power, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
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
import { CountCards, type StatsState } from './CountCards'
import { lastLoginText } from './lastLogin'
import { nameInitial } from './nameInitial'
import { filterCounts, filterTeachers, type TeacherFilter } from './teacherFilter'
import { updatedText } from './updatedText'
import styles from './admin.module.css'

type Popup =
  | { kind: 'add' }
  | { kind: 'password'; name: string; email: string; password: string }
  | { kind: 'reset'; teacher: AdminTeacher }
  | { kind: 'off'; teacher: AdminTeacher }
  | { kind: 'logOut' }

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; teachers: AdminTeacher[] }

/** Coming back to the tab (or the window) refreshes the page, at most this often. */
const AUTO_REFRESH_MS = 30_000
/** How often "Updated 5 min ago" is worked out again. */
const CLOCK_MS = 30_000

/**
 * The Admin page (/admin): a maroon top bar, 4 count cards (totals only), then
 * every Teacher account with search and an All / Active / Off filter: a table
 * on laptops, cards on phones. + Add Teacher, Reset password and Turn off /
 * Turn on. It refreshes quietly when the admin comes back to the tab. It
 * manages Teacher accounts only. Without an admin token it goes to Admin Login.
 */
export function AdminTeachersPage() {
  const [hasToken] = useState(() => Boolean(getAdminToken()))
  if (!hasToken) return <Navigate to={paths.admin.login} replace />
  return <TeachersScreen />
}

function TeachersScreen() {
  const navigate = useNavigate()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [stats, setStats] = useState<StatsState>({ status: 'loading' })
  const [popup, setPopup] = useState<Popup | null>(null)
  /** The Teacher whose Turn on is running (no confirm for Turn on). */
  const [turningOn, setTurningOn] = useState<string | null>(null)
  const [pageError, setPageError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TeacherFilter>('all')
  // "Updated just now": when the list last came from the server (or was changed here).
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  // The button that opened the current popup: it gets focus back when the popup closes.
  const opener = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  /** Goes up with every change made here, so an older refresh answer never undoes it. */
  const changes = useRef(0)
  /** When the last load or refresh started (for the 30 seconds rule). */
  const lastTry = useRef(0)
  const refreshRunning = useRef(false)
  const popupOpen = useRef(false)

  useEffect(() => {
    popupOpen.current = popup !== null
  }, [popup])

  // The backend ended the admin login: back to Admin Login with a quiet notice.
  useEffect(() => {
    setAdminLoginEndedHandler(() =>
      navigate(paths.admin.login, { replace: true, state: { notice: LOGIN_ENDED_NOTICE } }),
    )
    return () => setAdminLoginEndedHandler(null)
  }, [navigate])

  /** "Updated just now" (after a load, a refresh, or a change made here). */
  const stampUpdated = useCallback(() => {
    const t = Date.now()
    setLastUpdated(t)
    setNow(t)
    setRefreshFailed(false)
  }, [])

  /** The first load (and Try again after an error): shows the loading cards. */
  const load = useCallback(async () => {
    lastTry.current = Date.now()
    setList({ status: 'loading' })
    try {
      setList({ status: 'ready', teachers: await adminApi.teachers() })
      stampUpdated()
    } catch (err) {
      setList({ status: 'error', message: errorMessage(err) })
    }
  }, [stampUpdated])

  /** The totals: separate from the list, so a failure here never blocks the Teachers. */
  const loadStats = useCallback(async () => {
    setStats({ status: 'loading' })
    try {
      setStats({ status: 'ready', stats: await adminApi.stats() })
    } catch {
      setStats({ status: 'error' })
    }
  }, [])

  /**
   * A quiet refresh of the list and the totals: what's on screen stays until the
   * new answers arrive. If it fails, the old data stays and the line says so.
   */
  const refresh = useCallback(async () => {
    if (refreshRunning.current) return
    refreshRunning.current = true
    lastTry.current = Date.now()
    setRefreshing(true)
    const changesBefore = changes.current
    const [teachers, totals] = await Promise.allSettled([adminApi.teachers(), adminApi.stats()])
    refreshRunning.current = false
    setRefreshing(false)
    // Something was changed here meanwhile: that is newer than these answers.
    if (changes.current !== changesBefore) return
    if (teachers.status === 'fulfilled') setList({ status: 'ready', teachers: teachers.value })
    if (totals.status === 'fulfilled') setStats({ status: 'ready', stats: totals.value })
    if (teachers.status === 'fulfilled' && totals.status === 'fulfilled') stampUpdated()
    else setRefreshFailed(true)
  }, [stampUpdated])

  useEffect(() => {
    // Runs the first load of both; they only set state after the answers come back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    void loadStats()
  }, [load, loadStats])

  // Back to the tab or the window: refresh quietly (at most every 30 seconds, never under a popup).
  useEffect(() => {
    const comeBack = () => {
      if (document.visibilityState !== 'visible' || popupOpen.current) return
      if (Date.now() - lastTry.current < AUTO_REFRESH_MS) return
      void refresh()
    }
    document.addEventListener('visibilitychange', comeBack)
    window.addEventListener('focus', comeBack)
    return () => {
      document.removeEventListener('visibilitychange', comeBack)
      window.removeEventListener('focus', comeBack)
    }
  }, [refresh])

  // "Updated 5 min ago" moves on by itself.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => window.clearInterval(timer)
  }, [])

  /** Keeps the Teachers numbers right after Add Teacher or Turn off / on. */
  const adjustTeacherStats = (teachers: number, activeTeachers: number) =>
    setStats((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            stats: {
              ...current.stats,
              teachers: Math.max(0, current.stats.teachers + teachers),
              activeTeachers: Math.max(0, current.stats.activeTeachers + activeTeachers),
            },
          }
        : current,
    )

  const open = (next: Popup, event?: MouseEvent<HTMLElement>) => {
    if (event) opener.current = event.currentTarget
    setPageError('')
    setPopup(next)
  }

  const close = () => {
    setPopup(null)
    // After React has removed the popup. If the button is gone (its row left
    // the Active / Off filter), the Teachers title gets focus instead.
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus()
      else titleRef.current?.focus()
    })
  }

  /** Puts a changed or new Teacher into the list (new ones at the top). */
  const putTeacher = (teacher: AdminTeacher) => {
    changes.current += 1
    stampUpdated()
    setList((current) => {
      if (current.status !== 'ready') return current
      const exists = current.teachers.some((t) => t.id === teacher.id)
      return {
        status: 'ready',
        teachers: exists ? current.teachers.map((t) => (t.id === teacher.id ? teacher : t)) : [teacher, ...current.teachers],
      }
    })
  }

  const turnOn = async (teacher: AdminTeacher) => {
    setPageError('')
    setTurningOn(teacher.id)
    try {
      const turnedOn = (await adminApi.setActive(teacher.id, true)).teacher
      putTeacher(turnedOn)
      if (!teacher.active && turnedOn.active) adjustTeacherStats(0, 1)
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

  const clearSearch = () => {
    setSearch('')
    setFilter('all')
    searchRef.current?.focus()
  }

  const teachers = list.status === 'ready' ? list.teachers : []
  const count = list.status === 'ready' ? teachers.length : null
  const shown = filterTeachers(teachers, search, filter)
  const query = search.trim()
  const narrowed = query !== '' || filter !== 'all'
  const actions = (teacher: AdminTeacher) => ({
    busy: turningOn === teacher.id,
    onReset: (e: MouseEvent<HTMLButtonElement>) => open({ kind: 'reset', teacher }, e),
    onTurnOff: (e: MouseEvent<HTMLButtonElement>) => open({ kind: 'off', teacher }, e),
    onTurnOn: () => void turnOn(teacher),
  })

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.brand}>
            <KiddexLogo size="sm" onDark className={styles.topLogo} />
            <span className={styles.brandWord}>Admin</span>
          </div>
          <button type="button" className={styles.logOutButton} onClick={(e) => open({ kind: 'logOut' }, e)}>
            <LogOut size={20} aria-hidden="true" /> Log out
          </button>
        </div>
      </header>

      <main className={styles.column}>
        <CountCards state={stats} onRetry={() => void loadStats()} />

        <div className={styles.titleRow}>
          <h1 ref={titleRef} className={styles.pageTitle} tabIndex={-1}>
            Teachers{count !== null && <span className={styles.count}> · {count}</span>}
          </h1>
          <Button className={`${styles.bigButton} ${styles.addButton}`} onClick={(e) => open({ kind: 'add' }, e)}>
            <span className={styles.buttonInner}>
              <Plus size={24} strokeWidth={2.6} aria-hidden="true" /> Add Teacher
            </span>
          </Button>
        </div>

        {list.status === 'ready' && teachers.length > 0 && (
          <Toolbar
            search={search}
            onSearch={setSearch}
            searchRef={searchRef}
            filter={filter}
            onFilter={setFilter}
            counts={filterCounts(teachers)}
            updated={lastUpdated === null ? '' : updatedText(lastUpdated, now)}
            refreshing={refreshing}
            failed={refreshFailed}
            onRefresh={() => void refresh()}
          />
        )}

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

        {list.status === 'ready' && teachers.length === 0 && (
          <p className={styles.listMessage}>No Teachers yet. Tap + Add Teacher to make the first account.</p>
        )}

        {/* How many show, for screen readers (only while searching or filtering). */}
        <p className="visually-hidden" role="status">
          {list.status === 'ready' && narrowed ? `${shown.length} of ${teachers.length} Teachers shown.` : ''}
        </p>

        {list.status === 'ready' && teachers.length > 0 && shown.length === 0 && (
          <div className={styles.listMessage}>
            <p>
              {query
                ? `No Teachers match "${query}".`
                : filter === 'off'
                  ? 'No Teachers are turned off.'
                  : 'No Teachers are active.'}
            </p>
            <button type="button" className={styles.secondaryButton} onClick={clearSearch}>
              {query ? 'Clear search' : 'Show all'}
            </button>
          </div>
        )}

        {shown.length > 0 && (
          <>
            {/* Laptops (860px and wider): a table. */}
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Teacher</th>
                    <th scope="col">Last login</th>
                    <th scope="col">Lessons</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((teacher) => (
                    <TeacherRow key={teacher.id} teacher={teacher} {...actions(teacher)} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Phones and narrow screens: cards. */}
            <ul className={`${styles.cards} ${styles.cardList}`}>
              {shown.map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} {...actions(teacher)} />
              ))}
            </ul>
          </>
        )}
      </main>

      {popup?.kind === 'add' && (
        <AddTeacherDialog
          onCancel={close}
          onMade={({ teacher, temporaryPassword }) => {
            putTeacher(teacher)
            adjustTeacherStats(1, teacher.active ? 1 : 0)
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
            const turnedOff = (await adminApi.setActive(popup.teacher.id, false)).teacher
            putTeacher(turnedOff)
            if (popup.teacher.active && !turnedOff.active) adjustTeacherStats(0, -1)
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

// ---------- Search, filter, "Updated" ----------

const FILTERS: { value: TeacherFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'off', label: 'Off' },
]

function Toolbar({
  search,
  onSearch,
  searchRef,
  filter,
  onFilter,
  counts,
  updated,
  refreshing,
  failed,
  onRefresh,
}: {
  search: string
  onSearch: (value: string) => void
  searchRef: RefObject<HTMLInputElement | null>
  filter: TeacherFilter
  onFilter: (value: TeacherFilter) => void
  counts: Record<TeacherFilter, number>
  updated: string
  refreshing: boolean
  failed: boolean
  onRefresh: () => void
}) {
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  /** Arrow keys move between All / Active / Off (one Tab stop for the group). */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const at = FILTERS.findIndex((f) => f.value === filter)
    const next = (at + step + FILTERS.length) % FILTERS.length
    onFilter(FILTERS[next]!.value)
    radios.current[next]?.focus()
  }

  return (
    <div className={styles.toolbar}>
      <label className={styles.searchBox}>
        <Search size={20} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          className={styles.searchInput}
          placeholder="Search name or email"
          aria-label="Search Teachers"
          autoComplete="off"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </label>
      <div className={styles.segmented} role="radiogroup" aria-label="Show Teachers" onKeyDown={onKeyDown}>
        {FILTERS.map(({ value, label }, i) => (
          <button
            key={value}
            ref={(el) => {
              radios.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={filter === value}
            tabIndex={filter === value ? 0 : -1}
            className={filter === value ? `${styles.segment} ${styles.segmentOn}` : styles.segment}
            onClick={() => onFilter(value)}
          >
            {label} {counts[value]}
          </button>
        ))}
      </div>
      <div className={styles.updated}>
        {/* The refresh failed: the old list stays, and the button says Try again. */}
        {failed ? <span role="status">Couldn’t update ·</span> : <span>{updated}</span>}
        <button
          type="button"
          className={failed ? `${styles.refreshButton} ${styles.refreshWide}` : styles.refreshButton}
          aria-label={failed ? undefined : 'Refresh'}
          title="Refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={18} strokeWidth={2.4} className={refreshing ? styles.spinning : undefined} aria-hidden="true" />
          {failed && 'Try again'}
        </button>
      </div>
    </div>
  )
}

// ---------- One Teacher (table row, laptops) ----------

function TeacherRow({
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
    <tr className={teacher.active ? undefined : styles.rowOff}>
      <th scope="row" className={styles.whoCell}>
        <span className={styles.who}>
          <span className={`${styles.letterCircle} ${styles.rowCircle}`} aria-hidden="true">
            {nameInitial(teacher.name)}
          </span>
          <span className={styles.whoText}>
            <span className={styles.rowName}>{teacher.name}</span>
            <span className={styles.rowEmail}>{teacher.email}</span>
          </span>
        </span>
      </th>
      <td className={styles.fadeCell}>{lastLoginText(teacher.lastLoginAt)}</td>
      <td className={styles.fadeCell}>{teacher.lessonCount}</td>
      <td className={styles.fadeCell}>
        <span className={teacher.active ? styles.badgeOn : styles.badgeOff}>{teacher.active ? 'Active' : 'Off'}</span>
      </td>
      <td className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <button type="button" className={`${styles.secondaryButton} ${styles.rowButton}`} onClick={onReset}>
            <KeyRound size={16} aria-hidden="true" /> Reset password
          </button>
          {teacher.active ? (
            <button type="button" className={`${styles.secondaryButton} ${styles.rowButton} ${styles.dangerButton}`} onClick={onTurnOff}>
              <Power size={16} aria-hidden="true" /> Turn off
            </button>
          ) : (
            <button type="button" className={`${styles.secondaryButton} ${styles.rowButton}`} onClick={onTurnOn} disabled={busy}>
              <Power size={16} aria-hidden="true" /> {busy ? 'Turning on…' : 'Turn on'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ---------- One Teacher (card, phones) ----------


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
        <div className={styles.cardTop}>
          <span className={styles.letterCircle} aria-hidden="true">
            {nameInitial(teacher.name)}
          </span>
          <div className={styles.cardWho}>
            <div className={styles.cardHead}>
              <h2 className={styles.teacherName}>{teacher.name}</h2>
              <span className={teacher.active ? styles.badgeOn : styles.badgeOff}>{teacher.active ? 'Active' : 'Off'}</span>
            </div>
            <p className={styles.teacherEmail}>{teacher.email}</p>
          </div>
        </div>
        <p className={styles.teacherFacts}>
          <span className={styles.fact}>
            <Clock size={16} aria-hidden="true" /> Last login: {lastLoginText(teacher.lastLoginAt)}
          </span>
          <span className={styles.fact}>
            <BookOpen size={16} aria-hidden="true" /> Lessons: {teacher.lessonCount}
          </span>
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
