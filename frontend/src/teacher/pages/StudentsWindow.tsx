import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, Flame, KeyRound, Lock, Plus, Printer, Search, Users, X } from 'lucide-react'
import { errorMessage } from '../api/client'
import { masteryCell } from '../data/reports'
import { MAX_STUDENTS_PER_SECTION } from '../data/schoolIds'
import { useJustAdded, useSection, useStudentsLoad, useTeacher } from '../data/useTeacherData'
import type { Student, StudentFilter } from '../data/types'
import { buddyHeads } from '../assets'
import { studentsPath } from '../planner/pages'
import { usePlannerActions } from '../planner/plannerActions'
import { Bar, Btn, Chip, Pills, Title } from '../planner/ui'
import { toLoginCards, usePrintCards } from '../print/printCards'
import { CodesReady } from './CodesReady'
import { PrintCardsView } from './PrintCardsView'
import { StudentLevels } from './StudentLevels'
import styles from './StudentsWindow.module.css'

const PER_PAGE = 10
const FILTERS: StudentFilter[] = ['all', 'registered', 'notYet', 'help']
const isFilter = (f: string | null): f is StudentFilter => FILTERS.includes(f as StudentFilter)

/** Print login cards opened from the list or from "Login codes are ready!". */
type PrintFrom = 'list' | 'codes'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

  // Esc closes the round detail first, then the window.
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pickedRound) setPickedRound(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closing, onClose, pickedRound])

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
}: SheetContentProps) {
  const { students, loading, error, retry } = useStudentsLoad()
  const { active, loading: sectionsLoading, error: sectionsError, retry: retrySections } = useSection()
  const { justAdded, clear: backToList } = useJustAdded()
  const { newSection, addStudent, newCode } = usePlannerActions()
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

  if (loading || error) return <LoadNote titleId={titleId} sub={sectionName} error={error} onRetry={retry} />

  const sub = `${sectionName} · ${students.length} of ${MAX_STUDENTS_PER_SECTION} students`

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
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className={styles.noMatch}>
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
      </div>
    </div>
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
}

function StudentRow({ s, codeShown, onToggleCode, onNewCode, onCard, onOpen }: StudentRowProps) {
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
      <td>
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
    </tr>
  )
}
