import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Clock,
  FileUp,
  Gamepad2,
  Lock,
  Package,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react'
import { paths } from '../../routes/paths'
import { useLesson, useLessons, useSection, type LessonWithCounts } from '../data/useTeacherData'
import type { FileType, GameType } from '../data/types'
import { GAME_INFO, GAME_ORDER } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { Btn, Chip, EmptyLine, FileBadge, Heading, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './Lessons.module.css'

const MAX_BYTES = 10 * 1024 * 1024
const SUBJECTS = ['Math', 'Science', 'English', 'Filipino', 'Araling Panlipunan']

// ---------- Left page: My lessons ----------

function StatusChip({ lesson }: { lesson: LessonWithCounts }) {
  switch (lesson.status) {
    case 'making':
      return (
        <Chip tone="warn" icon={<Clock size={16} aria-hidden="true" />}>
          Making…
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
      return (
        <Chip tone="info" icon={<Package size={16} aria-hidden="true" />}>
          Assigned · {lesson.assignedNote}
        </Chip>
      )
    default:
      return <Chip tone="neutral">Draft · {lesson.approved} approved</Chip>
  }
}

/** Where tapping a lesson goes (only lessons with a next step). */
const lessonLink = (l: LessonWithCounts) =>
  l.status === 'making'
    ? lessonStepPath(l.id, 'making')
    : l.status === 'toCheck'
      ? lessonStepPath(l.id, 'check')
      : l.status === 'ready'
        ? lessonStepPath(l.id, 'games')
        : null

function MyLessons({ showHowItWorks }: { showHowItWorks: boolean }) {
  const { lessons } = useLessons()
  const { active } = useSection()
  const navigate = useNavigate()

  return (
    <PageBody side="L">
      <Title>My lessons</Title>
      <Sub>
        Math · Grade {active.grade} – {active.name}
      </Sub>

      {lessons.length === 0 ? (
        <div className={styles.noLessons}>
          <strong>No lessons yet</strong>
          <span>
            Upload your first one on the right <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
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
                    {l.size} · {l.uploaded}
                  </span>
                </span>
                <StatusChip lesson={l} />
              </>
            )
            return (
              <li key={l.id} className={l.status === 'making' ? `${styles.lesson} ${styles.lessonNew}` : styles.lesson}>
                {to ? (
                  <button type="button" className={styles.lessonButton} onClick={() => navigate(to)}>
                    {inner}
                  </button>
                ) : (
                  <div className={styles.lessonButton}>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {showHowItWorks && lessons.length <= 5 && <HowItWorks />}
    </PageBody>
  )
}

export function LessonsLeft() {
  return <MyLessons showHowItWorks />
}

export function MakingLeft() {
  return <MyLessons showHowItWorks={false} />
}

function HowItWorks() {
  const steps = [
    { icon: FileUp, a: 'You upload', b: 'PDF or slides', tone: styles.howBrown },
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
            <span>{b}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- Right page: Add a lesson ----------

const typeOf = (file: File): FileType | null =>
  /\.pdf$/i.test(file.name) ? 'PDF' : /\.pptx$/i.test(file.name) ? 'PPT' : null

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** "Equivalent-Fractions-Wk3.pdf" -> "Equivalent Fractions" (a starting guess). */
const topicFromName = (name: string) =>
  name
    .replace(/\.(pdf|pptx)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(wk|week)\s*\d+\b/gi, '')
    .trim()

export function UploadRight({ live }: PageProps) {
  const navigate = useNavigate()
  const { addLesson } = useLessons()
  const inputRef = useRef<HTMLInputElement>(null)
  const ids = useId()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('Math')
  const [games, setGames] = useState<GameType[]>(['quiz', 'match', 'blank'])
  const [dragging, setDragging] = useState(false)

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!typeOf(f)) {
      setError('Please pick a PDF or PowerPoint (.pptx) file.')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`That file is ${sizeLabel(f.size)}. Please pick one up to 10 MB.`)
      return
    }
    setError('')
    setFile(f)
    if (!topic.trim()) setTopic(topicFromName(f.name))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const toggleGame = (g: GameType) =>
    setGames((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : GAME_ORDER.filter((x) => x === g || gs.includes(x))))

  const ready = !!file && topic.trim() !== '' && games.length > 0

  const make = () => {
    if (!file || !ready) return
    const type = typeOf(file) ?? 'PDF'
    // TODO: upload the file to the backend; it sends only the lesson text to the AI.
    const id = addLesson({ fileName: file.name, fileType: type, fileSize: sizeLabel(file.size), topic: topic.trim(), subject, games })
    navigate(lessonStepPath(id, 'making'))
  }

  return (
    <PageBody side="R">
      <Title color="blue">Add a lesson</Title>
      <Sub>Upload your file. KIDDEX turns it into game questions.</Sub>

      <div
        className={dragging ? `${styles.drop} ${styles.dropOver}` : styles.drop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.dropIcon} aria-hidden="true">
          <FileUp size={30} strokeWidth={2} />
        </span>
        <strong className={styles.dropTitle}>Drop your lesson file here</strong>
        <span className={styles.dropHint}>PDF or PowerPoint · up to 10 MB · typed text, not scanned photos</span>
        <Btn onClick={() => inputRef.current?.click()} tabIndex={live ? undefined : -1}>
          Choose file
        </Btn>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className={styles.fileSlot} aria-live="polite">
        {error ? (
          <p className={styles.fileError} role="alert">
            {error}
          </p>
        ) : (
          file && (
            <div className={styles.fileCard}>
              <FileBadge type={typeOf(file) ?? 'PDF'} />
              <span className={styles.lessonText}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.lessonInfo}>
                  {sizeLabel(file.size)} · {typeOf(file) === 'PPT' ? 'PowerPoint' : 'PDF'} · ready to upload
                </span>
              </span>
              <button type="button" className={styles.removeFile} aria-label={`Remove ${file.name}`} onClick={() => setFile(null)}>
                <X size={22} aria-hidden="true" />
              </button>
            </div>
          )
        )}
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Topic</span>
          <input
            className={styles.input}
            value={topic}
            placeholder="e.g. Equivalent Fractions"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <label className={`${styles.field} ${styles.fieldSmall}`}>
          <span className={styles.label}>Subject</span>
          <select className={styles.select} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.gamesBlock} role="group" aria-labelledby={`${ids}-games`}>
        <span id={`${ids}-games`} className={styles.label}>
          Games to make
        </span>
        <div className={styles.gameChips}>
          {GAME_ORDER.map((g) => {
            const on = games.includes(g)
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                className={on ? `${styles.gameChip} ${styles.gameChipOn}` : styles.gameChip}
                onClick={() => toggleGame(g)}
              >
                {on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                {GAME_INFO[g].name}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.makeRow}>
        <Btn variant="primary" className={styles.makeButton} disabled={!ready} onClick={make} icon={<Sparkles size={20} aria-hidden="true" />}>
          Make questions
        </Btn>
        <p className={styles.privacy}>
          <Lock size={16} aria-hidden="true" />
          <span>Only the lesson text is sent to the AI. No student data.</span>
        </p>
      </div>
    </PageBody>
  )
}

// ---------- Right page: Making questions ----------

/** About 4s in all: read 0.7s, drafting 2s, format 0.7s, ready 0.6s. */
const STEP_MS = [0, 700, 2000, 700, 600]
const ABOUT = 15

export function MakingRight({ lessonId, live }: PageProps) {
  const lesson = useLesson(lessonId)
  const { setMakingStep, finishMaking } = useLessons()
  const navigate = useNavigate()
  const id = lesson?.id
  const step = lesson?.makingStep ?? 5
  const making = lesson?.status === 'making'
  const [written, setWritten] = useState(0)

  // Fake progress, only on the live page (never on a turning copy).
  useEffect(() => {
    if (!live || !id || !making) return
    if (step < 4) {
      const t = window.setTimeout(() => setMakingStep(id, step + 1), STEP_MS[step])
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      finishMaking(id)
      navigate(lessonStepPath(id, 'check'))
    }, STEP_MS[4])
    return () => window.clearTimeout(t)
  }, [live, id, making, step, setMakingStep, finishMaking, navigate])

  // "N of about 15 written" ticks up while the AI drafts.
  useEffect(() => {
    if (!live || step !== 2) return
    const t = window.setInterval(() => setWritten((n) => Math.min(ABOUT, n + 1)), STEP_MS[2] / ABOUT)
    return () => window.clearInterval(t)
  }, [live, step])

  if (!lesson) {
    return (
      <PageBody side="R">
        <Title color="blue">Making questions</Title>
        <EmptyLine action={<Btn onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>}>
          This lesson isn’t here anymore.
        </EmptyLine>
      </PageBody>
    )
  }

  const shown = step > 2 ? ABOUT : written
  const steps = [
    { title: 'File uploaded', detail: `${lesson.fileSize ?? lesson.size} · ${lesson.fileType}` },
    { title: 'Read the lesson text', detail: lesson.size },
    { title: 'AI is drafting questions', detail: `${shown} of about ${ABOUT} written`, ai: true },
    { title: 'Checking the format', detail: 'Every question needs one right answer' },
    { title: 'Ready for you to check', detail: 'We’ll add it to your To do list' },
  ]

  return (
    <PageBody side="R">
      <Title color="blue">Making questions</Title>
      <Sub>
        {lesson.fileName} · {lesson.topic}
      </Sub>

      <ol className={styles.steps} aria-live={live ? 'polite' : undefined}>
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step && making ? 'now' : 'next'
          return (
            <li key={s.title} className={`${styles.step} ${styles[state]}`}>
              <span className={styles.stepDot} aria-hidden="true">
                {state === 'done' && <Check size={20} strokeWidth={3} />}
                {state === 'now' && <Sparkles size={18} strokeWidth={2.4} />}
              </span>
              <div>
                <p className={styles.stepTitle}>
                  {s.title}
                  {s.ai && (
                    <Chip tone="ai" icon={<Sparkles size={12} aria-hidden="true" />}>
                      AI
                    </Chip>
                  )}
                  <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'now' ? ' (now)' : ''}</span>
                </p>
                <p className={styles.stepDetail}>{s.detail}</p>
                {s.ai && state === 'now' && (
                  <span className={styles.progress} aria-hidden="true">
                    <span className={styles.progressFill} style={{ width: `${(shown / ABOUT) * 100}%` }} />
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {!making && (
        <Btn variant="primary" className={styles.goCheck} onClick={() => navigate(lessonStepPath(lesson.id, 'check'))}>
          Check the questions <ArrowRight size={18} aria-hidden="true" />
        </Btn>
      )}

      <OllieNote>The AI only writes drafts. Students see nothing until you check and approve each question.</OllieNote>
    </PageBody>
  )
}
