import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Eye,
  FileUp,
  Gamepad2,
  Image,
  Info,
  Lock,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Table2,
  Trash2,
  TriangleAlert,
  Type,
  X,
} from 'lucide-react'
import { paths } from '../../routes/paths'
import { errorMessage } from '../api/client'
import type { UploadAnswer, UploadPhase } from '../api/lessonsApi'
import { FILE_TYPE, fileSizeText, unitsText } from '../data/lessonMapping'
import {
  useArchivedLessons,
  useLessonActions,
  useLessonArchive,
  useLessonLoad,
  useLessons,
  useSection,
  type ArchivedLesson,
  type LessonWithCounts,
} from '../data/useTeacherData'
import type { FileType, TemplateId } from '../data/types'
import { GAME_INFO, GAME_ORDER, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { SHOW_PAGE_2, usePhonePages } from '../planner/phonePages'
import { usePlannerActions } from '../planner/plannerActions'
import { Btn, Chip, EmptyLine, FileBadge, Heading, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import { archivedLinkText, lessonMenuItems, lessonToastText, type LessonToastKind } from './lessonArchive'
import { LessonTextWindow } from './LessonTextWindow'
import { TOAST_MS } from './removeStudents'
import { RowMenu, type RowMenuItem } from './RowMenu'
import styles from './Lessons.module.css'
import students from './StudentsWindow.module.css'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_GAMES = 2
/** Below this many words the backend can't make questions (its minWords). */
const ENOUGH_WORDS = 80
/** The "almost no text" meter is full at this many words. */
const METER_FULL_WORDS = 200
const SUBJECTS = ['Math', 'Science', 'English', 'Filipino', 'Araling Panlipunan']

/** "Word" for DOC, "PowerPoint" for PPT. */
const TYPE_NAME: Record<FileType, string> = { PDF: 'PDF', PPT: 'PowerPoint', DOC: 'Word' }

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

// ---------- Left page: My lessons ----------

function StatusChip({ lesson }: { lesson: LessonWithCounts }) {
  switch (lesson.status) {
    case 'making':
      return (
        <Chip tone="warn" icon={<Clock size={16} aria-hidden="true" />}>
          Making…
        </Chip>
      )
    case 'failed':
      return (
        <Chip tone="bad" icon={<RotateCcw size={15} aria-hidden="true" />}>
          Didn’t work · try again
        </Chip>
      )
    case 'toCheck':
      return (
        <Chip tone="warn" icon={<Pencil size={15} aria-hidden="true" />}>
          {lesson.toCheck} to check
        </Chip>
      )
    case 'ready':
      return (
        <Chip tone="ok" icon={<Check size={16} aria-hidden="true" />}>
          Ready · {lesson.approved}
        </Chip>
      )
    case 'assigned':
      // "Due Fri, Dec 4", "Assigned · no due date", or grey "Past due · Nov 27".
      return lesson.pastDue ? (
        <Chip tone="neutral" icon={<CalendarClock size={16} aria-hidden="true" />}>
          {lesson.assignedNote}
        </Chip>
      ) : (
        <Chip tone="info" icon={<Package size={16} aria-hidden="true" />}>
          {lesson.assignedNote}
        </Chip>
      )
    default:
      return <Chip tone="neutral">Draft · {lesson.approved} approved</Chip>
  }
}

/** Where tapping a lesson goes (only lessons with a next step). */
const lessonLink = (l: LessonWithCounts) =>
  l.status === 'making' || l.status === 'failed'
    ? lessonStepPath(l.id, 'making')
    : l.status === 'toCheck'
      ? lessonStepPath(l.id, 'check')
      : l.status === 'ready'
        ? lessonStepPath(l.id, 'games')
        : null

/** The dark pill at the bottom of My lessons (Archive, Restore, Delete, Change due date), for 8 seconds. */
interface LessonToast {
  /** New for each toast (restarts the 8 seconds). */
  key: number
  text: string
  /** ✓ in front ("Due date saved"). */
  check: boolean
  /** Undo restores this lesson (only after Archive). */
  undo?: { id: string; title: string }
}

/** "“Equivalent Fractions” archived  [Undo]": read out (role="status"). Nothing when there is no toast. */
function ToastPill({ toast, onUndo }: { toast: LessonToast | null; onUndo: (lesson: { id: string; title: string }) => void }) {
  return (
    <span role="status" className={students.toastSlot}>
      {toast && (
        <span key={toast.key} className={`${students.toast} ${styles.toast}`}>
          {toast.check && <Check size={18} strokeWidth={3} aria-hidden="true" />}
          <span className={`${students.toastText} ${styles.toastText}`}>{toast.text}</span>
          {toast.undo && (
            <button type="button" className={students.undo} data-toast-undo onClick={() => toast.undo && onUndo(toast.undo)}>
              Undo
            </button>
          )}
        </span>
      )}
    </span>
  )
}

/** A new key for each toast (restarts its 8 seconds and its little entrance). */
let toastCount = 0
const nextToastKey = () => ++toastCount

const MENU_ICON = { size: 20, strokeWidth: 2.2, 'aria-hidden': true } as const

function MyLessons({ showHowItWorks, live }: { showHowItWorks: boolean; live: boolean }) {
  const { lessons, loading, error } = useLessons()
  const { archived } = useArchivedLessons()
  const { restore } = useLessonArchive()
  const { lessonPopup } = usePlannerActions()
  const { active } = useSection()
  const navigate = useNavigate()
  const { phone, turn } = usePhonePages()
  const rootRef = useRef<HTMLDivElement>(null)
  // My lessons, or the Archived view in its place (the right page stays).
  const [view, setView] = useState<'list' | 'archived'>('list')
  const [toast, setToast] = useState<LessonToast | null>(null)
  // Phone: uploading lives on page 2, so page 1 gets a big way there.
  const addButton = phone && showHowItWorks && active
  const sectionName = active ? `Grade ${active.grade} – ${active.name}` : 'No section yet'

  // The toast goes away after 8 seconds (a new one starts the 8 seconds again).
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  /** Focus something on this page once React has drawn it. */
  const focusLater = (selector: string, fallback?: string) =>
    requestAnimationFrame(() => {
      const root = rootRef.current
      const el = root?.querySelector<HTMLElement>(selector) ?? (fallback ? root?.querySelector<HTMLElement>(fallback) : null)
      el?.focus({ preventScroll: !phone })
    })

  const say = (kind: LessonToastKind, title: string, undo?: { id: string; title: string }) =>
    setToast({ key: nextToastKey(), text: lessonToastText(kind, title), check: kind === 'dueSaved', undo })

  const showArchived = () => {
    setView('archived')
    focusLater('[data-archived-title]')
  }
  const backToList = () => {
    setView('list')
    focusLater('[data-archived-link]', '[data-lessons-title]')
  }

  // Esc goes back from Archived (popups and menus close first: they stop the Esc).
  useEffect(() => {
    if (!live || view !== 'archived') return
    const onKey = (e: KeyboardEvent) => {
      const onPage = e.target === document.body || (e.target instanceof Node && !!rootRef.current?.closest('main')?.contains(e.target))
      if (e.key === 'Escape' && onPage) backToList()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  /** Undo, or Restore in the Archived view: back in My lessons. */
  const onRestore = async (lesson: { id: string; title: string }, fromList: boolean) => {
    try {
      await restore(lesson.id)
      say('restored', lesson.title)
      // Undo: focus is back on its row's ⋯.
      if (fromList) focusLater(`[data-more-id="${CSS.escape(lesson.id)}"]`, '[data-lessons-title]')
    } catch (err) {
      setToast({ key: nextToastKey(), text: errorMessage(err), check: false })
    }
  }

  const menuFor = (l: LessonWithCounts): RowMenuItem[] =>
    lessonMenuItems({ assigned: l.status === 'assigned' && !!l.pack, playedBy: l.playedBy }).map((item) => {
      switch (item) {
        case 'due':
          return {
            key: item,
            label: 'Change due date',
            icon: <CalendarDays {...MENU_ICON} />,
            className: styles.menuDue,
            onSelect: () => lessonPopup({ kind: 'due', lesson: l, onDone: () => say('dueSaved', l.title) }),
          }
        case 'archive':
          return {
            key: item,
            label: 'Archive lesson',
            icon: <Archive {...MENU_ICON} />,
            className: styles.menuArchive,
            onSelect: () =>
              lessonPopup({
                kind: 'archive',
                lesson: l,
                onDone: () => {
                  // The row is gone: focus Undo.
                  say('archived', l.title, { id: l.id, title: l.title })
                  focusLater('[data-toast-undo]')
                },
              }),
          }
        case 'delete':
          return {
            key: item,
            label: 'Delete lesson',
            icon: <Trash2 {...MENU_ICON} />,
            onSelect: () =>
              lessonPopup({
                kind: 'delete',
                lesson: l,
                onDone: () => {
                  say('deleted', l.title)
                  focusLater('[data-more-id]', '[data-lessons-title]')
                },
              }),
          }
      }
    })

  const linkText = archivedLinkText(archived.length)
  const foot = (link: boolean) => (
    // Phone: pinned at the bottom right while a toast shows (17-phone-after); otherwise after the list.
    <div className={toast ? `${styles.foot} ${styles.footPinned}` : styles.foot}>
      <ToastPill toast={toast} onUndo={(l) => void onRestore(l, true)} />
      {link && linkText && (
        <button type="button" className={`${students.removedLink} ${styles.archivedLink}`} data-archived-link onClick={showArchived}>
          <Archive size={18} strokeWidth={2.2} aria-hidden="true" />
          {linkText}
        </button>
      )}
    </div>
  )

  if (view === 'archived') {
    return (
      <PageBody side="L">
        <div ref={rootRef} className={styles.pageRoot}>
          <ArchivedLessons
            sectionName={sectionName}
            onBack={backToList}
            onRestore={(l) => onRestore(l, false)}
            onDelete={(l) =>
              lessonPopup({
                kind: 'forever',
                lesson: l,
                onDone: () => {
                  say('deletedForever', l.title)
                  focusLater('[data-restore]', '[data-archived-title]')
                },
              })
            }
          />
          {foot(false)}
        </div>
      </PageBody>
    )
  }

  return (
    <PageBody side="L">
      <div ref={rootRef} className={styles.pageRoot}>
        <div className={addButton ? styles.titleRow : undefined}>
          <div tabIndex={-1} data-lessons-title className={styles.focusTitle}>
            <Title>My lessons</Title>
          </div>
          {addButton && (
            <Btn variant="primary" className={styles.addLesson} icon={<Plus size={26} strokeWidth={3} aria-hidden="true" />} onClick={() => turn?.('R')}>
              Add a lesson
            </Btn>
          )}
        </div>
        <Sub>{sectionName}</Sub>

        {lessons.length === 0 ? (
          error ? (
            <p className={styles.listError} role="alert">
              <TriangleAlert size={17} aria-hidden="true" /> {errorMessage(error)}
            </p>
          ) : loading ? (
            <p className={styles.listLoading}>Loading your lessons…</p>
          ) : (
            <div className={styles.noLessons}>
              <strong>No lessons yet</strong>
              <span>
                {phone ? 'Tap Add a lesson to upload your first one' : 'Upload your first one on the right'} <ArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          )
        ) : (
          <ul className={styles.list}>
            {lessons.map((l) => {
              const to = lessonLink(l)
              const inner = (
                <>
                  <FileBadge type={l.fileType} />
                  <span className={styles.lessonText}>
                    <span className={styles.lessonTitle}>{l.title}</span>
                    <span className={styles.lessonInfo}>
                      {l.fileType === 'DOC' && 'Word · '}
                      {l.size} · {l.uploaded}
                    </span>
                  </span>
                  <StatusChip lesson={l} />
                </>
              )
              return (
                <li key={l.id} className={l.status === 'making' ? `${styles.lesson} ${styles.lessonNew}` : styles.lesson}>
                  {to ? (
                    // A lesson being made: its details are on the Making spread's page 2 (a phone turns there).
                    <button
                      type="button"
                      className={styles.lessonButton}
                      onClick={() => navigate(to, l.status === 'making' || l.status === 'failed' ? { state: SHOW_PAGE_2 } : undefined)}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className={styles.lessonButton}>{inner}</div>
                  )}
                  {/* ⋯ beside the row's own button; none while its questions are being made. */}
                  {l.status === 'making' ? (
                    <span className={styles.moreSpace} aria-hidden="true" />
                  ) : (
                    <RowMenu
                      label={`More for ${l.title}`}
                      moreId={l.id}
                      items={menuFor(l)}
                      buttonClassName={styles.more}
                      menuClassName={styles.menu}
                      place={{ prefer: phone ? 'up' : 'down' }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {foot(true)}
        {/* Only with room to spare, so the toast and "Archived (N)" always fit. */}
        {showHowItWorks && lessons.length <= 4 && <HowItWorks />}
      </div>
    </PageBody>
  )
}

/**
 * Archived (8-archived, 18-phone-archived): on the left page in place of My lessons.
 * Restore brings a lesson and its pack back; the trash opens Delete forever. With
 * none left it goes back to My lessons on its own.
 */
function ArchivedLessons({
  sectionName,
  onBack,
  onRestore,
  onDelete,
}: {
  sectionName: string
  onBack: () => void
  onRestore: (lesson: ArchivedLesson) => Promise<void>
  onDelete: (lesson: ArchivedLesson) => void
}) {
  const { archived, loaded, loading, error, retry } = useArchivedLessons()
  const listRef = useRef<HTMLUListElement>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // None left (all restored or deleted): back to My lessons on its own.
  useEffect(() => {
    if (loaded && archived.length === 0) onBack()
  }, [loaded, archived.length, onBack])

  const restore = async (l: ArchivedLesson) => {
    setBusy(l.id)
    await onRestore(l)
    setBusy(null)
    // The row is gone: focus the next Restore, if any.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[data-restore]')?.focus({ preventScroll: true }))
  }

  return (
    <>
      <div className={styles.archivedHead}>
        <div tabIndex={-1} data-archived-title className={styles.focusTitle}>
          <Title>Archived</Title>
          <Sub>{sectionName} · Students can’t see these</Sub>
        </div>
        <Btn className={styles.backButton} icon={<ArrowLeft size={20} aria-hidden="true" />} onClick={onBack}>
          My lessons
        </Btn>
      </div>

      {loading || error ? (
        error ? (
          <p className={styles.listError} role="alert">
            <TriangleAlert size={17} aria-hidden="true" /> {errorMessage(error)}{' '}
            <Btn variant="link" onClick={retry}>
              Try again
            </Btn>
          </p>
        ) : (
          <p className={styles.listLoading}>Loading…</p>
        )
      ) : (
        <>
          <ul ref={listRef} className={`${styles.list} ${styles.archivedList}`}>
            {archived.map((l) => (
              <li key={l.id} className={styles.lesson}>
                <div className={styles.lessonButton}>
                  <FileBadge type={l.fileType} />
                  <span className={styles.lessonText}>
                    <span className={styles.lessonTitle}>{l.title}</span>
                    <span className={styles.lessonInfo}>
                      {l.archivedLabel} · {l.playedBy} played
                    </span>
                  </span>
                </div>
                <span className={styles.archivedActions}>
                  <button
                    type="button"
                    className={styles.restore}
                    data-restore
                    disabled={busy === l.id}
                    aria-label={`Restore ${l.title}`}
                    onClick={() => void restore(l)}
                  >
                    <ArchiveRestore size={18} strokeWidth={2.4} aria-hidden="true" />
                    Restore
                  </button>
                  <button
                    type="button"
                    className={styles.trash}
                    aria-label="Delete forever"
                    title="Delete forever"
                    onClick={() => onDelete(l)}
                  >
                    <Trash2 size={18} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.archivedNote}>Restore brings the lesson and its review pack back. Scores were kept all along.</p>
        </>
      )}
    </>
  )
}

export function LessonsLeft({ live }: PageProps) {
  return <MyLessons showHowItWorks live={live} />
}

export function MakingLeft({ live }: PageProps) {
  return <MyLessons showHowItWorks={false} live={live} />
}

function HowItWorks() {
  const steps = [
    { icon: FileUp, a: 'You upload', b: 'PDF, slides, Word', tone: styles.howBrown },
    { icon: Sparkles, a: 'AI drafts', b: 'questions', tone: styles.howPurple },
    { icon: Pencil, a: 'You check', b: 'and approve', tone: styles.howOrange },
    { icon: Gamepad2, a: 'Kids play', b: 'mini games', tone: styles.howGreen },
  ]
  return (
    <section className={styles.how}>
      <Heading>How it works</Heading>
      <ol className={styles.howSteps}>
        {steps.map(({ icon: Icon, a, b, tone }, i) => (
          <li key={a} className={styles.howStep}>
            {i > 0 && <ArrowRight className={styles.howArrow} size={20} aria-hidden="true" />}
            <span className={`${styles.howIcon} ${tone}`} aria-hidden="true">
              <Icon size={28} strokeWidth={2} />
            </span>
            <strong>{a}</strong>
            <span className={styles.howText}>{b}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- Right page: Add a lesson ----------

const typeOf = (name: string): FileType | null =>
  /\.pdf$/i.test(name) ? 'PDF' : /\.pptx$/i.test(name) ? 'PPT' : /\.docx$/i.test(name) ? 'DOC' : null

/**
 * A friendly line for a file KIDDEX can't use, or '' if it's fine.
 * The same words as the backend's errors, so the Teacher sees one voice.
 */
function fileProblem(file: File): string {
  if (!typeOf(file.name)) {
    const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? ''
    if (ext === 'doc' || ext === 'ppt') {
      return 'This is an older Word or PowerPoint file. Open it and save it as .docx or .pptx, then upload again.'
    }
    return 'Please upload a PDF, Word (.docx) or PowerPoint (.pptx) file.'
  }
  if (file.size === 0) return 'Please choose a lesson file.'
  if (file.size > MAX_BYTES) return 'This file is bigger than 10 MB. Try a smaller file.'
  return ''
}

/** "Equivalent-Fractions-Wk3.docx" -> "Equivalent Fractions" (a starting guess). */
const topicFromName = (name: string) =>
  name
    .replace(/\.(pdf|pptx|docx)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(wk|week)\s*\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

/** 1 Pick your file → 2 Name the topic → 3 Make questions. */
function UploadSteps({ current }: { current: number }) {
  const steps = ['Pick your file', 'Name the topic', 'Make questions']
  return (
    <ol className={styles.guide} aria-label="Steps">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next'
        return (
          <li key={s} className={`${styles.guideStep} ${styles[`guide_${state}`]}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className={styles.guideDot} aria-hidden="true">
              {state === 'done' ? <Check size={18} strokeWidth={3.2} /> : i + 1}
            </span>
            {s}
            {state === 'done' && <span className="visually-hidden"> (done)</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** Where the upload is: nothing yet, sending, read, or the upload failed. */
type Stage =
  | { kind: 'empty' }
  | { kind: 'sending'; file: File; progress: UploadPhase }
  | { kind: 'read'; answer: UploadAnswer }
  | { kind: 'failed'; file: File; message: string }

/** "PowerPoint · 14 slides · 6.2 MB" ("Word · 84 KB": Word pages are only a guess). */
function fileFacts(answer: UploadAnswer) {
  const type = FILE_TYPE[answer.fileType]
  const units = answer.unitCountIsEstimate ? '' : ` · ${unitsText(answer.unitCount, answer.unitLabel, false)}`
  return `${TYPE_NAME[type]}${units} · ${fileSizeText(answer.sizeBytes)}`
}

/** The top of every file card: badge, name, facts and Change. */
function FileHead({ type, name, facts, onChange, tab }: { type: FileType; name: string; facts: ReactNode; onChange: () => void; tab?: number }) {
  return (
    <div className={styles.fileHead}>
      <FileBadge type={type} />
      <span className={styles.lessonText}>
        <span className={styles.fileName}>{name}</span>
        <span className={styles.fileFacts}>{facts}</span>
      </span>
      <Btn variant="link" className={styles.change} tabIndex={tab} onClick={onChange}>
        Change
      </Btn>
    </div>
  )
}

export function UploadRight({ live }: PageProps) {
  const navigate = useNavigate()
  const { phone } = usePhonePages()
  const { active } = useSection()
  const { upload, removeLesson, makeQuestions } = useLessonActions()
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<AbortController | null>(null)
  const ids = useId()
  const [stage, setStage] = useState<Stage>({ kind: 'empty' })
  const [pickError, setPickError] = useState('')
  const [serverError, setServerError] = useState('')
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('Math')
  const [games, setGames] = useState<TemplateId[]>(['quiz-show'])
  const [gameHint, setGameHint] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [showText, setShowText] = useState(false)
  const [busy, setBusy] = useState(false)
  const tab = live ? undefined : -1

  // Leaving the page stops an upload that is still running.
  useEffect(() => () => uploadRef.current?.abort(), [])

  const send = async (file: File) => {
    uploadRef.current?.abort()
    const controller = new AbortController()
    uploadRef.current = controller
    setServerError('')
    setStage({ kind: 'sending', file, progress: { phase: 'uploading', percent: 0 } })
    try {
      const answer = await upload(
        file,
        (progress) => {
          if (!controller.signal.aborted) setStage({ kind: 'sending', file, progress })
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setStage({ kind: 'read', answer })
      setTopic(topicFromName(file.name))
      setGames(['quiz-show'])
      setGameHint(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setStage({ kind: 'failed', file, message: errorMessage(err) })
    }
  }

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = fileProblem(f)
    setPickError(problem)
    if (problem) return
    forgetCurrent()
    void send(f)
  }

  /** The uploaded lesson has no questions yet: delete it on the server (best effort). */
  const forgetCurrent = () => {
    uploadRef.current?.abort()
    if (stage.kind === 'read') void removeLesson(stage.answer.lessonId).catch(() => undefined)
  }

  /** Change / Choose another file: forget this one, then pick again. */
  const change = () => {
    forgetCurrent()
    setStage({ kind: 'empty' })
    setServerError('')
    setPickError('')
    inputRef.current?.click()
  }

  const dropProps = {
    // Phone: a tap anywhere on the drop zone opens the file picker (there is no dragging there).
    onClick: phone ? () => inputRef.current?.click() : undefined,
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      pick(e.dataTransfer.files[0])
    },
  }

  /** Up to 2 games; a third tap says "Unpick one first". */
  const toggleGame = (g: TemplateId) => {
    if (games.includes(g)) {
      setGames(games.filter((x) => x !== g))
      setGameHint(false)
    } else if (games.length >= MAX_GAMES) {
      setGameHint(true)
    } else {
      setGames(GAME_ORDER.filter((x) => x === g || games.includes(x)))
      setGameHint(false)
    }
  }

  const answer = stage.kind === 'read' ? stage.answer : null
  const canMake = !!answer && answer.textLevel !== 'none' && topic.trim() !== '' && games.length > 0 && !!active && !busy

  const make = async () => {
    if (!answer || !active || !canMake) return
    setBusy(true)
    setServerError('')
    try {
      await makeQuestions(answer.lessonId, { topic: topic.trim(), subject, grade: active.grade, games })
      navigate(lessonStepPath(answer.lessonId, 'making'))
    } catch (err) {
      setServerError(errorMessage(err))
      setBusy(false)
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.pptx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        pick(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  const privacy = (
    <p className={styles.privacy}>
      <Lock size={16} aria-hidden="true" />
      <span>Only the lesson text goes to the AI. Never student names or scores.</span>
    </p>
  )

  const redNote = serverError || (stage.kind === 'failed' ? stage.message : '')
  const errorNote = redNote ? (
    <p className={styles.changeError} role="alert">
      <TriangleAlert size={16} aria-hidden="true" /> {redNote}
    </p>
  ) : null

  const textWindow =
    showText && answer && live ? (
      // The window puts focus back on the link or button that opened it.
      <LessonTextWindow lessonId={answer.lessonId} onClose={() => setShowText(false)} />
    ) : null

  // ---------- Nothing picked yet ----------
  if (stage.kind === 'empty') {
    return (
      <PageBody side="R">
        <Title color="blue">Add a lesson</Title>
        <Sub>Turn your lesson into games in 3 easy steps.</Sub>
        <UploadSteps current={0} />
        {fileInput}
        <div className={dragging ? `${styles.drop} ${styles.dropOver}` : styles.drop} {...dropProps}>
          <span className={styles.dropArt} aria-hidden="true">
            <FileBadge type="PDF" className={styles.artPdf} />
            <FileBadge type="PPT" className={styles.artPpt} />
            <FileBadge type="DOC" className={styles.artDoc} />
            <span className={styles.artIcon}>
              <FileUp size={22} strokeWidth={2.4} />
            </span>
          </span>
          <strong className={styles.dropTitle}>Drag your lesson file here</strong>
          <span className={styles.dropOr}>or</span>
          <Btn
            variant="primary"
            className={styles.choose}
            icon={<FileUp size={22} aria-hidden="true" />}
            tabIndex={tab}
            onClick={(e) => {
              // Phone: the drop zone around it opens the picker too; open it once.
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Choose a file
          </Btn>
          <span className={styles.dropSlot} aria-live="polite">
            {pickError ? (
              <span className={styles.dropError} role="alert">
                <TriangleAlert size={17} aria-hidden="true" />
                {pickError}
              </span>
            ) : (
              <span className={styles.dropHint}>PDF, PowerPoint or Word · up to 10 MB</span>
            )}
          </span>
        </div>

        <div className={styles.fit}>
          <div className={`${styles.fitBox} ${styles.fitYes}`}>
            <span className={styles.fitIcon} aria-hidden="true">
              <Check size={18} strokeWidth={3.2} />
            </span>
            <span>
              <strong>Works great</strong>
              Typed handouts, worksheets, slides
            </span>
          </div>
          <div className={`${styles.fitBox} ${styles.fitNo}`}>
            <span className={styles.fitIcon} aria-hidden="true">
              <X size={18} strokeWidth={3.2} />
            </span>
            <span>
              <strong>Not yet</strong>
              Photos or scanned pages
            </span>
          </div>
        </div>
        {privacy}
      </PageBody>
    )
  }

  // ---------- Uploading and reading, or the upload failed ----------
  if (stage.kind === 'sending' || stage.kind === 'failed') {
    const type = typeOf(stage.file.name) ?? 'PDF'
    const progress = stage.kind === 'sending' ? stage.progress : null
    return (
      <PageBody side="R">
        <Title color="blue">Add a lesson</Title>
        <Sub>Turn your lesson into games in 3 easy steps.</Sub>
        <UploadSteps current={0} />
        {fileInput}
        <div className={`${styles.fileCard} ${styles.fileCardPlain}`} {...dropProps}>
          <FileHead type={type} name={stage.file.name} facts={`${TYPE_NAME[type]} · ${fileSizeText(stage.file.size)}`} onChange={change} tab={tab} />
          {progress && (
            <div className={styles.sending}>
              <span className={styles.sendingText} aria-live="polite">
                {progress.phase === 'uploading' ? `Uploading… ${progress.percent}%` : 'Reading the text…'}
              </span>
              <span
                className={styles.sendBar}
                role="progressbar"
                aria-label="Upload"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.phase === 'uploading' ? progress.percent : undefined}
              >
                <span
                  className={progress.phase === 'reading' ? `${styles.sendFill} ${styles.sendReading}` : styles.sendFill}
                  style={progress.phase === 'uploading' ? { width: `${progress.percent}%` } : undefined}
                />
              </span>
            </div>
          )}
        </div>
        {errorNote}
        <Btn variant="primary" className={styles.makeButton} disabled tabIndex={tab} icon={<Sparkles size={24} aria-hidden="true" />}>
          Make questions
        </Btn>
        {privacy}
      </PageBody>
    )
  }

  // ---------- Read ----------
  const read = stage.answer
  const type = FILE_TYPE[read.fileType]
  const unitsRead = unitsText(read.unitCount, read.unitLabel, read.unitCountIsEstimate)
  const words = plural(read.wordCount, 'word')

  // Almost no text (r2): no topic, no games, no Make questions.
  if (read.textLevel === 'none') {
    const fill = Math.min(1, read.wordCount / METER_FULL_WORDS)
    const where = read.unitCountIsEstimate ? 'this file' : unitsRead
    return (
      <PageBody side="R">
        <Title color="blue">Add a lesson</Title>
        <Sub>Turn your lesson into games in 3 easy steps.</Sub>
        <UploadSteps current={0} />
        {fileInput}
        <div className={`${styles.fileCard} ${styles.fileCardWarn}`} {...dropProps}>
          <FileHead type={type} name={read.fileName} facts={fileFacts(read)} onChange={change} tab={tab} />
          <div className={styles.fileRule} />
          <div className={styles.noText}>
            <span className={styles.noTextIcon} aria-hidden="true">
              <TriangleAlert size={20} strokeWidth={2.6} />
            </span>
            <div className={styles.noTextBody}>
              <p className={styles.noTextTitle}>We found almost no text</p>
              <p className={styles.noTextLine}>
                Only {words} in {where}. This file looks like it is mostly pictures, and we can’t read pictures yet.
              </p>
              <div className={styles.meter} aria-hidden="true">
                <span className={styles.meterTrack}>
                  <span className={styles.meterFill} style={{ width: `${Math.max(fill * 100, 3)}%` }} />
                  <span className={styles.meterMark} style={{ left: `${(ENOUGH_WORDS / METER_FULL_WORDS) * 100}%` }} />
                </span>
                <span className={styles.meterWords}>{words}</span>
                <span className={styles.meterLabel} style={{ left: `${(ENOUGH_WORDS / METER_FULL_WORDS) * 100}%` }}>
                  enough to make questions
                </span>
              </div>
              <span className="visually-hidden">
                {`${words} found. About ${ENOUGH_WORDS} words are enough to make questions.`}
              </span>
            </div>
          </div>
        </div>
        {errorNote}

        <div className={styles.whatNow}>
          <Heading>What you can do</Heading>
        </div>
        <ul className={styles.tips}>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              <Type size={20} strokeWidth={2.4} />
            </span>
            <span>
              <strong>Use the typed version</strong>A Word file or PDF where you can select the words with your mouse.
            </span>
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              <Pencil size={18} strokeWidth={2.4} />
            </span>
            <span>
              <strong>Add the words to your {read.fileType === 'pptx' ? 'slides' : 'file'}</strong>
              {read.fileType === 'pptx'
                ? 'Type the key points as text on each slide, then upload again.'
                : 'Type the key points as text in your file, then upload again.'}
            </span>
          </li>
        </ul>

        <div className={styles.noTextActions}>
          <Btn variant="primary" className={styles.another} icon={<FileUp size={22} aria-hidden="true" />} tabIndex={tab} onClick={change}>
            Choose another file
          </Btn>
          {read.wordCount > 0 && (
            <Btn className={styles.seeWords} icon={<Eye size={20} aria-hidden="true" />} tabIndex={tab} onClick={() => setShowText(true)}>
              See the {words}
            </Btn>
          )}
        </div>
        <p className={styles.takes}>We need more text to make good questions.</p>
        {textWindow}
      </PageBody>
    )
  }

  // Read OK (r1), or low text.
  const extras = [
    read.tablesRead ? { icon: <Table2 size={16} aria-hidden="true" />, text: `${plural(read.tablesRead, 'table')} read as text` } : null,
    read.picturesSkipped ? { icon: <Image size={16} aria-hidden="true" />, text: `${plural(read.picturesSkipped, 'picture')} skipped` } : null,
  ].filter((x) => x !== null)

  return (
    <PageBody side="R">
      <Title color="blue">Add a lesson</Title>
      <Sub>Turn your lesson into games in 3 easy steps.</Sub>
      <UploadSteps current={1} />
      {fileInput}

      <div className={`${styles.fileCard} ${styles.fileCardOk}`} {...dropProps}>
        <FileHead type={type} name={read.fileName} facts={fileFacts(read)} onChange={change} tab={tab} />
        <div className={styles.fileRule} />
        <p className={styles.readLine}>
          <span className={styles.readTick} aria-hidden="true">
            <Check size={18} strokeWidth={3.2} />
          </span>
          <strong>We read {unitsRead} of text</strong>
          <span className={styles.readWords}>· {words}</span>
        </p>
        <div className={styles.readExtras}>
          {extras.map((x) => (
            <span key={x.text} className={styles.extraChip}>
              {x.icon}
              {x.text}
            </span>
          ))}
          <button type="button" className={styles.seeText} tabIndex={tab} onClick={() => setShowText(true)}>
            <Eye size={18} aria-hidden="true" /> See the text
          </button>
        </div>
      </div>
      {read.textLevel === 'low' && (
        <p className={styles.lowText}>
          <Info size={16} aria-hidden="true" /> Not much text. You may get fewer questions.
        </p>
      )}
      {errorNote}

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>What is this lesson about?</span>
          <input className={styles.input} value={topic} maxLength={80} placeholder="e.g. Equivalent Fractions" tabIndex={tab} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fieldSmall}`}>
          <span className={styles.label}>Subject</span>
          <select className={styles.select} value={subject} tabIndex={tab} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.gamesBlock} role="group" aria-labelledby={`${ids}-games`}>
        <div className={styles.gamesHead}>
          <span id={`${ids}-games`} className={styles.label}>
            Which games? <span className={styles.labelHint}>· pick up to 2</span>
          </span>
          <span className={styles.gameNote} aria-live="polite">
            {gameHint ? (
              <span className={styles.unpickHint}>Unpick one first</span>
            ) : (
              <span className={styles.pickedCount}>
                {games.length} of {MAX_GAMES} picked
              </span>
            )}
          </span>
        </div>
        <div className={styles.gamePics}>
          {GAME_ORDER.map((g) => {
            const on = games.includes(g)
            const full = !on && games.length >= MAX_GAMES
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                aria-disabled={full || undefined}
                tabIndex={tab}
                className={[styles.gamePic, on && styles.gamePicOn, full && styles.gamePicFull].filter(Boolean).join(' ')}
                onClick={() => toggleGame(g)}
              >
                <img src={gameThumbs[g]} alt="" className={styles.gamePicImg} draggable={false} />
                <span className={styles.gamePicName}>{GAME_INFO[g].name}</span>
                {on && (
                  <span className={styles.gamePicTick} aria-hidden="true">
                    <Check size={16} strokeWidth={3.4} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Btn variant="primary" className={styles.makeButton} disabled={!canMake} tabIndex={tab} onClick={make} icon={<Sparkles size={24} aria-hidden="true" />}>
        {busy ? 'Starting…' : 'Make questions'}
      </Btn>
      <p className={styles.takes}>The AI writes questions only from the text we read. You check every one.</p>
      {privacy}
      {textWindow}
    </PageBody>
  )
}

// ---------- Right page: Making questions ----------

/** "0:32" */
const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function MakingRight({ lessonId, live }: PageProps) {
  const { lesson, loading, notFound } = useLessonLoad(lessonId)
  const { makeQuestions, removeLesson } = useLessonActions()
  const { active } = useSection()
  const navigate = useNavigate()
  const making = lesson?.status === 'making'
  const failed = lesson?.status === 'failed'
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const tab = live ? undefined : -1

  // The elapsed timer ticks on the live page only (never on a turning copy).
  useEffect(() => {
    if (!live || !making) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [live, making])

  // Done while the Teacher is still here: turn to Check by itself.
  const wasMaking = useRef(making)
  useEffect(() => {
    if (live && wasMaking.current && lesson?.status === 'toCheck') navigate(lessonStepPath(lesson.id, 'check'))
    wasMaking.current = making
  }, [live, making, lesson, navigate])

  if (!lesson) {
    return (
      <PageBody side="R">
        <Title color="blue">Making questions</Title>
        {loading ? (
          <p className={styles.listLoading}>Loading…</p>
        ) : (
          <EmptyLine action={<Btn tabIndex={tab} onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>}>
            {notFound ? 'This lesson isn’t here anymore.' : 'We can’t reach KIDDEX right now. Please check your connection and try again.'}
          </EmptyLine>
        )}
      </PageBody>
    )
  }

  if (lesson.status === 'draft') {
    return (
      <PageBody side="R">
        <Title color="blue">Making questions</Title>
        <EmptyLine action={<Btn tabIndex={tab} onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>}>
          Questions for this lesson haven’t been started yet.
        </EmptyLine>
      </PageBody>
    )
  }

  const tryAgain = async () => {
    setBusy(true)
    setActionError('')
    try {
      await makeQuestions(lesson.id, {
        topic: lesson.topic || lesson.title,
        subject: lesson.subject || 'Math',
        grade: lesson.grade ?? active?.grade ?? 4,
        games: lesson.games,
      })
    } catch (err) {
      setActionError(errorMessage(err))
    }
    setBusy(false)
  }

  const chooseAnother = async () => {
    setBusy(true)
    setActionError('')
    try {
      await removeLesson(lesson.id)
      navigate(paths.teacher.lessons)
    } catch (err) {
      setActionError(errorMessage(err))
      setBusy(false)
    }
  }

  // Seconds from the server, ticking on between its answers.
  const seconds = lesson.makingSeconds === null ? 0 : lesson.makingSeconds + Math.max(0, now - lesson.fetchedAt) / 1000
  // Which step is happening (0–4); 5 = all done.
  const step = making ? (lesson.makingStep === 'checking' ? 3 : 2) : failed ? 2 : 5
  const waiting = making && lesson.makingStep === 'waiting'
  const steps = [
    { title: 'File uploaded', detail: `${TYPE_NAME[lesson.fileType]}${lesson.fileSize ? ` · ${lesson.fileSize}` : ''}` },
    { title: 'Read the lesson text', detail: `${lesson.size} · ${plural(lesson.wordCount, 'word')}` },
    {
      title: 'AI is writing questions',
      detail: waiting ? 'The AI is busy. We’re still trying, please wait.' : 'This usually takes under a minute',
      ai: true,
    },
    { title: 'Checking every question', detail: 'Each question is checked against your lesson text' },
    { title: 'Ready for you to check', detail: 'It will show up in your To do list' },
  ]

  return (
    <PageBody side="R">
      <Title color="blue">Making questions</Title>
      <Sub>
        {lesson.fileName} · {lesson.topic}
      </Sub>

      <ol className={styles.steps}>
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step ? (failed ? 'failed' : 'now') : 'next'
          return (
            <li key={s.title} className={`${styles.step} ${styles[state]}`}>
              <span className={styles.stepDot} aria-hidden="true">
                {state === 'done' && <Check size={20} strokeWidth={3} />}
                {state === 'now' && <Sparkles size={18} strokeWidth={2.4} />}
                {state === 'failed' && <X size={18} strokeWidth={3} />}
              </span>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  {s.title}
                  {s.ai && (
                    <Chip tone="ai" icon={<Sparkles size={12} aria-hidden="true" />}>
                      AI
                    </Chip>
                  )}
                  {s.ai && state === 'now' && (
                    <span className={styles.elapsed}>
                      <Clock size={16} strokeWidth={2.4} aria-hidden="true" />
                      <span className="visually-hidden">Time so far: </span>
                      {clock(seconds)}
                    </span>
                  )}
                  <span className="visually-hidden">
                    {state === 'done' ? ' (done)' : state === 'now' ? ' (now)' : state === 'failed' ? ' (didn’t work)' : ''}
                  </span>
                </p>
                {state === 'failed' ? (
                  <div className={styles.failedBox} role="alert">
                    <p className={styles.failedText}>{lesson.error?.message ?? 'Something went wrong. Please try again.'}</p>
                    <div className={styles.failedActions}>
                      <Btn variant="primary" disabled={busy} tabIndex={tab} icon={<RotateCcw size={18} aria-hidden="true" />} onClick={tryAgain}>
                        Try again
                      </Btn>
                      <Btn disabled={busy} tabIndex={tab} icon={<FileUp size={18} aria-hidden="true" />} onClick={chooseAnother}>
                        Choose another file
                      </Btn>
                    </div>
                    {actionError && <p className={styles.failedError}>{actionError}</p>}
                  </div>
                ) : (
                  <p className={s.ai && waiting ? `${styles.stepDetail} ${styles.stepWaiting}` : styles.stepDetail}>{s.detail}</p>
                )}
                {s.ai && state === 'now' && (
                  <span className={styles.progress} aria-hidden="true">
                    <span className={styles.progressFill} />
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="visually-hidden" aria-live={live ? 'polite' : undefined}>
        {waiting ? 'The AI is busy. We’re still trying.' : making || failed ? '' : 'Your questions are ready to check.'}
      </p>

      {making && (
        <div className={styles.noWait}>
          <p>You don’t have to wait here. You can keep working and come back later.</p>
          <Btn tabIndex={tab} onClick={() => navigate(paths.teacher.home)}>
            Back to Home
          </Btn>
        </div>
      )}
      {!making && !failed && (
        <Btn variant="primary" className={styles.goCheck} tabIndex={tab} onClick={() => navigate(lessonStepPath(lesson.id, 'check'))}>
          Check the questions <ArrowRight size={18} aria-hidden="true" />
        </Btn>
      )}

      <OllieNote>The AI only writes drafts. Students see nothing until you check and approve each question.</OllieNote>
    </PageBody>
  )
}
