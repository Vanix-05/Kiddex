import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock, FileUp, Gamepad2, Lock, Package, Pencil, Sparkles, TriangleAlert, X } from 'lucide-react'
import { paths } from '../../routes/paths'
import { fakeFileFacts, MAKING_MS, useLesson, useLessons, useSection, type LessonWithCounts } from '../data/useTeacherData'
import type { FileType, TemplateId } from '../data/types'
import { GAME_INFO, GAME_ORDER, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { Btn, Chip, EmptyLine, FileBadge, Heading, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './Lessons.module.css'

const MAX_BYTES = 10 * 1024 * 1024
const SUBJECTS = ['Math', 'Science', 'English', 'Filipino', 'Araling Panlipunan']

/** "Word" for DOC, "PowerPoint" for PPT. */
const TYPE_NAME: Record<FileType, string> = { PDF: 'PDF', PPT: 'PowerPoint', DOC: 'Word' }

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

const typeOf = (file: File): FileType | null =>
  /\.pdf$/i.test(file.name) ? 'PDF' : /\.pptx$/i.test(file.name) ? 'PPT' : /\.docx$/i.test(file.name) ? 'DOC' : null

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** A friendly line for a file KIDDEX can't use, or '' if it's fine. */
function fileProblem(file: File): string {
  if (!typeOf(file)) {
    const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? ''
    if (['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp', 'bmp'].includes(ext)) {
      return 'That’s a photo. KIDDEX needs typed text: please pick a PDF, PowerPoint or Word file.'
    }
    if (ext === 'ppt' || ext === 'doc') {
      return `That’s an older .${ext} file. Please save it as .${ext}x and try again.`
    }
    return 'KIDDEX can read PDF, PowerPoint (.pptx) and Word (.docx) files. Please pick one of those.'
  }
  if (file.size === 0) return 'That file is empty. Please pick another one.'
  if (file.size > MAX_BYTES) return `That file is ${sizeLabel(file.size)}. Please pick one up to 10 MB.`
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

export function UploadRight({ live }: PageProps) {
  const navigate = useNavigate()
  const { addLesson } = useLessons()
  const inputRef = useRef<HTMLInputElement>(null)
  const ids = useId()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('Math')
  const [games, setGames] = useState<TemplateId[]>(GAME_ORDER)
  const [dragging, setDragging] = useState(false)
  const tab = live ? undefined : -1

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = fileProblem(f)
    setError(problem)
    if (problem) return
    setFile(f)
    setTopic(topicFromName(f.name))
  }

  const dropProps = {
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

  /** At least one game stays on. */
  const toggleGame = (g: TemplateId) =>
    setGames((gs) => (gs.includes(g) ? (gs.length > 1 ? gs.filter((x) => x !== g) : gs) : GAME_ORDER.filter((x) => x === g || gs.includes(x))))

  const type = file ? typeOf(file) : null
  const ready = !!file && !!type && topic.trim() !== '' && games.length > 0

  const make = () => {
    if (!file || !type || !ready) return
    // TODO: upload the file to the backend; it sends only the lesson text to the AI.
    const id = addLesson({ fileName: file.name, fileType: type, fileSize: sizeLabel(file.size), topic: topic.trim(), subject, games })
    navigate(lessonStepPath(id, 'making'))
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

  return (
    <PageBody side="R">
      <Title color="blue">Add a lesson</Title>
      <Sub>Turn your lesson into games in 3 easy steps.</Sub>
      <UploadSteps current={file ? 1 : 0} />
      {fileInput}

      {!file || !type ? (
        <>
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
            <Btn variant="primary" className={styles.choose} icon={<FileUp size={22} aria-hidden="true" />} tabIndex={tab} onClick={() => inputRef.current?.click()}>
              Choose a file
            </Btn>
            <span className={styles.dropSlot} aria-live="polite">
              {error ? (
                <span className={styles.dropError} role="alert">
                  <TriangleAlert size={17} aria-hidden="true" />
                  {error}
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
        </>
      ) : (
        <>
          <div className={dragging ? `${styles.gotIt} ${styles.dropOver}` : styles.gotIt} {...dropProps}>
            <FileBadge type={type} />
            <span className={styles.lessonText}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.gotItLine}>
                <Check size={17} strokeWidth={3} aria-hidden="true" /> Got it! {fakeFileFacts(type).size} · {fakeFileFacts(type).words.toLocaleString()} words
              </span>
            </span>
            <Btn variant="link" className={styles.change} tabIndex={tab} onClick={() => inputRef.current?.click()}>
              Change
            </Btn>
          </div>
          {error && (
            <p className={styles.changeError} role="alert">
              <TriangleAlert size={16} aria-hidden="true" /> {error}
            </p>
          )}

          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.label}>What is this lesson about?</span>
              <input className={styles.input} value={topic} placeholder="e.g. Equivalent Fractions" tabIndex={tab} onChange={(e) => setTopic(e.target.value)} />
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
            <span id={`${ids}-games`} className={styles.label}>
              Which games? <span className={styles.labelHint}>· pick one or more</span>
            </span>
            <div className={styles.gamePics}>
              {GAME_ORDER.map((g) => {
                const on = games.includes(g)
                const last = on && games.length === 1
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    title={last ? 'Pick at least one game' : undefined}
                    tabIndex={tab}
                    className={on ? `${styles.gamePic} ${styles.gamePicOn}` : styles.gamePic}
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

          <Btn variant="primary" className={styles.makeButton} disabled={!ready} tabIndex={tab} onClick={make} icon={<Sparkles size={24} aria-hidden="true" />}>
            Make questions
          </Btn>
          <p className={styles.takes}>Takes about a minute. You check every question before students see it.</p>
          {privacy}
        </>
      )}
    </PageBody>
  )
}

// ---------- Right page: Making questions ----------

/** FAKE timing of the steps, in ms after the upload (the whole run is MAKING_MS). */
const READ_DONE = 800
const WRITE_DONE = MAKING_MS - 1000

/** "0:32" */
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function MakingRight({ lessonId, live }: PageProps) {
  const lesson = useLesson(lessonId)
  const navigate = useNavigate()
  const making = lesson?.status === 'making'
  const [now, setNow] = useState(() => Date.now())

  // The elapsed timer ticks on the live page only (never on a turning copy).
  useEffect(() => {
    if (!live || !making) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [live, making])

  // Done while the Teacher is still here: turn to Check by itself.
  const wasMaking = useRef(making)
  useEffect(() => {
    if (live && wasMaking.current && !making && lesson) navigate(lessonStepPath(lesson.id, 'check'))
    wasMaking.current = making
  }, [live, making, lesson, navigate])

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

  const elapsed = now - (lesson.makingStartedAt ?? now)
  // Which step is happening (0–4); 5 = all done.
  const step = !making ? 5 : elapsed < READ_DONE ? 1 : elapsed < WRITE_DONE ? 2 : 3
  const facts = fakeFileFacts(lesson.fileType)
  const steps = [
    { title: 'File uploaded', detail: `${TYPE_NAME[lesson.fileType]} · ${lesson.fileSize ?? lesson.size}` },
    { title: 'Read the lesson text', detail: `${lesson.size} · ${facts.words.toLocaleString()} words` },
    { title: 'AI is writing questions', detail: 'This usually takes under a minute', ai: true },
    { title: 'Checking every question', detail: 'A broken question gets written again by itself' },
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
          const state = i < step ? 'done' : i === step ? 'now' : 'next'
          return (
            <li key={s.title} className={`${styles.step} ${styles[state]}`}>
              <span className={styles.stepDot} aria-hidden="true">
                {state === 'done' && <Check size={20} strokeWidth={3} />}
                {state === 'now' && <Sparkles size={18} strokeWidth={2.4} />}
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
                      {clock(elapsed)}
                    </span>
                  )}
                  <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'now' ? ' (now)' : ''}</span>
                </p>
                <p className={styles.stepDetail}>{s.detail}</p>
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
        {making ? '' : 'Your questions are ready to check.'}
      </p>

      {making ? (
        <div className={styles.noWait}>
          <p>You don’t have to wait here. You can keep working and come back later.</p>
          <Btn tabIndex={live ? undefined : -1} onClick={() => navigate(paths.teacher.home)}>
            Back to Home
          </Btn>
        </div>
      ) : (
        <Btn variant="primary" className={styles.goCheck} onClick={() => navigate(lessonStepPath(lesson.id, 'check'))}>
          Check the questions <ArrowRight size={18} aria-hidden="true" />
        </Btn>
      )}

      <OllieNote>The AI only writes drafts. Students see nothing until you check and approve each question.</OllieNote>
    </PageBody>
  )
}
