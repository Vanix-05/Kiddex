import { useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from 'react'
import { Archive, CalendarDays, CalendarOff, Check, RotateCcw, Trash2, TriangleAlert, X } from 'lucide-react'
import { usePhoneSideways } from '../../hooks/usePhoneSideways'
import { ApiError, errorMessage } from '../api/client'
import { firstPick, pickedDueText, schoolWeeks, type SchoolDay } from '../data/dueDates'
import type { FileType } from '../data/types'
import { useLessonArchive, type ArchivedLesson, type LessonWithCounts } from '../data/useTeacherData'
import { canDeleteForever, erasedForeverLine, erasedLine, scoresLeaveLine } from '../pages/lessonArchive'
import { Popup } from './Dialogs'
import { FileBadge } from './ui'
import dialogs from './dialogs.module.css'
import styles from './lessonDialogs.module.css'
import pills from './newCode.module.css'

/** Which lesson popup is open (TeacherPlanner draws it over the blurred planner). */
export type LessonPopup =
  | { kind: 'delete'; lesson: LessonWithCounts; onDone: () => void }
  | { kind: 'archive'; lesson: LessonWithCounts; onDone: () => void }
  | { kind: 'forever'; lesson: ArchivedLesson; onDone: () => void }
  | { kind: 'due'; lesson: LessonWithCounts; onDone: () => void }
  /** Assign on the Games page: the same calendar, saved with the pack later. */
  | { kind: 'pickDue'; current: string | null; onPick: (iso: string | null) => void }

export function LessonPopups({ popup, onClose }: { popup: LessonPopup; onClose: () => void }) {
  switch (popup.kind) {
    case 'delete':
      return <DeleteLessonDialog lesson={popup.lesson} onClose={onClose} onDone={popup.onDone} />
    case 'archive':
      return <ArchiveLessonDialog lesson={popup.lesson} onClose={onClose} onDone={popup.onDone} />
    case 'forever':
      return <DeleteForeverDialog lesson={popup.lesson} onClose={onClose} onDone={popup.onDone} />
    case 'due':
      return <ChangeDueDialog lesson={popup.lesson} onClose={onClose} onDone={popup.onDone} />
    case 'pickDue':
      return (
        <DueDateDialog
          title="Pick a due date"
          current={popup.current}
          onClose={onClose}
          onSave={(iso) => {
            onClose()
            popup.onPick(iso)
          }}
        />
      )
  }
}

/**
 * The lesson in a pill: its file badge (scaled down), the title and a detail
 * ("Not played", "15 played", "Past due · Nov 27"). `short` (a phone held
 * sideways): the title only, on up to 2 lines.
 */
export function LessonPill({ lesson, detail, short = false }: { lesson: { title: string; fileType: FileType }; detail?: string; short?: boolean }) {
  return (
    <div className={`${pills.pill} ${styles.pill}`}>
      <FileBadge type={lesson.fileType} className={styles.badge} />
      <strong className={styles.title}>{lesson.title}</strong>
      {!short && detail && <span className={pills.detail}>{detail}</span>}
    </div>
  )
}

/** One of the popup's lines with its small icon tile. */
function Line({ tone, icon, children }: { tone: 'red' | 'green' | 'blue'; icon: ReactNode; children: ReactNode }) {
  const tile = tone === 'red' ? pills.tileRed : tone === 'green' ? pills.tileGreen : pills.tileBlue
  return (
    <li>
      <span className={`${pills.tile} ${tile}`} aria-hidden="true">
        {icon}
      </span>
      {children}
    </li>
  )
}

const cross = <X size={16} strokeWidth={3} />
const tick = <Check size={16} strokeWidth={3} />

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className={dialogs.error} role="alert">
      {error}
    </p>
  ) : null
}

/** Runs the popup's server call: "…ing" while it waits, the server's message if it fails. */
function useSaving() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (work: () => Promise<void>, onError?: (err: unknown) => void) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
      onError?.(err)
    }
  }
  return { saving, error, run }
}

/**
 * Delete this lesson? (3-delete, 13-phone-delete): only for a lesson nobody played.
 * If a Student played it meanwhile, the server says ARCHIVE_FIRST: its message
 * shows here and My lessons refreshes (its menu then offers Archive).
 */
export function DeleteLessonDialog({ lesson, onClose, onDone }: { lesson: LessonWithCounts; onClose: () => void; onDone: () => void }) {
  const { deleteLesson } = useLessonArchive()
  const phone = usePhoneSideways()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { saving, error, run } = useSaving()
  const [blocked, setBlocked] = useState(false)

  const go = () =>
    run(
      async () => {
        await deleteLesson(lesson.id)
        onClose()
        onDone()
      },
      (err) => setBlocked(err instanceof ApiError && err.code === 'ARCHIVE_FIRST'),
    )

  return (
    <Popup
      title="Delete this lesson?"
      icon={<Trash2 size={32} strokeWidth={2.4} />}
      tone="maroon"
      split={phone}
      aside={<LessonPill lesson={lesson} detail="Not played" short={phone} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <ul className={pills.lines}>
        <Line tone="red" icon={cross}>
          {erasedLine(lesson.questionCount)}
        </Line>
        <Line tone="green" icon={tick}>
          No Student has played it, so no scores are lost.
        </Line>
        <Line tone="red" icon={<TriangleAlert size={16} strokeWidth={2.6} />}>
          This can’t be undone.
        </Line>
      </ul>
      <ErrorLine error={error} />
      <div className={dialogs.row}>
        <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={dialogs.leave} disabled={saving || blocked} onClick={() => void go()}>
          <Trash2 size={20} strokeWidth={2.4} aria-hidden="true" /> {saving ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Popup>
  )
}

/** Archive this lesson? (6-archive, 16-phone-archive): nothing is deleted. */
export function ArchiveLessonDialog({ lesson, onClose, onDone }: { lesson: LessonWithCounts; onClose: () => void; onDone: () => void }) {
  const { archive } = useLessonArchive()
  const phone = usePhoneSideways()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { saving, error, run } = useSaving()

  const go = () =>
    run(async () => {
      await archive(lesson.id)
      onClose()
      onDone()
    })

  return (
    <Popup
      title="Archive this lesson?"
      icon={<Archive size={32} strokeWidth={2.4} />}
      split={phone}
      aside={<LessonPill lesson={lesson} detail={`${lesson.playedBy} played`} short={phone} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <ul className={pills.lines}>
        <Line tone="red" icon={cross}>
          Students stop seeing it in the Lobby and in All games.
        </Line>
        <Line tone="green" icon={tick}>
          Nothing is deleted. Their scores stay in Progress.
        </Line>
        <Line tone="blue" icon={<RotateCcw size={16} strokeWidth={2.6} />}>
          Bring it back anytime from “Archived”.
        </Line>
      </ul>
      <ErrorLine error={error} />
      <div className={dialogs.row}>
        <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={dialogs.save} disabled={saving} onClick={() => void go()}>
          <Archive size={20} strokeWidth={2.4} aria-hidden="true" /> {saving ? 'Archiving…' : 'Archive'}
        </button>
      </div>
    </Popup>
  )
}

/**
 * "I understand this can’t be undone" and the two buttons of Delete forever. The real
 * checkbox is visually hidden; the whole line is its label. Delete forever stays
 * faded until it is ticked.
 */
export function ForeverConfirm({
  ticked,
  saving,
  onTick,
  onCancel,
  onDelete,
  cancelRef,
}: {
  ticked: boolean
  saving: boolean
  onTick: (ticked: boolean) => void
  onCancel: () => void
  onDelete: () => void
  cancelRef?: Ref<HTMLButtonElement>
}) {
  const id = useId()
  return (
    <>
      <label className={styles.tick} htmlFor={id}>
        <input id={id} type="checkbox" className={styles.tickInput} checked={ticked} onChange={(e) => onTick(e.target.checked)} />
        <span className={styles.tickBox} aria-hidden="true">
          <Check size={17} strokeWidth={3.4} />
        </span>
        I understand this can’t be undone
      </label>
      <div className={dialogs.row}>
        <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={dialogs.leave} disabled={!canDeleteForever(ticked, saving)} onClick={onDelete}>
          <Trash2 size={20} strokeWidth={2.4} aria-hidden="true" /> {saving ? 'Deleting…' : 'Delete forever'}
        </button>
      </div>
    </>
  )
}

/** Delete forever? (9-forever2, 19-phone-forever2): an archived lesson with its pack and rounds. */
export function DeleteForeverDialog({ lesson, onClose, onDone }: { lesson: ArchivedLesson; onClose: () => void; onDone: () => void }) {
  const { deleteForever } = useLessonArchive()
  const phone = usePhoneSideways()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [ticked, setTicked] = useState(false)
  const { saving, error, run } = useSaving()

  const go = () =>
    run(async () => {
      if (!ticked) return
      await deleteForever(lesson.id)
      onClose()
      onDone()
    })

  return (
    <Popup
      title="Delete forever?"
      icon={<Trash2 size={32} strokeWidth={2.4} />}
      tone="maroon"
      split={phone}
      aside={<LessonPill lesson={lesson} detail={`${lesson.playedBy} played`} short={phone} />}
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <ul className={pills.lines}>
        <Line tone="red" icon={cross}>
          {erasedForeverLine(lesson.questionCount)}
        </Line>
        <Line tone="red" icon={cross}>
          {scoresLeaveLine(lesson.playedBy)}
        </Line>
        <Line tone="green" icon={tick}>
          Their XP, stars and buddies are kept.
        </Line>
      </ul>
      <ErrorLine error={error} />
      <ForeverConfirm ticked={ticked} saving={saving} onTick={setTicked} onCancel={onClose} onDelete={() => void go()} cancelRef={cancelRef} />
    </Popup>
  )
}

/** Change due date (5-due, 15-phone-due): the pack keeps its name and games. */
function ChangeDueDialog({ lesson, onClose, onDone }: { lesson: LessonWithCounts; onClose: () => void; onDone: () => void }) {
  const { saveDueDate } = useLessonArchive()
  const pack = lesson.pack
  return (
    <DueDateDialog
      title="Change due date"
      lesson={lesson}
      badge={lesson.assignedNote}
      current={pack?.dueDate ?? null}
      note="Students who finish before the new date count as on time."
      onClose={onClose}
      onSave={async (iso) => {
        if (!pack) return
        await saveDueDate(lesson.id, pack, iso)
        onClose()
        onDone()
      }}
    />
  )
}

/**
 * The due date calendar popup: 4 school weeks (Mon–Fri) and "No due date".
 * Change due date saves on the server; Assign's "Pick a due date" only picks.
 * Phone (15): the ring, title, pill, No due date and the buttons on the left,
 * only the calendar on the right, no note.
 */
function DueDateDialog({
  title,
  lesson,
  badge,
  current,
  note,
  onClose,
  onSave,
}: {
  title: string
  lesson?: { title: string; fileType: FileType }
  badge?: string
  current: string | null
  note?: string
  onClose: () => void
  onSave: (iso: string | null) => void | Promise<void>
}) {
  const phone = usePhoneSideways()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const weeks = useMemo(() => schoolWeeks(), [])
  const [picked, setPicked] = useState<string | null>(() => firstPick(current, weeks))
  const { saving, error, run } = useSaving()

  const save = () => run(async () => void (await onSave(picked)))

  const noDue = (
    <button
      type="button"
      className={picked === null ? `${styles.noDue} ${styles.noDueOn}` : styles.noDue}
      aria-pressed={picked === null}
      onClick={() => setPicked(null)}
    >
      <CalendarOff size={18} strokeWidth={2.4} aria-hidden="true" /> No due date
    </button>
  )
  const buttons = (
    <div className={phone ? `${dialogs.row} ${styles.sideRow}` : dialogs.row}>
      <button ref={cancelRef} type="button" className={dialogs.stay} onClick={onClose}>
        Cancel
      </button>
      <button type="button" className={dialogs.save} disabled={saving} onClick={() => void save()}>
        <Check size={20} strokeWidth={3} aria-hidden="true" /> {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )

  return (
    <Popup
      title={title}
      icon={<CalendarDays size={32} strokeWidth={2.4} />}
      split={phone}
      aside={
        <>
          {lesson && <LessonPill lesson={lesson} detail={badge} short={phone} />}
          {phone && (
            <>
              <div>{noDue}</div>
              <ErrorLine error={error} />
              {buttons}
            </>
          )}
        </>
      }
      onClose={onClose}
      initialFocus={cancelRef}
    >
      <DueCalendar weeks={weeks} picked={picked} onPick={setPicked} />
      {!phone && (
        <>
          <div className={styles.dueRow}>
            {noDue}
            <span className={styles.picked} aria-live="polite">
              {pickedDueText(picked)}
            </span>
          </div>
          {note && <p className={styles.note}>{note}</p>}
          <ErrorLine error={error} />
          {buttons}
        </>
      )}
      {phone && (
        <span className="visually-hidden" aria-live="polite">
          {pickedDueText(picked)}
        </span>
      )}
    </Popup>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

/**
 * The school days as a grid of 42px tiles (67 design px on a phone). Arrow keys
 * move between days (Left/Right by a day, Up/Down by a week); Enter or Space picks.
 * Only one day is in the Tab order: the picked one, else the first.
 */
function DueCalendar({ weeks, picked, onPick }: { weeks: (SchoolDay | null)[][]; picked: string | null; onPick: (iso: string) => void }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const days = weeks.flat()
  const shown = days.filter((d): d is SchoolDay => d !== null)
  const tabDay = shown.some((d) => d.iso === picked) ? picked : shown[0]?.iso

  const move = (e: ReactKeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[e.key]
    if (!step) return
    e.preventDefault()
    const from = days.findIndex((d) => d?.iso === (document.activeElement as HTMLElement | null)?.dataset.day)
    if (from < 0) return
    // Skip the empty tiles before today.
    for (let i = from + step; i >= 0 && i < days.length; i += step) {
      const day = days[i]
      if (day) {
        gridRef.current?.querySelector<HTMLElement>(`[data-day="${day.iso}"]`)?.focus()
        return
      }
      if (Math.abs(step) === 5) return
    }
  }

  return (
    <div ref={gridRef} className={styles.calendar} role="grid" aria-label="Due date" onKeyDown={move}>
      <div className={styles.heads} role="row">
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.head} role="columnheader" aria-label={d}>
            {d.toUpperCase()}
          </span>
        ))}
      </div>
      {weeks.map((week, w) => (
        <div key={w} className={styles.week} role="row">
          {week.map((day, i) => (
            <span key={day?.iso ?? `${w}-${i}`} className={styles.cell} role="gridcell" aria-selected={day ? day.iso === picked : undefined}>
              {day && (
                <button
                  type="button"
                  className={day.iso === picked ? `${styles.day} ${styles.dayOn}` : styles.day}
                  data-day={day.iso}
                  tabIndex={day.iso === tabDay ? 0 : -1}
                  aria-label={pickedDueText(day.iso).replace(/^Due /, '')}
                  onClick={() => onPick(day.iso)}
                >
                  {day.month && (
                    <span className={styles.month} aria-hidden="true">
                      {day.month}
                    </span>
                  )}
                  {day.day}
                </button>
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
