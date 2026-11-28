import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChartNoAxesColumn, Check, Package, Pencil, Play } from 'lucide-react'
import { MIN_CARDS } from '../../content/questionCard'
import { paths } from '../../routes/paths'
import { previewGames, previewPath } from '../preview/previewCards'
import { errorMessage } from '../api/client'
import { dueLabel, nextFridayIso } from '../data/dueDates'
import {
  sectionLabel,
  useLesson,
  useLessonGames,
  useLessons,
  useSection,
  useSectionAssignments,
} from '../data/useTeacherData'
import type { TemplateId } from '../data/types'
import { GAME_ICON, GAME_INFO, GAME_ORDER, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { SHOW_PAGE_2 } from '../planner/phonePages'
import { usePlannerActions } from '../planner/plannerActions'
import { Btn, EmptyLine, PageBody, Sub, Title } from '../planner/ui'
import styles from './Games.module.css'

/** "6 questions", "1 pair" */
const countOf = (n: number, g: TemplateId) => `${n} ${n === 1 ? GAME_INFO[g].unit : GAME_INFO[g].units}`

/** Games with enough approved cards that are switched on: these go into the review pack. */
function usePackGames(lessonId: string | undefined) {
  const lesson = useLesson(lessonId)
  const games = useLessonGames(lessonId)
  const inPack = GAME_ORDER.filter((g) => games.ready.includes(g) && !!lesson?.games.includes(g))
  return { lesson, games, inPack }
}

const BackToLessons = ({ live }: { live: boolean }) => {
  const navigate = useNavigate()
  return (
    <Btn variant="link" className={styles.back} tabIndex={live ? undefined : -1} onClick={() => navigate(paths.teacher.lessons)}>
      <ArrowLeft size={16} aria-hidden="true" /> My lessons
    </Btn>
  )
}

// ---------- Left page ----------

export function GamesLeft({ lessonId, live }: PageProps) {
  const { lesson, games, inPack } = usePackGames(lessonId)
  const { setPackGames } = useLessons()
  const navigate = useNavigate()
  const tab = live ? undefined : -1

  if (!lesson || games.approvedTotal + games.toCheckTotal === 0) {
    return (
      <PageBody side="L">
        <BackToLessons live={live} />
        <Title>Your mini games</Title>
        <EmptyLine action={<Btn onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>}>
          Games show up here once the lesson has questions.
        </EmptyLine>
      </PageBody>
    )
  }

  const toggle = (g: TemplateId) => {
    const on = lesson.games.includes(g)
    setPackGames(lesson.id, GAME_ORDER.filter((x) => (x === g ? !on : lesson.games.includes(x))))
  }

  return (
    <PageBody side="L">
      <BackToLessons live={live} />
      <Title>Your mini games</Title>
      <Sub>
        Games are made from your {games.approvedTotal} approved question{games.approvedTotal === 1 ? '' : 's'}
      </Sub>

      <ul className={styles.cards}>
        {GAME_ORDER.map((g) => {
          const n = games.approved[g]
          const min = games.min[g]
          const ready = games.ready.includes(g)
          const on = inPack.includes(g)
          const missing = Math.max(0, min - n)
          return (
            <li key={g} className={ready ? (on ? styles.card : `${styles.card} ${styles.cardOff}`) : `${styles.card} ${styles.cardShort}`}>
              <img src={gameThumbs[g]} alt="" className={styles.thumb} draggable={false} />
              <div className={styles.cardText}>
                <span className={styles.cardTitle}>
                  <strong className={styles.cardName}>{GAME_INFO[g].name}</strong>
                  {ready && (
                    <span className={styles.ready}>
                      <Check size={16} strokeWidth={3} aria-hidden="true" /> Ready
                    </span>
                  )}
                </span>
                <span className={styles.cardInfo}>
                  {GAME_INFO[g].how} · {ready ? countOf(n, g) : `${n} of ${countOf(min, g)}`}
                </span>
                <span className={styles.squares} aria-hidden="true">
                  {Array.from({ length: n + missing }, (_, i) => (
                    <span key={i} className={i < n ? styles.square : `${styles.square} ${styles.squareEmpty}`} />
                  ))}
                </span>
              </div>
              {!ready && (
                <span className={styles.needs}>
                  <span className={styles.needsText}>
                    Needs {missing} more {missing === 1 ? GAME_INFO[g].unit : GAME_INFO[g].units}
                  </span>
                  {games.toCheck[g] > 0 ? (
                    <Btn
                      className={styles.checkMore}
                      icon={<Pencil size={16} aria-hidden="true" />}
                      tabIndex={tab}
                      // The questions are on the Check spread's page 2 (a phone turns there).
                      onClick={() => navigate(`${lessonStepPath(lesson.id, 'check')}?game=${g}`, { state: SHOW_PAGE_2 })}
                    >
                      Check {GAME_INFO[g].units}
                    </Btn>
                  ) : (
                    <span className={styles.noneLeft}>none left to check</span>
                  )}
                </span>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Use ${GAME_INFO[g].name}`}
                disabled={!ready}
                tabIndex={tab}
                className={styles.switch}
                onClick={() => toggle(g)}
              >
                <span className={styles.knob} />
              </button>
            </li>
          )
        })}
      </ul>

      {games.toCheckTotal > 0 && (
        <p className={styles.stillToCheck}>
          <Pencil size={18} aria-hidden="true" />
          <span>
            <strong>
              {games.toCheckTotal} question{games.toCheckTotal === 1 ? '' : 's'}
            </strong>{' '}
            still to check. Approve them to add them to the games.
          </span>
        </p>
      )}

      <PreviewButton lessonId={lesson.id} games={previewGames(lesson.questions)} approved={games.approved} live={live} />
    </PageBody>
  )
}

/**
 * "Preview as a student": the Teacher plays the approved questions full screen,
 * nothing saved. One playable game opens right away; two open a small list to pick
 * from; none: the button is off, with what to approve first.
 */
function PreviewButton({
  lessonId,
  games,
  approved,
  live,
}: {
  lessonId: string
  games: TemplateId[]
  approved: Record<TemplateId, number>
  live: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const listId = useId()
  const tab = live ? undefined : -1
  // The list shows only while this page is the open one (not while it turns away).
  const shown = open && live && games.length > 1

  // Escape or a click outside closes the list.
  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [shown])

  const play = (g: TemplateId) => navigate(previewPath(lessonId, g))

  return (
    <div className={styles.tryWrap} ref={wrap}>
      <Btn
        className={styles.try}
        icon={<Play size={18} aria-hidden="true" />}
        tabIndex={tab}
        disabled={games.length === 0}
        aria-expanded={games.length > 1 ? shown : undefined}
        aria-controls={games.length > 1 ? listId : undefined}
        onClick={() => (games.length === 1 ? play(games[0]) : setOpen((o) => !o))}
      >
        Preview as a student
      </Btn>
      {games.length === 0 && (
        <p className={styles.tryNote}>
          Approve at least {MIN_CARDS['quiz-show']} questions (or {MIN_CARDS['match-up']} pairs) to try a game.
        </p>
      )}
      {shown && (
        <div className={styles.tryMenu} id={listId} role="group" aria-label="Pick a game to preview">
          <ul className={styles.tryList}>
            {games.map((g) => (
              <li key={g} className={styles.tryRow}>
                <img src={gameThumbs[g]} alt="" className={styles.tryThumb} draggable={false} />
                <span className={styles.tryText}>
                  <strong>{GAME_INFO[g].name}</strong>
                  <small>{countOf(approved[g], g)} approved</small>
                </span>
                <Btn variant="primary" className={styles.tryPlay} icon={<Play size={16} aria-hidden="true" />} onClick={() => play(g)}>
                  Play
                </Btn>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------- Right page ----------

export function GamesRight({ lessonId, live }: PageProps) {
  const { lesson, games, inPack } = usePackGames(lessonId)
  const { assignLesson } = useLessons()
  const { sections, active } = useSection()
  const { lessonPopup } = usePlannerActions()
  // Already assigned to this section: the page starts with the saved name and due date
  // (and the saved games, through the lesson).
  const saved = useSectionAssignments().get(lessonId ?? '')
  const navigate = useNavigate()
  const ids = useId()
  const [name, setName] = useState(saved?.name ?? (lesson ? `${lesson.topic} Review` : ''))
  const [sectionId, setSectionId] = useState(active?.id ?? '')
  // The due date as "2026-11-27" ('' = no due date); the box shows its label ("Fri, Nov 27").
  // A new pack starts with next Friday.
  const [due, setDue] = useState(() => (saved ? (saved.dueDate ?? '') : nextFridayIso()))
  const [assigned, setAssigned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The saved pack arrived after the page opened: fill it in once.
  const [prefilled, setPrefilled] = useState(!!saved)
  if (saved && !prefilled) {
    setPrefilled(true)
    setName(saved.name)
    setDue(saved.dueDate ?? '')
  }
  const section = sections.find((s) => s.id === sectionId) ?? active
  const tab = live ? undefined : -1

  // After "Assigned!", turn back to Home.
  useEffect(() => {
    if (!assigned || !live) return
    const t = window.setTimeout(() => navigate(paths.teacher.home), 1300)
    return () => window.clearTimeout(t)
  }, [assigned, live, navigate])

  /** Saves the review pack on the server: "Assigning…", then "Assigned!" (or the server's message). */
  const assign = async () => {
    if (!lesson || !section || assigned || saving || inPack.length === 0 || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await assignLesson(lesson.id, { sectionId: section.id, name: name.trim(), games: inPack, dueDate: due || null })
      setAssigned(true)
    } catch (err) {
      setError(errorMessage(err))
    }
    setSaving(false)
  }

  return (
    <PageBody side="R">
      <Title color="blue">Make a review pack</Title>
      <Sub>Give it to your class as Today’s Mission</Sub>

      <label className={styles.field}>
        <span className={styles.label}>Pack name</span>
        <input className={styles.input} value={name} maxLength={60} tabIndex={tab} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className={styles.field} role="group" aria-labelledby={`${ids}-games`}>
        <span className={styles.label} id={`${ids}-games`}>
          Games in this pack
        </span>
        <ul className={styles.packGames}>
          {[...inPack, ...GAME_ORDER.filter((g) => !inPack.includes(g))].map((g) => {
            const Icon = GAME_ICON[g]
            return inPack.includes(g) ? (
              <li key={g} className={`${styles.packGame} ${styles[`tone_${GAME_INFO[g].tone}`]}`}>
                <Icon size={17} strokeWidth={2.4} aria-hidden="true" />
                {GAME_INFO[g].name} · {games.approved[g]}
              </li>
            ) : (
              <li key={g} className={`${styles.packGame} ${styles.packGameOut}`}>
                <s>{GAME_INFO[g].name}</s>
                <span className="visually-hidden">{games.ready.includes(g) ? '(switched off)' : '(not ready)'}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={styles.field} role="group" aria-labelledby={`${ids}-give`}>
        <span className={styles.label} id={`${ids}-give`}>
          Give to
        </span>
        <div className={styles.giveTo}>
          <button type="button" aria-pressed="true" tabIndex={tab} className={`${styles.give} ${styles.giveOn}`}>
            <Check size={18} strokeWidth={3} aria-hidden="true" />
            Whole section
          </button>
          {/* Assigning to single Students is not in the MVP (brief 7: a review pack goes to a section). */}
          <span className={styles.giveLater}>
            <button type="button" aria-pressed="false" disabled aria-describedby={`${ids}-later`} className={styles.give}>
              Pick students
            </button>
            <span id={`${ids}-later`} className={styles.giveLaterNote}>
              Coming later
            </span>
          </span>
        </div>
      </div>

      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Section</span>
          <select className={styles.select} value={sectionId} tabIndex={tab} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {sectionLabel(s)} · {s.registeredCount}
              </option>
            ))}
          </select>
        </label>
        <div className={`${styles.field} ${styles.due}`}>
          <span className={styles.label} id={`${ids}-due`}>
            Due date
          </span>
          {/* Opens the same school-day calendar as Change due date ("Pick a due date"). */}
          <button
            type="button"
            className={`${styles.dateBox} ${styles.dateButton}`}
            tabIndex={tab}
            aria-haspopup="dialog"
            aria-labelledby={`${ids}-due ${ids}-due-value`}
            onClick={() => lessonPopup({ kind: 'pickDue', current: due || null, onPick: (iso) => setDue(iso ?? '') })}
          >
            <CalendarDays size={20} aria-hidden="true" />
            <span id={`${ids}-due-value`} className={styles.dateValue}>
              {due ? dueLabel(due) : 'No due date'}
            </span>
          </button>
        </div>
      </div>

      <p className={styles.levelNote}>
        <ChartNoAxesColumn size={22} aria-hidden="true" />
        <span>
          <strong>Each student gets their own level.</strong> KIDDEX starts on Easy and moves up after 80% right, using a
          simple rule, not AI.
        </span>
      </p>

      <div className={styles.assignWrap}>
        <Btn
          variant="primary"
          className={styles.assign}
          disabled={!lesson || !section || inPack.length === 0 || name.trim() === '' || assigned || saving}
          tabIndex={tab}
          icon={<Package size={22} aria-hidden="true" />}
          onClick={() => void assign()}
        >
          {saving ? 'Assigning…' : `Assign to ${section ? sectionLabel(section) : 'your class'}`}
        </Btn>
        <span className={styles.toastSlot} role="status">
          {assigned && (
            <span className={styles.toast}>
              <Check size={18} strokeWidth={3} aria-hidden="true" /> Assigned!
            </span>
          )}
        </span>
      </div>
      {error && (
        <p className={styles.assignError} role="alert">
          {error}
        </p>
      )}
      {lesson && inPack.length === 0 && (
        <p className={styles.assignHint}>
          {games.ready.length === 0 ? 'No game has enough approved questions yet.' : 'Switch on at least one game to assign this pack.'}
        </p>
      )}
    </PageBody>
  )
}
