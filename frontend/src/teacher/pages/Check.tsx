import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileText, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { paths } from '../../routes/paths'
import { useDrafts, useLesson, useTopics } from '../data/useTeacherData'
import type { Draft, Level } from '../data/types'
import { GAME_INFO } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { Btn, Chip, EmptyLine, PageBody, Pills, Title } from '../planner/ui'
import styles from './Check.module.css'

type Filter = 'all' | 'toCheck' | 'approved'
const ROW_H = 50
const VISIBLE_ROWS = 10

/** The question shown in the editor: ?q=<id>, else the first one still to check. */
function useSelected(lessonId: string | undefined, query: URLSearchParams) {
  const { drafts } = useDrafts(lessonId)
  const asked = drafts.find((q) => q.id === query.get('q'))
  return asked ?? drafts.find((q) => q.status === 'toCheck') ?? drafts[0]
}

/** Goes to another question without a page turn (only the ?q= changes). */
function useSelect(lessonId: string | undefined) {
  const navigate = useNavigate()
  return (id: string) => lessonId && navigate(`${lessonStepPath(lessonId, 'check')}?q=${id}`, { replace: true })
}

const BackToLessons = ({ live }: { live: boolean }) => {
  const navigate = useNavigate()
  return (
    <Btn variant="link" className={styles.back} tabIndex={live ? undefined : -1} onClick={() => navigate(paths.teacher.lessons)}>
      <ArrowLeft size={16} aria-hidden="true" /> My lessons
    </Btn>
  )
}

// ---------- Left page: the question list ----------

export function CheckLeft({ lessonId, query, live }: PageProps) {
  const lesson = useLesson(lessonId)
  const { drafts, addDraft } = useDrafts(lessonId)
  const selected = useSelected(lessonId, query)
  const select = useSelect(lessonId)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLOListElement>(null)
  const [below, setBelow] = useState<number | null>(null)

  // Keep the chosen question in view.
  const selectedId = selected?.id
  useEffect(() => {
    if (!live || !selectedId) return
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [live, selectedId, filter])

  if (!lesson || drafts.length === 0) {
    return (
      <PageBody side="L">
        <BackToLessons live={live} />
        <Title>Check the questions</Title>
        <EmptyLine action={<Btn onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>}>
          {lesson ? 'This lesson has no questions to check yet.' : 'This lesson isn’t here anymore.'}
        </EmptyLine>
      </PageBody>
    )
  }

  const approved = drafts.filter((q) => q.status === 'approved').length
  const toCheck = drafts.length - approved
  const shown = drafts.filter((q) => filter === 'all' || q.status === filter)
  const moreBelow = below ?? Math.max(0, shown.length - VISIBLE_ROWS)

  return (
    <PageBody side="L">
      <BackToLessons live={live} />
      <Title>Check the questions</Title>
      <p className={styles.from}>
        {lesson.title} · drafted by AI{' '}
        <Chip tone="ai" icon={<Sparkles size={12} aria-hidden="true" />}>
          AI
        </Chip>
      </p>

      <div className={styles.progressRow}>
        <strong>
          {approved} of {drafts.length} approved
        </strong>
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${(approved / drafts.length) * 100}%` }} />
        </span>
      </div>

      <div className={styles.pills}>
        <Pills
          label="Show"
          value={filter}
          onChange={(f) => {
            setFilter(f)
            setBelow(null)
          }}
          items={[
            { value: 'all', label: `All ${drafts.length}` },
            { value: 'toCheck', label: `To check ${toCheck}` },
            { value: 'approved', label: `Approved ${approved}` },
          ]}
        />
      </div>

      <ol
        ref={listRef}
        className={styles.list}
        style={{ maxHeight: ROW_H * VISIBLE_ROWS }}
        onScroll={(e) => {
          const el = e.currentTarget
          setBelow(Math.max(0, Math.round((el.scrollHeight - el.scrollTop - el.clientHeight) / ROW_H)))
        }}
      >
        {shown.map((q) => {
          const n = drafts.indexOf(q) + 1
          const on = q.id === selected?.id
          return (
            <li key={q.id} data-id={q.id}>
              <button
                type="button"
                className={on ? `${styles.row} ${styles.rowOn}` : styles.row}
                aria-current={on ? 'true' : undefined}
                onClick={() => select(q.id)}
              >
                <span className={styles.num}>{n}</span>
                <span className={styles.text}>{q.text || 'Your own question'}</span>
                <span className={styles.gameTag}>{GAME_INFO[q.game].tag}</span>
                <StatusDot draft={q} />
              </button>
            </li>
          )
        })}
      </ol>

      <div className={styles.listFoot}>
        <Btn
          variant="link"
          onClick={() => {
            setFilter('all')
            const id = addDraft()
            if (id) select(id)
          }}
        >
          <Plus size={18} aria-hidden="true" /> Add my own question
        </Btn>
        {moreBelow > 0 && <span className={styles.more}>+{moreBelow} more below</span>}
      </div>
    </PageBody>
  )
}

function StatusDot({ draft }: { draft: Draft }) {
  if (draft.status === 'approved') {
    return (
      <span className={`${styles.dot} ${styles.dotOk}`}>
        <Check size={17} strokeWidth={3} aria-hidden="true" />
        <span className="visually-hidden">approved</span>
      </span>
    )
  }
  if (draft.edited) {
    return (
      <span className={`${styles.dot} ${styles.dotEdited}`}>
        <Pencil size={14} strokeWidth={2.6} aria-hidden="true" />
        <span className="visually-hidden">edited, to check</span>
      </span>
    )
  }
  return (
    <span className={styles.dot}>
      <span className="visually-hidden">to check</span>
    </span>
  )
}

// ---------- Right page: the editor ----------

const LEVELS: { value: Level; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function CheckRight({ lessonId, query }: PageProps) {
  const { drafts, updateDraft, deleteDraft } = useDrafts(lessonId)
  const topics = useTopics()
  const q = useSelected(lessonId, query)
  const select = useSelect(lessonId)
  const navigate = useNavigate()
  const ids = useId()

  if (!q || !lessonId) {
    return (
      <PageBody side="R">
        <EmptyLine>Pick a lesson with questions to check.</EmptyLine>
      </PageBody>
    )
  }

  const number = drafts.indexOf(q) + 1
  const edit = (patch: Partial<Draft>) => updateDraft(q.id, { ...patch, edited: true })
  const complete = q.text.trim() !== '' && q.choices.every((c) => c.trim() !== '')

  /** The next question still to check after this one (wrapping around). */
  const nextToCheck = (skipId: string) => {
    const i = drafts.findIndex((d) => d.id === skipId)
    const order = [...drafts.slice(i + 1), ...drafts.slice(0, i)]
    return order.find((d) => d.status === 'toCheck')
  }

  const approve = () => {
    updateDraft(q.id, { status: 'approved' })
    const next = nextToCheck(q.id)
    if (next) select(next.id)
    else navigate(lessonStepPath(lessonId, 'games'))
  }

  const skip = () => {
    const next = nextToCheck(q.id) ?? drafts[(number % drafts.length)]
    if (next && next.id !== q.id) select(next.id)
  }

  const remove = () => {
    const next = nextToCheck(q.id) ?? drafts.find((d) => d.id !== q.id)
    deleteDraft(q.id)
    if (next) select(next.id)
  }

  // The quote, with the words the question came from highlighted.
  const { quote, highlight } = q.source
  const at = highlight ? quote.indexOf(highlight) : -1
  const before = at >= 0 ? quote.slice(0, at) : quote
  const after = at >= 0 ? quote.slice(at + highlight.length) : ''

  return (
    <PageBody side="R">
      <div className={styles.head}>
        <h2 className={styles.qTitle}>Question {number}</h2>
        {q.status === 'approved' ? <Chip tone="ok">Approved</Chip> : <Chip tone="warn">To check</Chip>}
        <span className={styles.game}>
          Game: <strong>{GAME_INFO[q.game].name}</strong>
        </span>
      </div>

      <label className={styles.label} htmlFor={`${ids}-q`}>
        Question
      </label>
      <textarea
        id={`${ids}-q`}
        className={styles.question}
        rows={2}
        value={q.text}
        placeholder="Type your question"
        onChange={(e) => edit({ text: e.target.value })}
      />

      <p className={styles.label} id={`${ids}-choices`}>
        Choices <span className={styles.labelHint}>· tap the right answer</span>
      </p>
      <div className={styles.choices} role="radiogroup" aria-labelledby={`${ids}-choices`}>
        {q.choices.map((c, i) => {
          const right = i === q.right
          return (
            <div
              key={i}
              className={right ? `${styles.choice} ${styles.choiceRight}` : styles.choice}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') edit({ right: i })
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={right}
                aria-label={`Choice ${i + 1} is the right answer`}
                className={styles.radio}
                onClick={() => edit({ right: i })}
              >
                {right && <Check size={16} strokeWidth={3.2} aria-hidden="true" />}
              </button>
              <input
                className={styles.choiceInput}
                value={c}
                aria-label={`Choice ${i + 1}`}
                placeholder={`Choice ${i + 1}`}
                onChange={(e) => edit({ choices: q.choices.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              {right && <span className={styles.rightTag}>Right</span>}
            </div>
          )
        })}
      </div>

      <div className={styles.meta}>
        <label className={styles.metaField}>
          <span className={styles.label}>Topic</span>
          <select className={styles.select} value={q.topic} onChange={(e) => edit({ topic: e.target.value })}>
            {[...new Set([q.topic, ...topics])].filter(Boolean).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className={styles.metaField} role="group" aria-labelledby={`${ids}-level`}>
          <span className={styles.label} id={`${ids}-level`}>
            Level
          </span>
          <div className={styles.levels}>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={q.level === l.value}
                className={q.level === l.value ? `${styles.level} ${styles.levelOn}` : styles.level}
                onClick={() => edit({ level: l.value })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {q.source.page > 0 ? (
        <figure className={styles.source}>
          <span className={styles.sourceTape} aria-hidden="true" />
          <figcaption className={styles.sourceTitle}>
            <FileText size={15} aria-hidden="true" /> From your lesson · page {q.source.page}
          </figcaption>
          <blockquote className={styles.quote}>
            “{before}
            {at >= 0 && <mark className={styles.mark}>{highlight}</mark>}
            {after}”
          </blockquote>
        </figure>
      ) : (
        <p className={styles.own}>Your own question: no lesson quote.</p>
      )}

      <div className={styles.actions}>
        <Btn variant="danger" icon={<Trash2 size={18} aria-hidden="true" />} onClick={remove}>
          Delete
        </Btn>
        <Btn onClick={skip}>Skip</Btn>
        <Btn
          variant="green"
          className={styles.approve}
          disabled={!complete}
          icon={<Check size={20} strokeWidth={3} aria-hidden="true" />}
          onClick={approve}
        >
          {q.status === 'approved' ? 'Keep · next' : 'Approve · next'}
        </Btn>
      </div>
    </PageBody>
  )
}
