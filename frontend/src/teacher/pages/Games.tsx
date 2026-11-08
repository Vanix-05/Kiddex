import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChartNoAxesColumn, Check, Package, Play } from 'lucide-react'
import { paths } from '../../routes/paths'
import { sectionLabel, useDrafts, useLesson, useLessons, useReviewPackDefaults, useSection, useStudents } from '../data/useTeacherData'
import type { GameType } from '../data/types'
import { GAME_INFO, GAME_ORDER, gameThumbs } from '../assets'
import { lessonStepPath, type PageProps } from '../planner/pages'
import { Btn, EmptyLine, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './Games.module.css'

/** Approved questions per game type. */
function useGameCounts(lessonId: string | undefined) {
  const { drafts } = useDrafts(lessonId)
  const approved = drafts.filter((q) => q.status === 'approved')
  const counts = Object.fromEntries(GAME_ORDER.map((g) => [g, approved.filter((q) => q.game === g).length])) as Record<GameType, number>
  return { approved: approved.length, counts }
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
  const lesson = useLesson(lessonId)
  const { approved, counts } = useGameCounts(lessonId)
  const navigate = useNavigate()
  const [off, setOff] = useState<GameType[]>([])
  const games = GAME_ORDER.filter((g) => counts[g] > 0)

  if (!lesson || approved === 0) {
    return (
      <PageBody side="L">
        <BackToLessons live={live} />
        <Title>Your mini games</Title>
        <EmptyLine
          action={
            lesson && lesson.toCheck > 0 ? (
              <Btn variant="primary" onClick={() => navigate(lessonStepPath(lesson.id, 'check'))}>
                Check the questions
              </Btn>
            ) : (
              <Btn onClick={() => navigate(paths.teacher.lessons)}>My lessons</Btn>
            )
          }
        >
          Games show up here once you approve some questions.
        </EmptyLine>
      </PageBody>
    )
  }

  return (
    <PageBody side="L">
      <BackToLessons live={live} />
      <Title>Your mini games</Title>
      <Sub>
        {approved} approved question{approved === 1 ? '' : 's'} went into {games.length} game type{games.length === 1 ? '' : 's'}
      </Sub>

      <ul className={styles.cards}>
        {games.map((g) => {
          const on = !off.includes(g)
          return (
            <li key={g} className={on ? styles.card : `${styles.card} ${styles.cardOff}`}>
              <img src={gameThumbs[g]} alt="" className={styles.thumb} draggable={false} />
              <div className={styles.cardText}>
                <strong className={styles.cardName}>{GAME_INFO[g].name}</strong>
                <span className={styles.cardInfo}>
                  {GAME_INFO[g].how} · {counts[g]} question{counts[g] === 1 ? '' : 's'}
                </span>
                <span className={styles.squares} aria-hidden="true">
                  {Array.from({ length: counts[g] }, (_, i) => (
                    <span key={i} className={styles.square} />
                  ))}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Use ${GAME_INFO[g].name}`}
                className={styles.switch}
                onClick={() => setOff((o) => (on ? [...o, g] : o.filter((x) => x !== g)))}
              >
                <span className={styles.knob} />
              </button>
            </li>
          )
        })}
      </ul>

      <Btn
        className={styles.try}
        icon={<Play size={18} aria-hidden="true" />}
        onClick={() => {
          // TODO: open the games as a student would see them.
        }}
      >
        Try it as a student
      </Btn>
    </PageBody>
  )
}

// ---------- Right page ----------

/** The next few school days, for the due date list. */
const DUE_DATES = (first: string) => [first, 'Mon, Nov 17', 'Tue, Nov 18', 'Wed, Nov 19', 'Fri, Nov 21']

export function GamesRight({ lessonId, live }: PageProps) {
  const lesson = useLesson(lessonId)
  const { approved } = useGameCounts(lessonId)
  const { assignLesson } = useLessons()
  const { sections, active } = useSection()
  const students = useStudents()
  const { dueLabel } = useReviewPackDefaults()
  const navigate = useNavigate()
  const ids = useId()
  const [name, setName] = useState(lesson ? `${lesson.topic} Review` : '')
  const [giveTo, setGiveTo] = useState<'section' | 'pick'>('section')
  const [sectionId, setSectionId] = useState(active.id)
  const [due, setDue] = useState(dueLabel)
  const [assigned, setAssigned] = useState(false)
  const section = sections.find((s) => s.id === sectionId) ?? active
  const registered = students.filter((s) => s.registered).length

  // After "Assigned!", turn back to Home.
  useEffect(() => {
    if (!assigned || !live) return
    const t = window.setTimeout(() => navigate(paths.teacher.home), 1300)
    return () => window.clearTimeout(t)
  }, [assigned, live, navigate])

  const assign = () => {
    if (!lesson || assigned) return
    // TODO: send the review pack to the backend.
    assignLesson(lesson.id, due)
    setAssigned(true)
  }

  return (
    <PageBody side="R">
      <Title color="blue">Make a review pack</Title>
      <Sub>Give it to your class as Today’s Mission</Sub>

      <label className={styles.field}>
        <span className={styles.label}>Pack name</span>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

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
          <select className={styles.select} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
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
            <select className={styles.dateSelect} value={due} onChange={(e) => setDue(e.target.value)}>
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
          disabled={!lesson || approved === 0 || name.trim() === '' || assigned}
          icon={<Package size={22} aria-hidden="true" />}
          onClick={assign}
        >
          Assign to {sectionLabel(section)}
        </Btn>
        <span className={styles.toastSlot} role="status">
          {assigned && (
            <span className={styles.toast}>
              <Check size={18} strokeWidth={3} aria-hidden="true" /> Assigned!
            </span>
          )}
        </span>
      </div>

      <OllieNote>Students will see this pack as Today’s Mission, then play the games from the Lobby.</OllieNote>
    </PageBody>
  )
}
