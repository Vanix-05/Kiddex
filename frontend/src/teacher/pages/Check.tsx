import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleCheck, Plus, X } from 'lucide-react'
import { paths } from '../../routes/paths'
import type { TemplateId } from '../../content/questionCard'
import { ApiError, errorMessage } from '../api/client'
import { useCards, useCheckSeenEnd, useLessonLoad, type LessonDetail } from '../data/useTeacherData'
import { GAME_INFO, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { EmptyLine, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import { ApproveBar } from './check/ApproveBar'
import {
  barState,
  emptyForm,
  formChanged,
  formFor,
  formProblems,
  formToEdit,
  groupCards,
  groupCountLabel,
  markedList,
  type CardForm,
  type FormField,
} from './check/checkLogic'
import { QuestionEditor } from './check/QuestionEditor'
import { QuestionItem } from './check/QuestionItem'
import styles from './Check.module.css'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A new value for each "Go →" tap, so tapping the same row again scrolls again. */
const stamp = () => Date.now().toString(36)

const TYPE_FOR_GAME = { 'quiz-show': 'multiple_choice', 'match-up': 'matching_pair', 'fill-blank': 'fill_blank' } as const

/** Approved on the server: the screen calls it "ready" (or "assigned"). */
const isApproved = (lesson: LessonDetail) => lesson.status === 'ready' || lesson.status === 'assigned'

function BackToLessons() {
  const navigate = useNavigate()
  return (
    <button type="button" className={styles.back} onClick={() => navigate(paths.teacher.lessons)}>
      <ArrowLeft size={16} aria-hidden="true" /> My lessons
    </button>
  )
}

// ---------- Left page: what to look closely at ----------

export function CheckLeft({ lessonId, live }: PageProps) {
  const { lesson } = useLessonLoad(lessonId)
  const { cards } = useCards(lessonId)
  const navigate = useNavigate()

  if (!lesson || !lessonId) {
    return (
      <PageBody side="L">
        <BackToLessons />
        <Title>Check the questions</Title>
      </PageBody>
    )
  }

  const marked = markedList(cards)
  const left = marked.filter((m) => !m.checked).length
  const byAi = cards.filter((c) => c.madeBy === 'ai').length
  /** Tells the right page to scroll to a card (a new `t` repeats the same card). */
  const go = (id: string) => navigate(`${lessonStepPath(lessonId, 'check')}?q=${encodeURIComponent(id)}&t=${stamp()}`, { replace: true })

  return (
    <PageBody side="L">
      <div inert={!live || undefined} className={styles.leftPage}>
        <BackToLessons />
        <Title>Check the questions</Title>
        <Sub>
          {lesson.topic || lesson.title} · {byAi} question{byAi === 1 ? '' : 's'} drafted by AI
        </Sub>

        <h3 className={styles.lookTitle}>
          Look closely at these
          {marked.length > 0 &&
            (left > 0 ? <span className={styles.leftBadge}>{left} left</span> : <span className={styles.doneBadge}>all checked</span>)}
        </h3>

        {marked.length === 0 ? (
          <p className={styles.nothingMarked}>Nothing marked. Still read every question before you approve.</p>
        ) : (
          <ul className={styles.markedList}>
            {marked.map((m) => (
              <li key={m.id}>
                <button type="button" className={m.checked ? `${styles.markedRow} ${styles.markedRowDone}` : styles.markedRow} onClick={() => go(m.id)}>
                  <span className={m.checked ? `${styles.markedNum} ${styles.markedNumDone}` : styles.markedNum}>{m.number}</span>
                  <span className={styles.markedText}>
                    <strong>{m.text}</strong>
                    <span>{m.checked ? 'Checked' : m.reason}</span>
                  </span>
                  {m.checked ? (
                    <Check size={20} strokeWidth={3} className={styles.markedTick} aria-hidden="true" />
                  ) : (
                    <span className={styles.markedGo}>
                      Go <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OllieNote>Read down the list. Fix or delete anything wrong. At the end, approve them all in one tap.</OllieNote>
    </PageBody>
  )
}

// ---------- Right page: the list and the bar ----------

type EditTarget = { kind: 'card'; id: string } | { kind: 'new'; game: TemplateId }

interface Editing {
  target: EditTarget
  /** The form as it was opened (for "unsaved changes?"). */
  from: CardForm
  form: CardForm
  problems: Partial<Record<FormField, string>>
  /** Another card was asked for while this one has unsaved changes. */
  askFor: EditTarget | null
}

interface Toast {
  id: number
  text: string
  bad: boolean
}

const sameTarget = (a: EditTarget, b: EditTarget) =>
  a.kind === 'card' ? b.kind === 'card' && a.id === b.id : b.kind === 'new' && a.game === b.game

export function CheckRight({ lessonId, query, live }: PageProps) {
  const { lesson, loading, notFound } = useLessonLoad(lessonId)
  const { cards, editCard, keepCard, deleteCard, addCard, approveAll, refresh } = useCards(lessonId)
  const { seen, markSeen } = useCheckSeenEnd(lessonId)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const toastId = useRef(0)
  const leaveTimer = useRef<number | undefined>(undefined)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [choosingGame, setChoosingGame] = useState(false)
  const [moreBelow, setMoreBelow] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [approving, setApproving] = useState(false)
  const [done, setDone] = useState(false)
  const hasCards = cards.length > 0
  const approved = !!lesson && isApproved(lesson)
  const showList = !!lesson && (lesson.status === 'toCheck' || approved)

  const toast = useCallback((text: string, bad = false) => {
    const id = ++toastId.current
    setToasts((ts) => [...ts.slice(-2), { id, text, bad }])
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), bad ? 6000 : 4000)
  }, [])

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  // An approved lesson was read before: Approve all stays unlocked after an edit.
  useEffect(() => {
    if (approved) markSeen()
  }, [approved, markSeen])

  // "At the end": the marker after the last card was on screen once (a short list counts at once).
  useEffect(() => {
    const root = listRef.current
    const end = endRef.current
    if (!live || seen || !showList || !root || !end) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) markSeen()
      },
      { root, threshold: 0 },
    )
    io.observe(end)
    return () => io.disconnect()
  }, [live, seen, showList, markSeen])

  // "{N} more below": the cards that start below the list's bottom edge.
  useEffect(() => {
    const list = listRef.current
    const content = contentRef.current
    if (!live || !showList || !list || !content) return
    let frame = 0
    const count = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const bottom = list.getBoundingClientRect().bottom
        const below = [...list.querySelectorAll('[data-card]')].filter((el) => el.getBoundingClientRect().top >= bottom - 4).length
        setMoreBelow(below)
      })
    }
    const ro = new ResizeObserver(count)
    ro.observe(list)
    ro.observe(content)
    list.addEventListener('scroll', count, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      list.removeEventListener('scroll', count)
    }
  }, [live, showList])

  /** Scrolls the list so the card is in the middle, with a short soft highlight. */
  const scrollToCard = useCallback((id: string) => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`)
    if (!list || !el) return
    const reduced = reducedMotion()
    list.scrollTo({ top: Math.max(0, el.offsetTop - (list.clientHeight - el.offsetHeight) / 2), behavior: reduced ? 'auto' : 'smooth' })
    if (reduced) return
    el.dataset.flash = 'on'
    window.setTimeout(() => delete el.dataset.flash, 1600)
  }, [])

  // From the left page ("Go →", ?q=) or the Games page (?game=match-up).
  const askedCard = query.get('q')
  const askedAt = query.get('t')
  const askedGame = query.get('game')
  useEffect(() => {
    if (!live || !hasCards) return
    if (askedCard) {
      scrollToCard(askedCard)
    } else if (askedGame) {
      const list = listRef.current
      const group = list?.querySelector<HTMLElement>(`[data-group="${CSS.escape(askedGame)}"]`)
      if (list && group) list.scrollTo({ top: Math.max(0, group.offsetTop - 4), behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
  }, [live, hasCards, askedCard, askedAt, askedGame, scrollToCard])

  if (!lesson || !lessonId) {
    return (
      <PageBody side="R">
        {loading ? (
          <p className={styles.pageNote}>Loading the questions…</p>
        ) : (
          <EmptyLine>{notFound ? 'This lesson isn’t here anymore.' : 'We can’t reach KIDDEX right now. Please check your connection and try again.'}</EmptyLine>
        )}
      </PageBody>
    )
  }

  if (!showList) {
    return (
      <PageBody side="R">
        <EmptyLine
          action={
            <button type="button" className={styles.cancelBtn} tabIndex={live ? undefined : -1} onClick={() => navigate(lessonStepPath(lesson.id, 'making'))}>
              See how it’s going
            </button>
          }
        >
          {lesson.status === 'making' ? 'The questions are still being made.' : 'This lesson has no questions yet.'}
        </EmptyLine>
      </PageBody>
    )
  }

  const games = lesson.games
  const groups = groupCards(cards, games)
  const bar = barState({ cards, seenEnd: seen, moreBelow, lessonApproved: approved })

  // ---------- Editing ----------

  /** The card's fixed fields (or a new card's), for the format check. */
  const baseFor = (target: EditTarget) => {
    if (target.kind === 'card') return cards.find((c) => c.id === target.id)
    return {
      id: 'new',
      lessonId: lesson.id,
      type: TYPE_FOR_GAME[target.game],
      subject: lesson.subject,
      topic: lesson.topic || lesson.title,
      grade: lesson.grade ?? 4,
      status: 'draft' as const,
    }
  }

  const openEdit = (target: EditTarget) => {
    const base = baseFor(target)
    if (!base) return
    const form = 'prompt' in base ? formFor(base) : emptyForm(base.type)
    setEditing({ target, from: form, form, problems: {}, askFor: null })
    setConfirmId(null)
    setChoosingGame(false)
    // Keep the opened card in view, and start typing in it.
    requestAnimationFrame(() => {
      const list = listRef.current
      const el = list?.querySelector<HTMLElement>('[data-editor]')
      if (!list || !el) return
      const top = el.offsetTop - 8
      const bottom = el.offsetTop + el.offsetHeight - list.clientHeight + 8
      if (list.scrollTop > top) list.scrollTo({ top })
      else if (list.scrollTop < bottom) list.scrollTo({ top: Math.min(top, bottom) })
      el.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true })
    })
  }

  /** Pencil / Fix it / Add: opens the card, or asks first if another card has unsaved changes. */
  const requestEdit = (target: EditTarget) => {
    if (editing && sameTarget(editing.target, target)) return
    if (editing && formChanged(editing.form, editing.from)) {
      setEditing({ ...editing, askFor: target })
      return
    }
    openEdit(target)
  }

  /** Checks and saves the open card (then opens `then`, if given). */
  const saveEditing = (then: EditTarget | null) => {
    if (!editing) return
    const base = baseFor(editing.target)
    if (!base) {
      setEditing(null)
      return
    }
    const problems = formProblems(editing.form, base)
    if (Object.keys(problems).length) {
      setEditing({ ...editing, problems, askFor: null })
      return
    }
    const edit = formToEdit(editing.form)
    const target = editing.target
    if (then) openEdit(then)
    else setEditing(null)
    const saving =
      target.kind === 'card'
        ? editCard(target.id, edit)
        : addCard({ type: TYPE_FOR_GAME[target.game], ...edit })
    saving.catch((err: unknown) => toast(errorMessage(err), true))
  }

  const editorFor = (target: EditTarget, number?: number) =>
    editing && sameTarget(editing.target, target) ? (
      <QuestionEditor
        title={target.kind === 'card' ? `Editing question ${number}` : `New ${GAME_INFO[(target as { game: TemplateId }).game].name} question`}
        number={number}
        form={editing.form}
        problems={editing.problems}
        onChange={(form) => setEditing({ ...editing, form, problems: {} })}
        onSave={() => saveEditing(null)}
        onCancel={() => setEditing(null)}
        askSwitch={!!editing.askFor}
        onSwitchSave={() => saveEditing(editing.askFor)}
        onSwitchDiscard={() => editing.askFor && openEdit(editing.askFor)}
      />
    ) : null

  // ---------- Other actions ----------

  const keep = (id: string) => {
    keepCard(id).catch((err: unknown) => toast(errorMessage(err), true))
  }

  const remove = (id: string) => {
    setConfirmId(null)
    if (editing?.target.kind === 'card' && editing.target.id === id) setEditing(null)
    deleteCard(id)
      .then(() => toast('Question deleted'))
      .catch((err: unknown) => toast(errorMessage(err), true))
  }

  const addOwn = () => {
    if (games.length >= 2) setChoosingGame(true)
    else requestEdit({ kind: 'new', game: games[0] ?? 'quiz-show' })
  }

  const approve = async () => {
    setApproving(true)
    try {
      await approveAll()
      setDone(true)
      leaveTimer.current = window.setTimeout(() => navigate(lessonStepPath(lesson.id, 'games')), 1100)
    } catch (err) {
      // A marked question is still open: after the refresh the bar shows it again.
      if (err instanceof ApiError && err.code === 'MARKED_NOT_CHECKED') refresh()
      else toast(errorMessage(err), true)
    }
    setApproving(false)
  }

  return (
    <PageBody side="R">
      <div className={styles.rightPage} inert={!live || undefined}>
        <div className={styles.listWrap}>
          <div ref={listRef} className={styles.list}>
            <div ref={contentRef}>
              {approved && (
                <p className={styles.approvedNote}>
                  <CircleCheck size={18} aria-hidden="true" /> All approved. Editing a question sends it back to check.
                </p>
              )}

              {groups.map((g) => (
                <section key={g.game} data-group={g.game} className={styles.group} aria-label={GAME_INFO[g.game].name}>
                  <h3 className={styles.groupHead}>
                    <img src={gameThumbs[g.game]} alt="" className={styles.groupThumb} draggable={false} />
                    <span className={styles.groupName}>{GAME_INFO[g.game].name}</span>
                    <span className={styles.groupCount}>{groupCountLabel(g.game, g.cards.length)}</span>
                  </h3>
                  <ol className={styles.cards}>
                    {g.cards.map((c) => {
                      const target: EditTarget = { kind: 'card', id: c.id }
                      const editor = editorFor(target, c.position)
                      return (
                        <li key={c.id} data-card={c.id} data-editor={editor ? '' : undefined} className={styles.cardSlot}>
                          {editor ?? (
                            <QuestionItem
                              card={c}
                              fileType={lesson.fileType}
                              confirmingDelete={confirmId === c.id}
                              onEdit={() => requestEdit(target)}
                              onKeep={() => keep(c.id)}
                              onAskDelete={() => setConfirmId(c.id)}
                              onDelete={() => remove(c.id)}
                              onCancelDelete={() => setConfirmId(null)}
                            />
                          )}
                        </li>
                      )
                    })}
                    {editing?.target.kind === 'new' && editing.target.game === g.game && (
                      <li data-editor="" className={styles.cardSlot}>
                        {editorFor(editing.target)}
                      </li>
                    )}
                  </ol>
                </section>
              ))}

              {choosingGame ? (
                <div className={styles.chooseGame} role="group" aria-label="Which game?">
                  <span className={styles.chooseLabel}>Which game?</span>
                  {games.map((g) => (
                    <button key={g} type="button" className={styles.gameChip} onClick={() => requestEdit({ kind: 'new', game: g })}>
                      <img src={gameThumbs[g]} alt="" className={styles.gameChipThumb} draggable={false} />
                      {GAME_INFO[g].name}
                    </button>
                  ))}
                  <button type="button" className={styles.iconBtn} aria-label="Cancel" onClick={() => setChoosingGame(false)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.addOwn} onClick={addOwn}>
                  <Plus size={20} aria-hidden="true" /> Add my own question
                </button>
              )}
              <div ref={endRef} className={styles.endMarker} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.toasts} role="status" aria-live="polite">
            {toasts.map((t) => (
              <p key={t.id} className={t.bad ? `${styles.toast} ${styles.toastBad}` : styles.toast}>
                {t.text}
              </p>
            ))}
          </div>
        </div>

        <ApproveBar state={bar} done={done} busy={approving} onGo={scrollToCard} onApprove={approve} />
      </div>
    </PageBody>
  )
}
