import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, Gamepad2, Package, User, type LucideIcon } from 'lucide-react'
import { paths } from '../../routes/paths'
import { useClassSummary, useLessons, useSection, useStudents, useTeacher, useTodos, type ShownTodo } from '../data/useTeacherData'
import type { TodoTarget } from '../data/types'
import { lessonStepPath, studentsPath, type PageProps } from '../planner/pages'
import { Bar, Btn, Heading, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './Home.module.css'

// ---------- Left page ----------

export function HomeLeft({ live }: PageProps) {
  const teacher = useTeacher()
  const { active, label } = useSection()
  const summary = useClassSummary()
  const students = useStudents()
  const isNew = students.length === 0

  return (
    <PageBody side="L">
      <Title>
        Good morning, {teacher.name}!
      </Title>
      <Sub>
        {summary.todayLabel} · Grade {active.grade} – {active.name}
        <span className="visually-hidden"> ({label})</span>
      </Sub>

      <Stats />

      {isNew ? (
        <>
          <GetStarted live={live} />
          {/* A new Teacher's first upload still gets its "Check the questions" row. */}
          <TodoList live={live} openOnly />
        </>
      ) : (
        <TodoList live={live} />
      )}
    </PageBody>
  )
}

function Stats() {
  const { registered, total, stats } = useClassSummary()
  const cells: { big: string; small?: string; label: string; icon: LucideIcon }[] = [
    { big: String(registered), small: `/${total}`, label: 'registered', icon: User },
    { big: String(stats.playedToday), label: 'played today', icon: Gamepad2 },
    {
      big: stats.reviewPackDone === null ? '–' : String(stats.reviewPackDone),
      small: stats.reviewPackTotal === null ? undefined : `/${stats.reviewPackTotal}`,
      label: 'review pack',
      icon: Package,
    },
    { big: stats.studyDays === null ? '–' : String(stats.studyDays), label: 'study days', icon: CalendarDays },
  ]
  return (
    <dl className={styles.stats}>
      {cells.map(({ big, small, label, icon: Icon }) => (
        <div key={label} className={styles.stat}>
          <dd className={styles.statNumber}>
            {big}
            {small && <span className={styles.statSmall}>{small}</span>}
          </dd>
          <dt className={styles.statLabel}>
            <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </dt>
        </div>
      ))}
    </dl>
  )
}

const targetPath = (t: TodoTarget) =>
  t.kind === 'check'
    ? lessonStepPath(t.lessonId, 'check')
    : t.kind === 'games'
      ? lessonStepPath(t.lessonId, 'games')
      : t.kind === 'students'
        ? studentsPath(t.filter)
        : null

/** openOnly: under Get started, just the open items (up to 2) and no Coming up. */
function TodoList({ live, openOnly = false }: { live: boolean; openOnly?: boolean }) {
  const { todos, upcoming, toggle } = useTodos()
  const navigate = useNavigate()
  const left = todos.filter((t) => !t.done).length
  // Open items first, then up to 5 rows in all (the page has room for 5).
  const rows = openOnly
    ? todos.filter((t) => !t.done).slice(0, 2)
    : [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)].slice(0, 5)
  if (openOnly && rows.length === 0) return null

  return (
    <>
      <section className={styles.todo} aria-labelledby="todo-title">
        <Heading
          after={
            left > 0 && (
              <span className={styles.count} aria-label={`${left} left`}>
                {left}
              </span>
            )
          }
        >
          <span id={live ? 'todo-title' : undefined}>To do today</span>
        </Heading>
        <ul className={styles.rows}>
          {rows.map((t) => (
            <TodoRow
              key={t.id}
              item={t}
              onToggle={() => toggle(t.id)}
              onGo={() => {
                const to = targetPath(t.target)
                if (to) navigate(to)
              }}
            />
          ))}
        </ul>
      </section>

      {!openOnly && upcoming.length > 0 && (
        <section className={styles.coming}>
          <Heading>Coming up</Heading>
          <ul className={styles.comingRows}>
            {upcoming.map((u) => (
              <li key={u.id} className={styles.comingRow}>
                <span className={styles.cal} aria-hidden="true">
                  <span className={styles.calDay}>{u.weekday}</span>
                  <span className={styles.calDate}>{u.date}</span>
                </span>
                <span className="visually-hidden">
                  {u.weekday} {u.date}:
                </span>
                <span>
                  <strong>{u.title}</strong> <span className={styles.muted}>· {u.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function TodoRow({ item, onToggle, onGo }: { item: ShownTodo; onToggle: () => void; onGo: () => void }) {
  return (
    <li className={item.done ? `${styles.row} ${styles.rowDone}` : styles.row}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`${item.title}: done`}
        className={styles.check}
        onClick={onToggle}
      >
        {item.done && <Check size={20} strokeWidth={3} aria-hidden="true" />}
      </button>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>
          {item.title}
          {item.tag && !item.done && <span className={styles.tag}>{item.tag}</span>}
        </p>
        <p className={styles.rowDetail}>{item.done && item.doneAt ? `Done at ${item.doneAt}` : item.detail}</p>
      </div>
      {!item.done && item.target.kind !== 'none' && (
        <Btn variant={item.primary ? 'primary' : 'outline'} onClick={onGo}>
          {item.action}
        </Btn>
      )}
    </li>
  )
}

/** A brand-new Teacher: three first steps instead of To do. */
function GetStarted({ live }: { live: boolean }) {
  const navigate = useNavigate()
  const { lessons } = useLessons()
  const steps = [
    {
      title: 'Add your students',
      detail: 'Type their names and School IDs.',
      action: 'Add students',
      onClick: () => navigate(studentsPath()),
      done: false,
    },
    {
      title: 'Print their login cards',
      detail: 'Each card has a School ID and a one-time code.',
      action: 'Print cards',
      onClick: () => {
        // TODO: print login cards.
      },
      done: false,
    },
    {
      title: 'Upload your first lesson',
      detail: 'KIDDEX drafts game questions for you to check.',
      action: 'Upload',
      onClick: () => navigate(paths.teacher.lessons),
      done: lessons.length > 0,
    },
  ]
  return (
    <section className={styles.todo} aria-labelledby="start-title">
      <Heading>
        <span id={live ? 'start-title' : undefined}>Get started</span>
      </Heading>
      <ol className={styles.rows}>
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? `${styles.row} ${styles.rowDone}` : styles.row}>
            <span className={s.done ? `${styles.stepNo} ${styles.stepNoDone}` : styles.stepNo} aria-hidden="true">
              {s.done ? <Check size={18} strokeWidth={3} /> : i + 1}
            </span>
            <div className={styles.rowText}>
              <p className={styles.rowTitle}>
                {s.title}
                {s.done && <span className="visually-hidden"> (done)</span>}
              </p>
              <p className={styles.rowDetail}>{s.detail}</p>
            </div>
            {!s.done && (
              <Btn variant={i === 0 ? 'primary' : 'outline'} onClick={s.onClick}>
                {s.action}
              </Btn>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- Right page ----------

export function HomeRight() {
  const { active } = useSection()
  const { weekSubject, weakTopics, week, ollieNote } = useClassSummary()
  const navigate = useNavigate()

  return (
    <PageBody side="R">
      <Title color="blue">My class this week</Title>
      <Btn variant="link" className={styles.openProgress} onClick={() => navigate(paths.teacher.progress)}>
        Open Progress <ArrowRight size={18} aria-hidden="true" />
      </Btn>
      <Sub>
        How {active.name} is doing on {weekSubject}
      </Sub>

      <section className={styles.topics}>
        <Heading>Weakest topics</Heading>
        {weakTopics.length === 0 ? (
          <p className={`${styles.placeholder} ${styles.topicsEmpty}`}>Topics show up after your students play.</p>
        ) : (
          <ul className={styles.topicRows}>
            {weakTopics.map((t) => (
              <li key={t.topic} className={styles.topic}>
                <span className={styles.topicName}>{t.topic}</span>
                <span className={t.percent < 50 ? `${styles.pct} ${styles.pctLow}` : styles.pct}>{t.percent}%</span>
                <Bar percent={t.percent} className={styles.topicBar} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.week}>
        <Heading>Who played each day</Heading>
        {week.length === 0 ? (
          <p className={`${styles.placeholder} ${styles.chartEmpty}`}>Each day shows up after your students play.</p>
        ) : (
          <WeekChart week={week} />
        )}
      </section>

      <OllieNote>{ollieNote}</OllieNote>
    </PageBody>
  )
}

function WeekChart({ week }: { week: ReturnType<typeof useClassSummary>['week'] }) {
  const max = Math.max(...week.map((d) => d.count ?? 0), 1)
  const spoken = week.map((d) => `${d.day}: ${d.count ?? 'not yet'}`).join(', ')
  return (
    <div className={styles.chart} role="img" aria-label={`Students who played each day. ${spoken}`}>
      {week.map((d) => {
        const h = d.count === null ? 40 : Math.max(8, (d.count / max) * 108)
        const className = [styles.col, d.today && styles.today, d.count === null && styles.future].filter(Boolean).join(' ')
        return (
          <div key={d.day} className={className}>
            <span className={styles.colNumber}>{d.count ?? ''}</span>
            <span className={styles.colBar} style={{ height: h }} />
            <span className={styles.colDay}>{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}
