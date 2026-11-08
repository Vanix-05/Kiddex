import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, Check, Flame, KeyRound, Plus, Printer, Search, Users, X } from 'lucide-react'
import { useSection, useStudents } from '../data/useTeacherData'
import type { Student, StudentFilter } from '../data/types'
import { buddyHeads } from '../assets'
import { Bar, Btn, Chip, Pills, Title } from '../planner/ui'
import styles from './StudentsWindow.module.css'

const PER_PAGE = 10
const FILTERS: StudentFilter[] = ['all', 'registered', 'notYet', 'help']
const isFilter = (f: string | null): f is StudentFilter => FILTERS.includes(f as StudentFilter)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface StudentsWindowProps {
  /** true while it folds and lifts away. */
  closing: boolean
  /** From the URL, e.g. "help" for "See who" on Home. */
  initialFilter: string | null
  onClose: () => void
  /** The closing motion finished. */
  onClosed: () => void
}

/**
 * My Students: a grid-paper class record that opens over the current page
 * (no page turn). It drops in folded in half, then the right half unfolds.
 * Closing folds it and lifts it away. ✕, Esc or a click on the blur closes it.
 */
export function StudentsWindow({ closing, initialFilter, onClose, onClosed }: StudentsWindowProps) {
  const titleId = useId()
  const [reduced] = useState(reducedMotion)
  // unfolding = the opening motion (half folded), open = flat, then closing.
  const [unfolding, setUnfolding] = useState(!reduced)
  const [filter, setFilter] = useState<StudentFilter>(isFilter(initialFilter) ? initialFilter : 'all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  // A new filter from the URL (e.g. "See who" while it's open).
  const [seenFilter, setSeenFilter] = useState(initialFilter)
  if (seenFilter !== initialFilter) {
    setSeenFilter(initialFilter)
    setFilter(isFilter(initialFilter) ? initialFilter : 'all')
    setPage(0)
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

  // Esc closes.
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closing, onClose])

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
}

const matches = (s: Student, f: StudentFilter) =>
  f === 'all' || (f === 'registered' ? s.registered : f === 'notYet' ? !s.registered : !!s.needsHelp)

function SheetContent({ titleId, filter, onFilter, search, onSearch, page, onPage }: SheetContentProps) {
  const students = useStudents()
  const { active } = useSection()
  const searchId = useId()

  const sub = `Grade ${active.grade} – ${active.name} · ${students.length} student${students.length === 1 ? '' : 's'}`

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
            onClick={() => {
              // TODO: add students.
            }}
          >
            Add students
          </Btn>
        </div>
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const found = students.filter(
    (s) =>
      matches(s, filter) &&
      (!q || s.name.toLowerCase().includes(q) || (digits !== '' && s.schoolId.replace(/\D/g, '').includes(digits))),
  )
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
            <span className="visually-hidden">Search students</span>
            <input
              id={searchId}
              type="search"
              value={search}
              placeholder="Search name or School ID"
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
          <Btn
            className={styles.toolButton}
            icon={<Printer size={20} aria-hidden="true" />}
            onClick={() => {
              // TODO: print login cards.
            }}
          >
            Print login cards
          </Btn>
          <Btn
            variant="primary"
            className={styles.toolButton}
            icon={<Plus size={20} aria-hidden="true" />}
            onClick={() => {
              // TODO: add students.
            }}
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
            <th scope="col">Student</th>
            <th scope="col">School ID</th>
            <th scope="col">Login</th>
            <th scope="col">Last played</th>
            <th scope="col">Mastery</th>
            <th scope="col">Streak</th>
            <th scope="col">
              <span className="visually-hidden">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <StudentRow key={s.id} s={s} />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className={styles.noMatch}>
                No students match. Try another name or School ID.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.foot}>
        <span>
          {found.length === 0
            ? 'Showing 0'
            : `Showing ${current * PER_PAGE + 1}–${current * PER_PAGE + rows.length} of ${found.length}`}{' '}
          · tap a student to see their profile
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

function StudentRow({ s }: { s: Student }) {
  return (
    <tr className={styles.row}>
      <th scope="row" className={styles.who}>
        {s.registered && s.buddy ? (
          <img src={buddyHeads[s.buddy]} alt="" className={styles.avatar} />
        ) : (
          <span className={`${styles.avatar} ${styles.avatarEmpty}`} aria-hidden="true" />
        )}
        {s.name}
      </th>
      <td className={styles.schoolId}>{s.schoolId}</td>
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
      <td>{s.lastPlayed ?? <span aria-label="not yet">–</span>}</td>
      <td>
        {s.registered && s.mastery !== undefined ? (
          <span className={styles.mastery}>
            <Bar percent={s.mastery} className={styles.masteryBar} />
            <strong>{s.mastery}%</strong>
          </span>
        ) : (
          <span className={styles.code}>
            Code <Chip tone="code">{s.oneTimeCode}</Chip>
          </span>
        )}
      </td>
      <td>
        {!s.registered ? (
          <span className={styles.muted}>–</span>
        ) : s.streak ? (
          <span className={styles.streak}>
            <Flame size={17} aria-hidden="true" />
            <strong>{s.streak}</strong>
            <span className="visually-hidden"> day streak</span>
          </span>
        ) : (
          <span className={styles.muted}>0</span>
        )}
      </td>
      <td>
        {s.registered ? (
          <Btn
            variant="link"
            aria-label={`Open ${s.name}`}
            onClick={() => {
              // TODO: open the student's profile.
            }}
          >
            Open <ArrowRight size={17} aria-hidden="true" />
          </Btn>
        ) : (
          <Btn
            variant="link"
            aria-label={`New code for ${s.name}`}
            onClick={() => {
              // TODO: make a new one-time code.
            }}
          >
            <KeyRound size={16} aria-hidden="true" /> New code
          </Btn>
        )}
      </td>
    </tr>
  )
}
