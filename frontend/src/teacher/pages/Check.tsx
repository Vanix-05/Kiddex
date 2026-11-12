import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FileText, Link2, Pencil, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react'
import { MIN_CARDS, QuestionCardSchema, TEMPLATE_FOR_TYPE } from '../../content/questionCard'
import { paths } from '../../routes/paths'
import { useCards, useLesson, useTopics } from '../data/useTeacherData'
import type { Level, QuestionCard, TemplateId } from '../data/types'
import { GAME_ICON, GAME_INFO, GAME_ORDER } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { Btn, Chip, EmptyLine, PageBody, Pills, Title } from '../planner/ui'
import styles from './Check.module.css'

type Filter = 'all' | 'toCheck' | 'approved'
const ROW_H = 50
const VISIBLE_ROWS = 10

const gameOf = (c: QuestionCard) => TEMPLATE_FOR_TYPE[c.type]

/** ?game=match-up: the list shows only that game (from "Check pairs" on the Games page). */
const gameFilter = (query: URLSearchParams): TemplateId | null => {
  const g = query.get('game')
  return GAME_ORDER.find((x) => x === g) ?? null
}

/** The card shown in the editor: ?q=<id>, else the first one still to check (of the ?game=, if any). */
function useSelected(lessonId: string | undefined, query: URLSearchParams) {
  const { cards } = useCards(lessonId)
  const game = gameFilter(query)
  const asked = cards.find((c) => c.id === query.get('q'))
  const inGame = cards.filter((c) => !game || gameOf(c) === game)
  return asked ?? inGame.find((c) => c.status === 'draft') ?? inGame[0] ?? cards.find((c) => c.status === 'draft') ?? cards[0]
}

/** Goes to another card without a page turn (only the query changes). Keeps ?game=. */
function useSelect(lessonId: string | undefined, query: URLSearchParams) {
  const navigate = useNavigate()
  const game = gameFilter(query)
  return (id: string | null, nextGame: TemplateId | null = game) => {
    if (!lessonId) return
    const q = new URLSearchParams()
    if (nextGame) q.set('game', nextGame)
    if (id) q.set('q', id)
    const search = q.toString()
    navigate(`${lessonStepPath(lessonId, 'check')}${search ? `?${search}` : ''}`, { replace: true })
  }
}

const BackToLessons = ({ live }: { live: boolean }) => {
  const navigate = useNavigate()
  return (
    <Btn variant="link" className={styles.back} tabIndex={live ? undefined : -1} onClick={() => navigate(paths.teacher.lessons)}>
      <ArrowLeft size={16} aria-hidden="true" /> My lessons
    </Btn>
  )
}

/** The game's small tag in its color: Quiz orange, Match blue, Blank green. */
function GameTag({ game, big }: { game: TemplateId; big?: boolean }) {
  const info = GAME_INFO[game]
  if (!big) return <span className={`${styles.gameTag} ${styles[`tone_${info.tone}`]}`}>{info.tag}</span>
  const Icon = GAME_ICON[game]
  return (
    <span className={`${styles.gameChip} ${styles[`tone_${info.tone}`]}`}>
      <Icon size={17} strokeWidth={2.4} aria-hidden="true" />
      {info.name}
    </span>
  )
}

/** How a card reads in the list: pairs as "Match: 2/4 → 1/2". */
const rowText = (c: QuestionCard) =>
  c.type === 'matching_pair' ? (c.prompt || c.answer ? `Match: ${c.prompt} → ${c.answer}` : 'Your own pair') : c.prompt || 'Your own question'

// ---------- Left page: the question list ----------

export function CheckLeft({ lessonId, query, live }: PageProps) {
  const lesson = useLesson(lessonId)
  const { cards, isEdited, addCard } = useCards(lessonId)
  const selected = useSelected(lessonId, query)
  const select = useSelect(lessonId, query)
  const navigate = useNavigate()
  const game = gameFilter(query)
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLOListElement>(null)
  const [below, setBelow] = useState<number | null>(null)

  // Keep the chosen card in view.
  const selectedId = selected?.id
  useEffect(() => {
    if (!live || !selectedId) return
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [live, selectedId, filter, game])

  if (!lesson || cards.length === 0) {
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

  const approved = cards.filter((c) => c.status === 'approved').length
  const toCheck = cards.length - approved
  const shown = cards.filter(
    (c) => (!game || gameOf(c) === game) && (filter === 'all' || (filter === 'approved' ? c.status === 'approved' : c.status === 'draft')),
  )
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
          {approved} of {cards.length} approved
        </strong>
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${(approved / cards.length) * 100}%` }} />
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
            { value: 'all', label: `All ${cards.length}` },
            { value: 'toCheck', label: `To check ${toCheck}` },
            { value: 'approved', label: `Approved ${approved}` },
          ]}
        />
        {game && (
          <button
            type="button"
            className={`${styles.onlyGame} ${styles[`tone_${GAME_INFO[game].tone}`]}`}
            onClick={() => {
              setBelow(null)
              select(selectedId ?? null, null)
            }}
          >
            Only {GAME_INFO[game].name}
            <X size={15} strokeWidth={3} aria-hidden="true" />
            <span className="visually-hidden">(show all games)</span>
          </button>
        )}
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
        {shown.map((c) => {
          const n = cards.indexOf(c) + 1
          const on = c.id === selected?.id
          return (
            <li key={c.id} data-id={c.id}>
              <button
                type="button"
                className={on ? `${styles.row} ${styles.rowOn}` : styles.row}
                aria-current={on ? 'true' : undefined}
                onClick={() => select(c.id)}
              >
                <span className={styles.num}>{n}</span>
                <span className={styles.text}>{rowText(c)}</span>
                <GameTag game={gameOf(c)} />
                <StatusDot card={c} edited={isEdited(c.id)} />
              </button>
            </li>
          )
        })}
        {shown.length === 0 && <li className={styles.noneShown}>Nothing here.</li>}
      </ol>

      <div className={styles.listFoot}>
        <Btn
          variant="link"
          onClick={() => {
            setFilter('all')
            const id = addCard()
            if (id) select(id, null)
          }}
        >
          <Plus size={18} aria-hidden="true" /> Add my own question
        </Btn>
        {moreBelow > 0 && <span className={styles.more}>+{moreBelow} more below</span>}
      </div>
    </PageBody>
  )
}

function StatusDot({ card, edited }: { card: QuestionCard; edited: boolean }) {
  if (card.status === 'approved') {
    return (
      <span className={`${styles.dot} ${styles.dotOk}`}>
        <Check size={17} strokeWidth={3} aria-hidden="true" />
        <span className="visually-hidden">approved</span>
      </span>
    )
  }
  if (edited) {
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

/** Same as the schema: case and spaces don't count. */
const same = (a: string, b: string) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase()

/**
 * Checks a card with QuestionCardSchema. Returns one short, friendly line for
 * the first problem, or '' if the card is fine.
 */
function problemWith(card: QuestionCard): string {
  const result = QuestionCardSchema.safeParse(card)
  if (result.success) return ''
  const blank = card.type === 'fill_blank'
  const pair = card.type === 'matching_pair'
  const lines = result.error.issues.map((issue) => {
    const [field] = issue.path
    if (field === 'prompt') {
      if (issue.message.includes('___')) return [1, 'Put ___ in the sentence'] as const
      return [0, pair ? 'Fill in the left side' : blank ? 'Write the sentence' : 'Type the question'] as const
    }
    if (field === 'choices' && issue.path.length > 1) return [2, blank ? 'Fill in every word in the word bank' : 'Fill in every choice'] as const
    if (field === 'choices' && issue.message === 'choices repeat') return [3, blank ? 'Words must be different' : 'Choices must be different'] as const
    if (field === 'choices' && pair) return [3, 'A pair has no choices'] as const
    if (field === 'choices') return [3, blank ? 'The word bank needs 2 to 4 words' : 'A question needs 2 to 4 choices'] as const
    if (field === 'answer') return [4, pair ? 'Fill in the right side' : 'Pick the right answer'] as const
    if (field === 'topic') return [5, 'Pick a topic'] as const
    return [6, 'Something in this question isn’t right yet'] as const
  })
  return lines.sort((a, b) => a[0] - b[0])[0][1]
}

export function CheckRight({ lessonId, query, live }: PageProps) {
  const { cards, quoteFor, editCard, approveCard, deleteCard } = useCards(lessonId)
  const topics = useTopics()
  const c = useSelected(lessonId, query)
  const select = useSelect(lessonId, query)
  const navigate = useNavigate()
  const ids = useId()
  const [problem, setProblem] = useState<{ id: string; text: string } | null>(null)
  const tab = live ? undefined : -1

  if (!c || !lessonId) {
    return (
      <PageBody side="R">
        <EmptyLine>Pick a lesson with questions to check.</EmptyLine>
      </PageBody>
    )
  }

  const number = cards.indexOf(c) + 1
  const game = gameOf(c)
  const edit = (patch: Partial<QuestionCard>) => {
    setProblem(null)
    editCard(c.id, patch)
  }

  /** The next card still to check after this one (wrapping around). */
  const nextToCheck = (skipId: string) => {
    const i = cards.findIndex((d) => d.id === skipId)
    const order = [...cards.slice(i + 1), ...cards.slice(0, i)]
    return order.find((d) => d.status === 'draft')
  }

  const approve = () => {
    const text = problemWith(c)
    if (text) {
      setProblem({ id: c.id, text })
      return
    }
    approveCard(c.id)
    const next = nextToCheck(c.id)
    if (next) select(next.id)
    else navigate(lessonStepPath(lessonId, 'games'))
  }

  const skip = () => {
    const next = nextToCheck(c.id) ?? cards[number % cards.length]
    if (next && next.id !== c.id) select(next.id)
  }

  const remove = () => {
    const next = nextToCheck(c.id) ?? cards.find((d) => d.id !== c.id)
    deleteCard(c.id)
    if (next) select(next.id)
  }

  const quote = quoteFor(c.id)
  const shownProblem = problem?.id === c.id ? problem.text : ''

  return (
    <PageBody side="R">
      <div className={styles.head}>
        <h2 className={styles.qTitle}>Question {number}</h2>
        {c.status === 'approved' ? <Chip tone="ok">Approved</Chip> : <Chip tone="warn">To check</Chip>}
        <span className={styles.headGame}>
          <GameTag game={game} big />
        </span>
      </div>

      {c.type === 'multiple_choice' && <QuizEditor card={c} edit={edit} ids={ids} tab={tab} />}
      {c.type === 'fill_blank' && <BlankEditor card={c} edit={edit} ids={ids} tab={tab} />}
      {c.type === 'matching_pair' && <PairEditor card={c} cards={cards} edit={edit} ids={ids} tab={tab} onPick={select} />}

      <div className={styles.meta}>
        <label className={styles.metaField}>
          <span className={styles.label}>Topic</span>
          <select className={styles.select} value={c.topic} tabIndex={tab} onChange={(e) => edit({ topic: e.target.value })}>
            {[...new Set([c.topic, ...topics])].filter(Boolean).map((t) => (
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
                aria-pressed={c.level === l.value}
                tabIndex={tab}
                className={c.level === l.value ? `${styles.level} ${styles.levelOn}` : styles.level}
                onClick={() => edit({ level: l.value })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {c.type !== 'matching_pair' && (
        <>
          <label className={styles.label} htmlFor={`${ids}-why`}>
            Why it’s right <span className={styles.labelHint}>· students see this after they answer</span>
          </label>
          <textarea
            id={`${ids}-why`}
            className={styles.why}
            rows={2}
            value={c.explanation ?? ''}
            placeholder="One short sentence from the lesson"
            tabIndex={tab}
            onChange={(e) => edit({ explanation: e.target.value })}
          />
        </>
      )}

      {quote && c.sourcePage ? (
        <Quote page={c.sourcePage} quote={quote.quote} highlight={quote.highlight} />
      ) : (
        <p className={styles.own}>Your own question: no lesson quote.</p>
      )}

      <p className={styles.problem} role="alert">
        {shownProblem && (
          <>
            <TriangleAlert size={17} aria-hidden="true" /> {shownProblem}
          </>
        )}
      </p>

      <div className={styles.actions}>
        <Btn variant="danger" icon={<Trash2 size={18} aria-hidden="true" />} tabIndex={tab} onClick={remove}>
          Delete
        </Btn>
        <Btn tabIndex={tab} onClick={skip}>
          Skip
        </Btn>
        <Btn variant="green" className={styles.approve} tabIndex={tab} icon={<Check size={20} strokeWidth={3} aria-hidden="true" />} onClick={approve}>
          {c.status === 'approved' ? 'Keep · next' : 'Approve · next'}
        </Btn>
      </div>
    </PageBody>
  )
}

interface EditorProps {
  card: QuestionCard
  edit: (patch: Partial<QuestionCard>) => void
  ids: string
  tab: number | undefined
}

/** Choices / word bank: tap one to make it the right answer. Editing the right one keeps it right. */
function AnswerPicker({ card, edit, ids, tab, label, hint, columns }: EditorProps & { label: string; hint: string; columns: number }) {
  const right = card.choices.findIndex((x) => card.answer.trim() !== '' && same(x, card.answer))
  const choose = (i: number) => edit({ answer: card.choices[i] })
  return (
    <>
      <p className={styles.label} id={`${ids}-choices`}>
        {label} <span className={styles.labelHint}>· {hint}</span>
      </p>
      <div className={styles.choices} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} role="radiogroup" aria-labelledby={`${ids}-choices`}>
        {card.choices.map((x, i) => {
          const on = i === right
          return (
            <div
              key={i}
              className={on ? `${styles.choice} ${styles.choiceRight}` : styles.choice}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') choose(i)
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${label} ${i + 1} is the right answer`}
                className={styles.radio}
                tabIndex={tab}
                onClick={() => choose(i)}
              >
                {on && <Check size={16} strokeWidth={3.2} aria-hidden="true" />}
              </button>
              <input
                className={styles.choiceInput}
                value={x}
                aria-label={`${label} ${i + 1}`}
                placeholder={`${i + 1}`}
                tabIndex={tab}
                onChange={(e) =>
                  edit({ choices: card.choices.map((y, j) => (j === i ? e.target.value : y)), ...(on ? { answer: e.target.value } : {}) })
                }
              />
              {on && <span className={styles.rightTag}>Right</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}

function QuizEditor(props: EditorProps) {
  const { card, edit, ids, tab } = props
  return (
    <>
      <label className={styles.label} htmlFor={`${ids}-q`}>
        Question
      </label>
      <textarea
        id={`${ids}-q`}
        className={styles.question}
        rows={2}
        value={card.prompt}
        placeholder="Type your question"
        tabIndex={tab}
        onChange={(e) => edit({ prompt: e.target.value })}
      />
      <AnswerPicker {...props} label="Choices" hint="tap the right answer" columns={2} />
    </>
  )
}

function BlankEditor(props: EditorProps) {
  const { card, edit, ids, tab } = props
  const back = useRef<HTMLDivElement>(null)
  const n = card.choices.length
  return (
    <>
      <label className={styles.label} htmlFor={`${ids}-q`}>
        Sentence <span className={styles.labelHint}>· put ___ where the missing word goes</span>
      </label>
      {/* The ___ is highlighted by a copy of the text drawn behind the (see-through) box. */}
      <div className={styles.sentence}>
        <div ref={back} className={styles.sentenceBack} aria-hidden="true">
          {card.prompt.split(/(_{2,})/).map((part, i) =>
            /^_{2,}$/.test(part) ? (
              <mark key={i} className={styles.blank}>
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
          {'\n'}
        </div>
        <textarea
          id={`${ids}-q`}
          className={`${styles.question} ${styles.sentenceInput}`}
          rows={2}
          value={card.prompt}
          placeholder="Type a sentence with ___"
          tabIndex={tab}
          onScroll={(e) => {
            if (back.current) back.current.scrollTop = e.currentTarget.scrollTop
          }}
          onChange={(e) => edit({ prompt: e.target.value })}
        />
      </div>
      <AnswerPicker {...props} label="Word bank" hint={`${n} word${n === 1 ? '' : 's'}, tap the right one`} columns={Math.min(Math.max(n, 2), 4)} />
    </>
  )
}

function PairEditor({ card, cards, edit, ids, tab, onPick }: EditorProps & { cards: QuestionCard[]; onPick: (id: string) => void }) {
  const pairs = cards.filter((c) => c.type === 'matching_pair')
  const approved = pairs.filter((c) => c.status === 'approved').length
  const need = MIN_CARDS['match-up']
  return (
    <>
      <p className={styles.label} id={`${ids}-pair`}>
        Pair <span className={styles.labelHint}>· students match the left side to the right side</span>
      </p>
      <div className={styles.pair} role="group" aria-labelledby={`${ids}-pair`}>
        <input
          className={`${styles.pairSide} ${styles.pairLeft}`}
          value={card.prompt}
          aria-label="Left side"
          placeholder="Left"
          tabIndex={tab}
          onChange={(e) => edit({ prompt: e.target.value })}
        />
        <span className={styles.pairLink} aria-hidden="true">
          <Link2 size={22} strokeWidth={2.4} />
        </span>
        <input
          className={styles.pairSide}
          value={card.answer}
          aria-label="Right side"
          placeholder="Right"
          tabIndex={tab}
          onChange={(e) => edit({ answer: e.target.value })}
        />
      </div>

      <p className={styles.label}>Pairs in this lesson</p>
      <ul className={styles.pairs}>
        {pairs.map((p) => {
          const now = p.id === card.id
          return (
            <li key={p.id}>
              <button type="button" className={now ? `${styles.pairRow} ${styles.pairRowOn}` : styles.pairRow} tabIndex={tab} onClick={() => onPick(p.id)}>
                <span className={styles.pairL}>{p.prompt || '…'}</span>
                <ArrowRight size={16} className={styles.pairArrow} aria-hidden="true" />
                <span className={styles.pairR}>{p.answer || '…'}</span>
                <span className={now ? styles.pairNow : p.status === 'approved' ? styles.pairOk : styles.pairTodo}>
                  {now ? 'Checking now' : p.status === 'approved' ? 'Approved' : 'To check'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className={styles.pairCount}>
        <Squares filled={approved} total={Math.max(need, approved)} />
        {approved < need ? (
          <>
            {approved} of {need} approved · Match Up needs {need} pairs
          </>
        ) : (
          <>{approved} approved · enough for Match Up</>
        )}
      </p>
    </>
  )
}

/** Small squares: filled for approved cards, dashed for the ones still missing. */
function Squares({ filled, total }: { filled: number; total: number }) {
  return (
    <span className={styles.squares} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < filled ? styles.sq : `${styles.sq} ${styles.sqEmpty}`} />
      ))}
    </span>
  )
}

function Quote({ page, quote, highlight }: { page: number; quote: string; highlight: string }) {
  const at = highlight ? quote.indexOf(highlight) : -1
  const before = at >= 0 ? quote.slice(0, at) : quote
  const after = at >= 0 ? quote.slice(at + highlight.length) : ''
  return (
    <figure className={styles.source}>
      <span className={styles.sourceTape} aria-hidden="true" />
      <figcaption className={styles.sourceTitle}>
        <FileText size={15} aria-hidden="true" /> From your lesson · page {page}
      </figcaption>
      <blockquote className={styles.quote}>
        “{before}
        {at >= 0 && <mark className={styles.mark}>{highlight}</mark>}
        {after}”
      </blockquote>
    </figure>
  )
}
