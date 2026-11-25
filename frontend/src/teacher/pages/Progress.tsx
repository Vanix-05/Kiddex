import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Gamepad2, Link2, Mic, Pencil, PartyPopper, Target, Users, type LucideIcon } from 'lucide-react'
import { paths } from '../../routes/paths'
import { errorMessage } from '../api/client'
import type { ProgressPack, SectionProgress } from '../api/sectionsApi'
import { buddyHeads, GAME_INFO } from '../assets'
import { dueChip, nobodyPlayed, orderPacks, weekLabel } from '../data/reports'
import type { TemplateId } from '../data/types'
import { toBuddyHead, useSection, useSectionProgress } from '../data/useTeacherData'
import { studentPagePath, studentsPath, type PageProps } from '../planner/pages'
import { Bar, Btn, Chip, EmptyLine, Heading, PageBody, Sub, Title } from '../planner/ui'
import { StatStrip } from './Home'
import styles from './Progress.module.css'

/**
 * The Progress page (step 9): the open section's mastery per topic, study days this
 * week, who finished each review pack and who needs help. Every number comes from
 * GET /api/sections/:id/progress. Mastery is rule-based (last 20 answers per topic).
 */

/** School ID chips shown on a pack before "+N more". */
const CHIPS_SHOWN = 8

const GAME_ICON: Record<TemplateId, LucideIcon> = { 'quiz-show': Mic, 'match-up': Link2, 'fill-blank': Pencil }

const NOTHING_YET = 'Nothing here yet. It fills in as your students play.'

/** Loading, the error with Try again, or null when the progress is here. */
function LoadState({ loading, error, retry }: { loading: boolean; error: unknown; retry: () => void }) {
  if (error)
    return (
      <EmptyLine action={<Btn onClick={retry}>Try again</Btn>}>
        <span role="alert">{errorMessage(error)}</span>
      </EmptyLine>
    )
  if (loading)
    return (
      <p className={styles.loading} role="status">
        Loading your class’s progress…
      </p>
    )
  return null
}

// ---------- Left page ----------

export function ProgressLeft({ live }: PageProps) {
  const { active } = useSection()
  const { progress, loading, error, retry } = useSectionProgress()
  const navigate = useNavigate()
  const sectionName = active ? `Grade ${active.grade} – ${active.name}` : ''

  return (
    <PageBody side="L">
      <Title>Progress</Title>
      <Sub>
        {sectionName}
        {progress && ` · ${weekLabel(progress.week.from)}`}
      </Sub>

      {!progress ? (
        <LoadState loading={loading} error={error} retry={retry} />
      ) : progress.registered === 0 ? (
        <EmptyLine action={<Btn variant="primary" onClick={() => navigate(studentsPath())}>My Students</Btn>}>
          Add students in My Students. Their progress shows up here.
        </EmptyLine>
      ) : (
        <ClassProgress progress={progress} live={live} />
      )}
    </PageBody>
  )
}

function ClassProgress({ progress, live }: { progress: SectionProgress; live: boolean }) {
  const none = nobodyPlayed(progress)
  const dash = (n: number | null, suffix = '') => (none || n === null ? '–' : `${n}${suffix}`)
  return (
    <>
      <StatStrip
        cells={[
          { big: dash(progress.week.played), small: none ? undefined : `/${progress.registered}`, label: 'played', icon: Gamepad2 },
          { big: dash(progress.mastery, '%'), label: 'mastery', icon: Target },
          { big: dash(progress.needHelpCount), label: 'need help', icon: Users },
          { big: dash(progress.week.studyDaysAverage), label: 'study days', icon: CalendarDays },
        ]}
      />

      {none ? (
        <EmptyLine>{NOTHING_YET}</EmptyLine>
      ) : (
        <>
          <section className={styles.topics} aria-labelledby={live ? 'progress-topics' : undefined}>
            <Heading after={<span className={styles.hint}>weakest first</span>}>
              <span id={live ? 'progress-topics' : undefined}>Mastery by topic</span>
            </Heading>
            <ul className={styles.topicList}>
              {progress.topics.map((t) => (
                <li key={t.topic} className={styles.topic}>
                  <div className={styles.topicText}>
                    <strong className={styles.topicName}>{t.topic}</strong>
                    <span className={styles.topicMeta}>
                      {t.lesson} · {t.played}/{progress.registered} played
                    </span>
                  </div>
                  {t.percent === null ? (
                    <span className={styles.notEnough}>Not enough answers yet</span>
                  ) : (
                    <>
                      <Bar percent={t.percent} className={styles.topicBar} />
                      <strong className={styles.topicPct}>{t.percent}%</strong>
                      <span className={styles.helpSlot}>
                        {t.needHelp > 0 && (
                          <Chip tone="bad" className={styles.helpChip}>
                            {t.needHelp} need help
                          </Chip>
                        )}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.days}>
            <Heading after={<span className={styles.hint}>how many days each Student played</span>}>Study days this week</Heading>
            <StudyDaysChart studyDays={progress.week.studyDays} />
          </section>
        </>
      )}
    </>
  )
}

/** How many Students played 0, 1, 2… days this week. "0 days" is soft red; a count of 0 has no bar. */
function StudyDaysChart({ studyDays }: { studyDays: SectionProgress['week']['studyDays'] }) {
  const max = Math.max(...studyDays.map((d) => d.count), 1)
  const label = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`
  const spoken = studyDays.map((d) => `${label(d.days)}: ${d.count}`).join(', ')
  return (
    <div
      className={styles.chart}
      style={{ gridTemplateColumns: `repeat(${studyDays.length}, 1fr)` }}
      role="img"
      aria-label={`Students by study days this week. ${spoken}`}
    >
      {studyDays.map((d) => (
        <div key={d.days} className={d.days === 0 ? `${styles.col} ${styles.colZero}` : styles.col}>
          <span className={styles.colNumber}>{d.count}</span>
          <span className={styles.colBar} style={{ height: d.count === 0 ? 0 : Math.max(8, (d.count / max) * 74) }} />
          <span className={styles.colDay}>{label(d.days)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- Right page ----------

export function ProgressRight() {
  const { progress, today } = useSectionProgress()
  const navigate = useNavigate()

  return (
    <PageBody side="R">
      <Title color="blue">Review packs</Title>
      <Sub>Who finished each pack (every game played once)</Sub>

      {/* No progress yet, or no Students: the left page says what to do. */}
      {progress && progress.registered > 0 && (
        <div className={styles.scroll}>
          {progress.packs.length === 0 ? (
            <EmptyLine action={<Btn variant="primary" onClick={() => navigate(paths.teacher.lessons)}>Lessons</Btn>}>
              No review packs yet. Assign a lesson in Lessons.
            </EmptyLine>
          ) : (
            orderPacks(progress.packs, today).map((p) => <PackCard key={p.assignmentId} pack={p} registered={progress.registered} today={today} />)
          )}
          <NeedHelp progress={progress} />
        </div>
      )}
    </PageBody>
  )
}

function PackCard({ pack, registered, today }: { pack: ProgressPack; registered: number; today: string }) {
  const navigate = useNavigate()
  const due = pack.dueDate ? dueChip(pack.dueDate, today) : null
  const percent = registered > 0 ? Math.round((pack.done / registered) * 100) : 0
  const shown = pack.notDone.slice(0, CHIPS_SHOWN)
  const more = pack.notDone.length - shown.length

  return (
    <article className={styles.pack}>
      <header className={styles.packHead}>
        <div className={styles.packTitle}>
          <h3 className={styles.packName}>{pack.name}</h3>
          <span className={styles.packMeta}>
            {pack.lessonTitle} ·
            {pack.games.map((g) => {
              const Icon = GAME_ICON[g]
              return (
                <i key={g} className={styles.gameDot} title={GAME_INFO[g].name}>
                  <Icon size={12} strokeWidth={2.6} aria-hidden="true" />
                  <span className="visually-hidden">{GAME_INFO[g].name}</span>
                </i>
              )
            })}
          </span>
        </div>
        {due && (
          <Chip tone={due.past ? 'neutral' : 'warn'} className={styles.dueChip}>
            {due.text}
          </Chip>
        )}
      </header>

      <div className={styles.packBar}>
        <span className={styles.doneBar} aria-hidden="true">
          <span className={styles.doneFill} style={{ width: `${percent}%` }} />
        </span>
        <span className={styles.doneText}>
          <strong>{pack.done}</strong>/{registered} done
        </span>
      </div>

      {pack.notDone.length === 0 ? (
        <p className={styles.allDone}>
          <PartyPopper size={18} aria-hidden="true" /> Everyone finished!
        </p>
      ) : (
        <div className={styles.notDone}>
          <span className={styles.notDoneLabel}>Not done yet</span>
          {shown.map((s) => (
            <button
              key={s.studentId}
              type="button"
              className={styles.idChip}
              aria-label={`Open ${s.schoolId}`}
              onClick={() => navigate(studentPagePath(s.studentId))}
            >
              {s.schoolId}
            </button>
          ))}
          {more > 0 && (
            <button type="button" className={`${styles.idChip} ${styles.moreChip}`} onClick={() => navigate(studentsPath())}>
              +{more} more
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function NeedHelp({ progress }: { progress: SectionProgress }) {
  const navigate = useNavigate()
  const none = nobodyPlayed(progress)
  return (
    <section className={styles.help}>
      <Heading after={<span className={styles.hint}>a topic under 50%</span>}>Need help</Heading>
      {none ? (
        <p className={styles.helpEmpty}>{NOTHING_YET}</p>
      ) : progress.needHelp.length === 0 ? (
        <p className={styles.helpEmpty}>Nobody is under 50% right now.</p>
      ) : (
        <ul className={styles.helpList}>
          {progress.needHelp.map((n) => {
            const head = toBuddyHead(n.buddy)
            return (
              <li key={n.studentId} className={styles.helpRow}>
                {head ? (
                  <img src={buddyHeads[head]} alt="" className={styles.head} />
                ) : (
                  <span className={`${styles.head} ${styles.headEmpty}`} aria-hidden="true" />
                )}
                <strong className={styles.helpId}>{n.schoolId}</strong>
                <span className={styles.helpTopic}>
                  {n.topic} <b>{n.percent}%</b>
                </span>
                <Btn variant="link" aria-label={`Open ${n.schoolId}`} onClick={() => navigate(studentPagePath(n.studentId))}>
                  Open <ArrowRight size={17} aria-hidden="true" />
                </Btn>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
