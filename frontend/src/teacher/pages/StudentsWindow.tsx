import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, Flame, KeyRound, Lock, Plus, Printer, Search, UserMinus, Users, X } from 'lucide-react'
import { usePhoneSideways } from '../../hooks/usePhoneSideways'
import { errorMessage } from '../api/client'
import { masteryCell } from '../data/reports'
import { MAX_STUDENTS_PER_SECTION } from '../data/schoolIds'
import { useJustAdded, useSection, useStudentRemoval, useStudentsLoad, useTeacher } from '../data/useTeacherData'
import type { Student, StudentFilter } from '../data/types'
import { buddyHeads } from '../assets'
import { studentsPath } from '../planner/pages'
import { usePlannerActions } from '../planner/plannerActions'
import { Bar, Btn, Chip, Pills, Title } from '../planner/ui'
import { toLoginCards, usePrintCards } from '../print/printCards'
import { CodesReady } from './CodesReady'
import { PrintCardsView } from './PrintCardsView'
import { RemovedStudents } from './RemovedStudents'
import { RowMenu } from './RowMenu'
import { removedLinkText, TOAST_MS, toastText, type ToastKind } from './removeStudents'
import { StudentLevels } from './StudentLevels'
import styles from './StudentsWindow.module.css'

const PER_PAGE = 10
const FILTERS: StudentFilter[] = ['all', 'registered', 'notYet', 'help']
const isFilter = (f: string | null): f is StudentFilter => FILTERS.includes(f as StudentFilter)

/** Print login cards opened from the list or from "Login codes are ready!". */
type PrintFrom = 'list' | 'codes'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The dark pill at the bottom (Remove, Restore, Delete forever), for 8 seconds. */
export interface Toast {
  /** New for each toast (restarts the 8 seconds). */
  key: number
  text: string
  /** ✓ in front (not for a server message). */
  check: boolean
  /** Undo restores this Student (only after Remove). */
  undo?: Student
}

interface StudentsWindowProps {
  /** true while it folds and lifts away. */
  closing: boolean
  /** From the URL, e.g. "help" for "See who" on Home. */
  initialFilter: string | null
  /** From the URL: a Student's id to open their page (Home's To dos, Progress). */
  initialStudent: string | null
  onClose: () => void
  /** The closing motion finished. */
  onClosed: () => void
}

/**
 * My Students: a grid-paper class record that opens over the current page
 * (no page turn). It drops in folded in half, then the right half unfolds.
 * Closing folds it and lifts it away. ✕, Esc or a click on the blur closes it.
 */
export function StudentsWindow({ closing, initialFilter, initialStudent, onClose, onClosed }: StudentsWindowProps) {
  const titleId = useId()
  const navigate = useNavigate()
  const [reduced] = useState(reducedMotion)
  // unfolding = the opening motion (half folded), open = flat, then closing.
  const [unfolding, setUnfolding] = useState(!reduced)
  const [filter, setFilter] = useState<StudentFilter>(isFilter(initialFilter) ? initialFilter : 'all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  // Rows whose one-time code is showing (by Student id). Only while the window
  // is open: codes are hidden again when it opens next time.
  const [shownCodes, setShownCodes] = useState<ReadonlySet<string>>(() => new Set())
  // The Print login cards view, and where it was opened from (Back goes there).
  const [printFrom, setPrintFrom] = useState<PrintFrom | null>(null)
  // The Student's page (Open →, or ?student= in the URL), and the round picked on
  // it. Open → is only while the window is open: it opens on the list next time.
  const [openStudent, setOpenStudent] = useState<string | null>(initialStudent)
  const [pickedRound, setPickedRound] = useState<string | null>(null)
  // The Removed view (the "Removed (N)" link), and the toast after Remove / Restore / Delete forever.
  const [showRemoved, setShowRemoved] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const { restore } = useStudentRemoval()
  const toggleCode = (id: string) =>
    setShownCodes((before) => {
      const next = new Set(before)
      if (!next.delete(id)) next.add(id)
      return next
    })

  // A new filter from the URL (e.g. "See who" while it's open).
  const [seenFilter, setSeenFilter] = useState(initialFilter)
  if (seenFilter !== initialFilter) {
    setSeenFilter(initialFilter)
    setFilter(isFilter(initialFilter) ? initialFilter : 'all')
    setPage(0)
  }
  // A Student from the URL (e.g. "Open" on Home while it's open).
  const [seenStudent, setSeenStudent] = useState(initialStudent)
  if (seenStudent !== initialStudent) {
    setSeenStudent(initialStudent)
    if (initialStudent) {
      setOpenStudent(initialStudent)
      setPickedRound(null)
    }
  }

  // Focus moves into the window, and back where it was after closing.
  const sheetRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    sheetRef.current?.focus({ preventScroll: true })
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [])

  // The toast goes away after 8 seconds (a new one starts the 8 seconds again).
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  /** Focus (and on a phone, scroll to) something in the window once React has drawn it. */
  const focusLater = (selector: string) =>
    requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>(selector)?.focus())

  const say = (kind: ToastKind, s: Student, undo = false) => {
    setToast({ key: Date.now(), text: toastText(kind, s.schoolId), check: kind !== 'deleted', undo: undo ? s : undefined })
  }

  /** After Remove: "✓ 2026-0177 removed" with Undo (focus on Undo: the row is gone). */
  const onRemoved = (s: Student) => {
    say('removed', s, true)
    focusLater('[data-toast-undo]')
  }

  /** Undo, or Restore in the Removed view. A full section: the server's message, no Undo. */
  const onRestore = async (s: Student) => {
    try {
      await restore(s.id)
      say('restored', s)
      // Undo: focus is back on their row's ⋯ (when it is on this page).
      focusLater(`[data-more-id="${CSS.escape(s.id)}"]`)
    } catch (err) {
      setToast({ key: Date.now(), text: errorMessage(err), check: false })
    }
  }

  const onDeleted = (s: Student) => say('deleted', s)

  /** ← My Students from Removed: focus on the "Removed (N)" link (or the window). */
  const backFromRemoved = () => {
    setShowRemoved(false)
    requestAnimationFrame(() =>
      (sheetRef.current?.querySelector<HTMLElement>('[data-removed-link]') ?? sheetRef.current)?.focus({ preventScroll: true }),
    )
  }

  // Esc closes the round detail first, then the Removed view, then the window.
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pickedRound) setPickedRound(null)
      else if (showRemoved) backFromRemoved()
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  /** ← My Students: back to the list (same page and filter), focus on that row's Open. */
  const backFromStudent = () => {
    const id = openStudent
    setOpenStudent(null)
    setPickedRound(null)
    // Opened from the URL: the list's address again, so a refresh shows the list.
    if (initialStudent) navigate(studentsPath(filter === 'all' ? undefined : filter), { replace: true })
    if (id)
      requestAnimationFrame(() =>
        sheetRef.current?.querySelector<HTMLElement>(`[data-open-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }),
      )
  }

  const folded = !reduced && (unfolding || closing)
  const sheetClass = [
    styles.sheet,
    reduced ? (closing ? styles.fadeOut : styles.fadeIn) : closing ? styles.lift : styles.drop,
  ].join(' ')

  const content = (copy: boolean) => (
    <SheetContent
      titleId={copy ? undefined : titleId}
      filter={filter}
      onFilter={(f) => {
        setFilter(f)
        setPage(0)
      }}
      search={search}
      onSearch={(s) => {
        setSearch(s)
        setPage(0)
      }}
      page={page}
      onPage={setPage}
      shownCodes={shownCodes}
      onToggleCode={toggleCode}
      printFrom={printFrom}
      onPrintView={setPrintFrom}
      openStudent={openStudent}
      onOpenStudent={(s) => setOpenStudent(s.id)}
      onBackFromStudent={backFromStudent}
      pickedRound={pickedRound}
      onPickRound={setPickedRound}
      showRemoved={showRemoved}
      onShowRemoved={() => {
        setShowRemoved(true)
        requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>('[data-removed-title]')?.focus({ preventScroll: true }))
      }}
      onBackFromRemoved={backFromRemoved}
      toast={toast}
      onRemoved={onRemoved}
      onRestore={onRestore}
      onDeleted={onDeleted}
    />
  )

  return (
    <div className={styles.wrap}>
      <section
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && closing) onClosed()
        }}
      >
        <span className={`${styles.clip} ${styles.clipLeft}`} aria-hidden="true" />
        {!folded && <span className={`${styles.clip} ${styles.clipRight}`} aria-hidden="true" />}

        <div className={folded ? `${styles.paper} ${styles.halfOnly}` : styles.paper}>{content(false)}</div>

        {/* The right half, folding over the left half and back. */}
        {folded && (
          <div
            className={closing ? `${styles.flap} ${styles.fold}` : `${styles.flap} ${styles.unfold}`}
            aria-hidden="true"
            inert
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && !closing) setUnfolding(false)
            }}
          >
            <div className={styles.flapFront}>
              <div className={styles.flapCopy}>{content(true)}</div>
              <span className={styles.flapShade} />
            </div>
            <div className={styles.flapBack} />
          </div>
        )}
      </section>

      {!closing && (
        <button
          type="button"
          className={reduced ? styles.close : `${styles.close} ${styles.closePop}`}
          aria-label="Close My Students"
          onClick={onClose}
        >
          <X size={24} strokeWidth={3} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ---------- The class record ----------

interface SheetContentProps {
  titleId?: string
  filter: StudentFilter
  onFilter: (f: StudentFilter) => void
  search: string
  onSearch: (s: string) => void
  page: number
  onPage: (p: number) => void
  /** Rows whose one-time code is showing. */
  shownCodes: ReadonlySet<string>
  onToggleCode: (studentId: string) => void
  printFrom: PrintFrom | null
  /** Opens (or with null closes) the Print login cards view. */
  onPrintView: (from: PrintFrom | null) => void
  /** The Student's page (Open →) by id, or null for the list. */
  openStudent: string | null
  onOpenStudent: (s: Student) => void
  onBackFromStudent: () => void
  /** The round picked on the Student's page (its detail shows). */
  pickedRound: string | null
  onPickRound: (roundId: string | null) => void
  /** The Removed view (inside the window, like the Student's page). */
  showRemoved: boolean
  onShowRemoved: () => void
  onBackFromRemoved: () => void
  toast: Toast | null
  /** After a Remove that worked (the toast with Undo). */
  onRemoved: (s: Student) => void
  /** Undo, or Restore in the Removed view. */
  onRestore: (s: Student) => void
  /** After a Delete forever that worked. */
  onDeleted: (s: Student) => void
}

const matches = (s: Student, f: StudentFilter) =>
  f === 'all' || (f === 'registered' ? s.registered : f === 'notYet' ? !s.registered : !!s.needsHelp)

/** "–" for a number that isn't there yet (read as "none yet"). */
function Dash() {
  return (
    <span className={styles.muted}>
      <span aria-hidden="true">–</span>
      <span className="visually-hidden">none yet</span>
    </span>
  )
}

/** Loading, or the friendly error with Try again. */
function LoadNote({ titleId, sub, error, onRetry }: { titleId?: string; sub?: string; error: unknown; onRetry: () => void }) {
  return (
    <div className={styles.content}>
      <Title id={titleId}>My Students</Title>
      {sub && <p className={styles.sub}>{sub}</p>}
      {error ? (
        <div className={styles.loadError} role="alert">
          <p>{errorMessage(error)}</p>
          <Btn onClick={onRetry}>Try again</Btn>
        </div>
      ) : (
        <p className={styles.loading} role="status">
          Loading your students…
        </p>
      )}
    </div>
  )
}

function SheetContent({
  titleId,
  filter,
  onFilter,
  search,
  onSearch,
  page,
  onPage,
  shownCodes,
  onToggleCode,
  printFrom,
  onPrintView,
  openStudent,
  onOpenStudent,
  onBackFromStudent,
  pickedRound,
  onPickRound,
  showRemoved,
  onShowRemoved,
  onBackFromRemoved,
  toast,
  onRemoved,
  onRestore,
  onDeleted,
}: SheetContentProps) {
  const { students, loading, error, retry } = useStudentsLoad()
  const { active, loading: sectionsLoading, error: sectionsError, retry: retrySections } = useSection()
  const { justAdded, clear: backToList } = useJustAdded()
  const { newSection, addStudent, newCode, removeStudent, deleteStudent } = usePlannerActions()
  const teacher = useTeacher()
  const print = usePrintCards()
  const searchId = useId()

  if (!active && (sectionsLoading || sectionsError)) {
    return <LoadNote titleId={titleId} error={sectionsError} onRetry={retrySections} />
  }

  // Before the first section: one friendly message and a way to make it.
  if (!active) {
    return (
      <div className={styles.content}>
        <Title id={titleId}>My Students</Title>
        <p className={styles.sub}>No section yet</p>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Users size={40} strokeWidth={2} />
          </span>
          <strong className={styles.emptyTitle}>Make a section first</strong>
          <p className={styles.emptyLine}>Your students belong to a section, like &ldquo;Grade 4 – Sampaguita&rdquo;. It becomes a tab on top of your planner.</p>
          <Btn variant="primary" className={styles.bigButton} icon={<Plus size={20} aria-hidden="true" />} onClick={newSection}>
            New section
          </Btn>
        </div>
      </div>
    )
  }

  // Print login cards: Back goes to where it was opened from.
  if (printFrom) {
    return (
      <PrintCardsView
        titleId={titleId}
        section={active}
        justAdded={printFrom === 'codes' ? justAdded : null}
        onBack={() => onPrintView(null)}
      />
    )
  }

  /** Card: prints just this Student's login card (no options view). */
  const printOne = (s: Student) => print(toLoginCards([s], active, teacher.name))

  // Just added: their one-time codes, until "← My Students" or the window closes.
  if (justAdded) {
    return (
      <CodesReady
        titleId={titleId}
        section={active}
        justAdded={justAdded}
        onBack={backToList}
        onPrint={() => onPrintView('codes')}
        onCard={printOne}
      />
    )
  }

  const sectionName = `Grade ${active.grade} – ${active.name}`

  // The Student's page: inside the same window, like "Login codes are ready!". Opened
  // from the URL before the list loads: the header fills in from their page.
  if (openStudent) {
    const student = students.find((s) => s.id === openStudent) ?? { id: openStudent, schoolId: '', registered: true }
    return (
      <StudentLevels
        titleId={titleId}
        student={student}
        sectionName={sectionName}
        picked={pickedRound}
        onPick={onPickRound}
        onBack={onBackFromStudent}
      />
    )
  }

  // Removed (the "Removed (N)" link): inside the same window, like the Student's page.
  if (showRemoved) {
    return (
      <RemovedStudents
        titleId={titleId}
        sectionName={sectionName}
        onBack={onBackFromRemoved}
        onRestore={onRestore}
        onDelete={(s) => deleteStudent(s, onDeleted)}
        toast={<ToastPill toast={toast} onUndo={onRestore} />}
      />
    )
  }

  if (loading || error) return <LoadNote titleId={titleId} sub={sectionName} error={error} onRetry={retry} />

  const sub = `${sectionName} · ${students.length} of ${MAX_STUDENTS_PER_SECTION} students`

  // Bottom right: the toast, then the quiet "Removed (N)" link (hidden at 0).
  const removedText = removedLinkText(active.removedCount)
  const footEnd = (
    <span className={styles.footEnd}>
      <ToastPill toast={toast} onUndo={onRestore} />
      {removedText && (
        <button type="button" className={styles.removedLink} data-removed-link onClick={onShowRemoved}>
          <UserMinus size={18} strokeWidth={2.2} aria-hidden="true" />
          {removedText}
        </button>
      )}
    </span>
  )

  if (students.length === 0) {
    return (
      <div className={styles.content}>
        <Title id={titleId}>My Students</Title>
        <p className={styles.sub}>{sub}</p>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Users size={40} strokeWidth={2} />
          </span>
          <strong className={styles.emptyTitle}>No students yet</strong>
          <p className={styles.emptyLine}>Add your students by School ID. KIDDEX makes a login code for each one.</p>
          <Btn
            variant="primary"
            className={styles.bigButton}
            icon={<Plus size={20} aria-hidden="true" />}
            onClick={addStudent}
          >
            Add students
          </Btn>
        </div>
        <div className={`${styles.foot} ${styles.footRight}`}>{footEnd}</div>
      </div>
    )
  }

  // Search: digits only, matching any part of the School ID.
  const digits = search.replace(/\D/g, '')
  const found = students.filter((s) => matches(s, filter) && (!digits || s.schoolId.replace(/\D/g, '').includes(digits)))
  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE))
  const current = Math.min(page, pages - 1)
  const rows = found.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE)
  const count = (f: StudentFilter) => students.filter((s) => matches(s, f)).length

  return (
    <div className={styles.content}>
      <div className={styles.head}>
        <div>
          <Title id={titleId}>My Students</Title>
          <p className={styles.sub}>{sub}</p>
        </div>
        <div className={styles.tools}>
          <label className={styles.search} htmlFor={searchId}>
            <Search size={20} aria-hidden="true" />
            <span className="visually-hidden">Search School ID</span>
            <input
              id={searchId}
              type="search"
              inputMode="numeric"
              value={search}
              maxLength={12}
              placeholder="Search School ID"
              onChange={(e) => onSearch(e.target.value.replace(/[^\d-]/g, ''))}
            />
          </label>
          <Btn
            className={styles.toolButton}
            icon={<Printer size={20} aria-hidden="true" />}
            onClick={() => onPrintView('list')}
          >
            Print login cards
          </Btn>
          <Btn
            variant="primary"
            className={styles.toolButton}
            icon={<Plus size={20} aria-hidden="true" />}
            onClick={addStudent}
          >
            Add students
          </Btn>
        </div>
      </div>

      <div className={styles.pills}>
        <Pills
          label="Show"
          value={filter}
          onChange={onFilter}
          items={[
            { value: 'all', label: `All ${count('all')}` },
            { value: 'registered', label: `Registered ${count('registered')}` },
            { value: 'notYet', label: `Not yet ${count('notYet')}` },
            { value: 'help', label: `Need help ${count('help')}` },
          ]}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">School ID</th>
            <th scope="col">Buddy</th>
            <th scope="col">Login</th>
            <th scope="col">Last played</th>
            <th scope="col">Mastery</th>
            <th scope="col">Streak</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
            <th scope="col">
              <span className="visually-hidden">More</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <StudentRow
              key={s.id}
              s={s}
              codeShown={shownCodes.has(s.id)}
              onToggleCode={() => onToggleCode(s.id)}
              onNewCode={() => newCode(s)}
              onCard={() => printOne(s)}
              onOpen={() => onOpenStudent(s)}
              onRemove={() => removeStudent(s, onRemoved)}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className={styles.noMatch}>
                No students match. Try another School ID.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.foot}>
        <span className={styles.footNote}>
          <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
          Codes stay hidden until you tap Show. You never see a Student’s PIN code.
        </span>
        {pages > 1 && (
          <nav className={styles.pages} aria-label="Pages">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                className={i === current ? `${styles.pageButton} ${styles.pageOn}` : styles.pageButton}
                aria-current={i === current ? 'page' : undefined}
                aria-label={`Page ${i + 1}`}
                onClick={() => onPage(i)}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        )}
        {footEnd}
      </div>
    </div>
  )
}

/** "✓ 2026-0177 removed  [Undo]": a dark pill, read out (role="status"). Nothing when there is no toast. */
function ToastPill({ toast, onUndo }: { toast: Toast | null; onUndo: (s: Student) => void }) {
  return (
    <span role="status" className={styles.toastSlot}>
      {toast && (
        <span key={toast.key} className={styles.toast}>
          {toast.check && <Check size={18} strokeWidth={3} aria-hidden="true" />}
          <span className={styles.toastText}>{toast.text}</span>
          {toast.undo && (
            <button type="button" className={styles.undo} data-toast-undo onClick={() => toast.undo && onUndo(toast.undo)}>
              Undo
            </button>
          )}
        </span>
      )}
    </span>
  )
}

/** Mastery: the bar and %, "Not enough yet" (played, fewer than 8 answers), or the dash (never played). */
function MasteryCellView({ s }: { s: Student }) {
  const cell = masteryCell(s)
  if (cell.kind === 'percent')
    return (
      <span className={styles.mastery}>
        <Bar percent={cell.percent} className={styles.masteryBar} />
        <strong>{cell.percent}%</strong>
      </span>
    )
  if (cell.kind === 'notEnough') return <span className={styles.notEnough}>Not enough yet</span>
  return <Dash />
}

interface StudentRowProps {
  s: Student
  codeShown: boolean
  onToggleCode: () => void
  /** The Give a new login code popup. */
  onNewCode: () => void
  /** Prints this Student's login card. */
  onCard: () => void
  /** Opens the Student's page (their levels). */
  onOpen: () => void
  /** The Remove this Student? popup (from the ⋯ menu). */
  onRemove: () => void
}

function StudentRow({ s, codeShown, onToggleCode, onNewCode, onCard, onOpen, onRemove }: StudentRowProps) {
  const codeSpansStreak = usePhoneSideways() && !s.registered
  return (
    <tr className={styles.row}>
      <th scope="row" className={styles.who}>
        {s.registered && s.buddy ? (
          <img src={buddyHeads[s.buddy]} alt="" className={styles.avatar} />
        ) : (
          <span className={`${styles.avatar} ${styles.avatarEmpty}`} aria-hidden="true" />
        )}
        {s.schoolId}
      </th>
      <td className={styles.buddy}>{s.buddyName ?? <Dash />}</td>
      <td>
        {s.registered ? (
          <Chip tone="ok" className={styles.loginChip} icon={<Check size={15} strokeWidth={3} aria-hidden="true" />}>
            Registered
          </Chip>
        ) : (
          <Chip tone="warn" className={styles.loginChip}>
            Not yet
          </Chip>
        )}
      </td>
      <td>{s.lastPlayed ?? <Dash />}</td>
      {/* Phone: the narrower Mastery column can't hold Code + the big Show pill, so a
          Not-yet row's code also takes the Streak column (they have no streak yet). */}
      <td colSpan={codeSpansStreak ? 2 : undefined}>
        {s.registered ? (
          <MasteryCellView s={s} />
        ) : (
          <span className={styles.code}>
            Code
            {codeShown ? (
              <Chip tone="code" className={styles.codeChip}>
                {s.oneTimeCode ?? '–'}
              </Chip>
            ) : (
              <span className={styles.codeDots}>
                <span aria-hidden="true">•••-•••</span>
                <span className="visually-hidden">hidden</span>
              </span>
            )}
            <button
              type="button"
              className={styles.showPill}
              aria-label={`${codeShown ? 'Hide' : 'Show'} the code for ${s.schoolId}`}
              onClick={onToggleCode}
            >
              {!codeShown && <Eye size={16} strokeWidth={2.2} aria-hidden="true" />}
              {codeShown ? 'Hide' : 'Show'}
            </button>
          </span>
        )}
      </td>
      {!codeSpansStreak && (
        <td>
          {s.registered && s.streak !== undefined ? (
            <span className={styles.streak}>
              <Flame size={17} aria-hidden="true" />
              <strong>{s.streak}</strong>
              <span className="visually-hidden"> day streak</span>
            </span>
          ) : (
            <Dash />
          )}
        </td>
      )}
      <td>
        <span className={styles.actions}>
          {s.registered ? (
            <>
              <Btn
                variant="link"
                className={styles.quietLink}
                aria-label={`New code for ${s.schoolId}`}
                onClick={onNewCode}
              >
                <KeyRound size={16} aria-hidden="true" /> New code
              </Btn>
              <Btn variant="link" aria-label={`Open ${s.schoolId}`} data-open-id={s.id} onClick={onOpen}>
                Open <ArrowRight size={17} aria-hidden="true" />
              </Btn>
            </>
          ) : (
            <Btn
              variant="link"
              aria-label={`Login card for ${s.schoolId}`}
              onClick={onCard}
            >
              <Printer size={16} aria-hidden="true" /> Card
            </Btn>
          )}
        </span>
      </td>
      <td className={styles.moreCell}>
        <RowMenu
          label={`More for ${s.schoolId}`}
          moreId={s.id}
          items={[
            {
              key: 'remove',
              label: 'Remove from section',
              icon: <UserMinus size={20} strokeWidth={2.2} aria-hidden="true" />,
              onSelect: onRemove,
            },
          ]}
        />
      </td>
    </tr>
  )
}
