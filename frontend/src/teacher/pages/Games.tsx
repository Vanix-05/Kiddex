import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChartNoAxesColumn, Check, Package, Pencil, Play } from 'lucide-react'
import { MIN_CARDS } from '../../content/questionCard'
import { paths } from '../../routes/paths'
import { previewGames, previewPath } from '../preview/previewCards'
import { sectionLabel, useLesson, useLessonGames, useLessons, useReviewPackDefaults, useSection, useStudents } from '../data/useTeacherData'
import type { TemplateId } from '../data/types'
import { GAME_ICON, GAME_INFO, GAME_ORDER, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { SHOW_PAGE_2 } from '../planner/phonePages'
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

/** The next few school days, for the due date list. */
function DUE_DATES(first: string) {
  const days: string[] = []
  const d = new Date()
  while (days.length < 8) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  }
  // The default (next Friday) first, then the other school days in order.
  return [first, ...days.filter((x) => x !== first)].slice(0, 6)
}

export function GamesRight({ lessonId, live }: PageProps) {
  const { lesson, games, inPack } = usePackGames(lessonId)
  const { assignLesson } = useLessons()
  const { sections, active } = useSection()
  const students = useStudents()
  const { dueLabel } = useReviewPackDefaults()
  const navigate = useNavigate()
  const ids = useId()
  const [name, setName] = useState(lesson ? `${lesson.topic} Review` : '')
  const [giveTo, setGiveTo] = useState<'section' | 'pick'>('section')
  const [sectionId, setSectionId] = useState(active?.id ?? '')
  const [due, setDue] = useState(dueLabel)
  const [assigned, setAssigned] = useState(false)
  const section = sections.find((s) => s.id === sectionId) ?? active
  const registered = students.filter((s) => s.registered).length
  const tab = live ? undefined : -1

  // After "Assigned!", turn back to Home.
  useEffect(() => {
    if (!assigned || !live) return
    const t = window.setTimeout(() => navigate(paths.teacher.home), 1300)
    return () => window.clearTimeout(t)
  }, [assigned, live, navigate])

  const assign = () => {
    if (!lesson || assigned || inPack.length === 0) return
    // TODO: send the review pack (with the games in inPack) to the backend.
    assignLesson(lesson.id, due)
    setAssigned(true)
  }

  return (
    <PageBody side="R">
      <Title color="blue">Make a review pack</Title>
      <Sub>Give it to your class as Today’s Mission</Sub>

      <label className={styles.field}>
        <span className={styles.label}>Pack name</span>
        <input className={styles.input} value={name} tabIndex={tab} onChange={(e) => setName(e.target.value)} />
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
          {(
            [
              ['section', 'Whole section'],
              ['pick', 'Pick students'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={giveTo === value}
              tabIndex={tab}
              className={giveTo === value ? `${styles.give} ${styles.giveOn}` : styles.give}
              onClick={() => {
                setGiveTo(value)
                // TODO: "Pick students" opens a student picker.
              }}
            >
              {giveTo === value && <Check size={18} strokeWidth={3} aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Section</span>
          <select className={styles.select} value={sectionId} tabIndex={tab} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {sectionLabel(s)} · {registered}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.due}`}>
          <span className={styles.label}>Due date</span>
          <span className={styles.dateBox}>
            <CalendarDays size={20} aria-hidden="true" />
            <select className={styles.dateSelect} value={due} tabIndex={tab} onChange={(e) => setDue(e.target.value)}>
              {DUE_DATES(dueLabel).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </span>
        </label>
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
          disabled={!lesson || inPack.length === 0 || name.trim() === '' || assigned}
          tabIndex={tab}
          icon={<Package size={22} aria-hidden="true" />}
          onClick={assign}
        >
          Assign to {section ? sectionLabel(section) : 'your class'}
        </Btn>
        <span className={styles.toastSlot} role="status">
          {assigned && (
            <span className={styles.toast}>
              <Check size={18} strokeWidth={3} aria-hidden="true" /> Assigned!
            </span>
          )}
        </span>
      </div>
      {lesson && inPack.length === 0 && (
        <p className={styles.assignHint}>
          {games.ready.length === 0 ? 'No game has enough approved questions yet.' : 'Switch on at least one game to assign this pack.'}
        </p>
      )}
    </PageBody>
  )
}
