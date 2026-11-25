import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Flame,
  Target,
  Lightbulb,
  Link2,
  ListChecks,
  Mic,
  Package,
  Pencil,
  Sparkles,
  Star,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react'
import { errorMessage } from '../api/client'
import type { LevelAnswer, LevelCheck, LevelName, LevelRound, LevelTopic, StudentLevelsAnswer } from '../api/sectionsApi'
import { buddyHeads, GAME_INFO, gameThumbs } from '../assets'
import { checkLine, endLine, LEVEL_NAME, phTime, playedLabel, reasonScore, roundMinutes, streakShown } from '../data/levels'
import type { Student, TemplateId } from '../data/types'
import { toBuddyHead, useStudentLevels } from '../data/useTeacherData'
import { Bar, Btn, Chip, Pills, Title } from '../planner/ui'
import { StatStrip } from './Home'
import win from './StudentsWindow.module.css'
import styles from './StudentLevels.module.css'

/** The game icons on the path dots and in the key. */
const GAME_ICON: Record<TemplateId, LucideIcon> = { 'quiz-show': Mic, 'match-up': Link2, 'fill-blank': Pencil }
const GAMES: TemplateId[] = ['quiz-show', 'match-up', 'fill-blank']
const gameIcon = (g: string) => GAME_ICON[g as TemplateId] ?? Mic
const gameName = (g: string) => GAME_INFO[g as TemplateId]?.name ?? 'Game'

const TONE: Record<LevelName, string> = { easy: styles.easy, medium: styles.medium, hard: styles.hard }

/** The right card's tabs (the round detail replaces both; ✕ comes back to the one open). */
type RulesTab = 'levels' | 'mastery'

/** The rounds the page knows, by id (for the picked one). */
const findRound = (topics: LevelTopic[], id: string | null) => {
  for (const t of topics) for (const r of t.rounds) if (r.id === id) return { topic: t, round: r }
  return null
}

interface StudentLevelsProps {
  /** Set on the real sheet only (not on the folding copy). */
  titleId?: string
  /** The row tapped in My Students: its header shows while the levels load. */
  student: Student
  sectionName: string
  /** The round whose detail shows (by id), or null for the rules card. */
  picked: string | null
  onPick: (roundId: string | null) => void
  onBack: () => void
}

/**
 * A Student's page inside My Students (no new route, no page flip): their level
 * per topic as a path over Easy, Medium and Hard, and why it changed. Tapping a
 * round dot shows the checks made during that round. Above, their totals and
 * overall mastery. Levels and mastery are rule-based: the same answers always give
 * the same result.
 */
export function StudentLevels({ titleId, student, sectionName, picked, onPick, onBack }: StudentLevelsProps) {
  const { data, loading, error, retry } = useStudentLevels(student.id)
  const real = titleId !== undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<RulesTab>('levels')

  // Opening the page: focus its title (only on the real sheet).
  useEffect(() => {
    if (real) headRef.current?.focus({ preventScroll: true })
  }, [real])

  // A round opens: focus the detail's title. It closes: focus its dot again.
  const lastPicked = useRef<string | null>(picked)
  useLayoutEffect(() => {
    if (!real) return
    const before = lastPicked.current
    lastPicked.current = picked
    if (picked === before) return
    const root = rootRef.current
    if (picked) root?.querySelector<HTMLElement>('[data-detail-title]')?.focus({ preventScroll: true })
    else if (before) root?.querySelector<HTMLElement>(`[data-round-id="${CSS.escape(before)}"]`)?.focus({ preventScroll: true })
  }, [picked, real])

  const info = data?.student
  const buddy = toBuddyHead(info?.buddy) ?? student.buddy
  const buddyName = info?.buddyName ?? student.buddyName
  const lastPlayed = info ? playedLabel(info.lastPlayedAt) : student.lastPlayed
  const streak = info ? streakShown(info.streakDays) : student.streak
  const parts: ReactNode[] = [info?.sectionName ?? sectionName]
  if (buddyName) parts.push(`Buddy ${buddyName}`)
  if (lastPlayed) parts.push(`Last played ${lastPlayed}`)
  if (streak)
    parts.push(
      <span key="streak" className={styles.flame}>
        <Flame size={16} aria-hidden="true" /> {streak} {streak === 1 ? 'day' : 'days'}
        <span className="visually-hidden"> streak</span>
      </span>,
    )

  const topics = data?.topics ?? []
  const found = findRound(topics, picked)

  return (
    <div ref={rootRef} className={styles.content}>
      <div className={styles.head}>
        <div ref={headRef} tabIndex={-1} className={styles.who}>
          {buddy ? (
            <img src={buddyHeads[buddy]} alt="" className={styles.avatar} />
          ) : (
            <span className={`${styles.avatar} ${styles.avatarEmpty}`} aria-hidden="true" />
          )}
          <div>
            <Title id={titleId}>{info?.schoolId ?? student.schoolId}</Title>
            <p className={styles.sub}>
              {parts.map((p, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {p}
                </span>
              ))}
            </p>
          </div>
        </div>
        <Btn className={win.toolButton} icon={<ArrowLeft size={20} aria-hidden="true" />} onClick={onBack}>
          My Students
        </Btn>
      </div>

      {loading || error ? (
        error ? (
          <div className={win.loadError} role="alert">
            <p>{errorMessage(error)}</p>
            <Btn onClick={retry}>Try again</Btn>
          </div>
        ) : (
          <p className={win.loading} role="status">
            Loading…
          </p>
        )
      ) : (
        <div className={styles.body}>
        {info && <Totals info={info} />}
        <div className={styles.cols}>
          <section className={styles.main} aria-labelledby={real ? `${titleId}-topics` : undefined}>
            <div className={styles.mainHead}>
              <h3 id={real ? `${titleId}-topics` : undefined} className={styles.h3}>
                By topic
              </h3>
              <div className={styles.gameKey}>
                {GAMES.map((g) => {
                  const Icon = GAME_ICON[g]
                  return (
                    <span key={g}>
                      <i className={styles.keyDot} aria-hidden="true">
                        <Icon size={12} strokeWidth={2.6} />
                      </i>
                      {GAME_INFO[g].name}
                    </span>
                  )
                })}
                {topics.length > 0 && <Chip tone="neutral">Tap a round to see why</Chip>}
              </div>
            </div>
            <div className={styles.list}>
              {topics.length === 0 ? (
                <div className={styles.emptyCard}>
                  <span className={styles.emptyIcon} aria-hidden="true">
                    <TrendingUp size={30} />
                  </span>
                  <p>
                    No rounds yet. Levels show here after {info?.schoolId ?? student.schoolId} plays a game.
                  </p>
                </div>
              ) : (
                topics.map((t) => (
                  <TopicCard key={t.topic} t={t} picked={found?.topic === t ? picked : null} onPick={onPick} />
                ))
              )}
            </div>
          </section>
          {found ? (
            <RoundDetail topic={found.topic.topic} round={found.round} onClose={() => onPick(null)} />
          ) : (
            <Rules tab={tab} onTab={setTab} />
          )}
        </div>
        </div>
      )}
    </div>
  )
}

// ---------- Totals ----------

/** The stats strip (level, stars, study days, packs) and the overall mastery box. */
function Totals({ info }: { info: StudentLevelsAnswer['student'] }) {
  return (
    <div className={styles.totals}>
      <div className={styles.strip}>
        <StatStrip
          cells={[
            { big: `Lv ${info.level}`, small: ` · ${info.xp} XP`, label: 'level', icon: Sparkles },
            { big: String(info.stars), label: 'stars', icon: Star },
            { big: String(info.studyDaysThisWeek), label: 'study days this week', icon: CalendarDays },
            { big: String(info.packsDone), small: `/${info.packsTotal}`, label: 'review packs done', icon: Package },
          ]}
        />
      </div>
      <div className={styles.overall}>
        <span className={styles.overallLabel}>
          <Target size={15} strokeWidth={2.2} aria-hidden="true" /> overall mastery
        </span>
        {info.mastery === null ? (
          <span className={styles.notEnough}>Not enough yet</span>
        ) : (
          <span className={styles.overallRow}>
            <Bar percent={info.mastery} className={styles.overallBar} />
            <strong className={styles.overallPct}>{info.mastery}%</strong>
            {info.needsHelp && (
              <Chip tone="bad" className={styles.helpChip}>
                Needs help
              </Chip>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/** "Mastery ▬ 38%", or "Mastery: not enough yet (5 of 8 answers)". */
function TopicMasteryLine({ m }: { m: LevelTopic['mastery'] }) {
  if (m.percent === null)
    return (
      <span className={styles.topicMastery}>
        <span className={styles.notEnough}>Mastery: not enough yet ({m.answers} of 8 answers)</span>
      </span>
    )
  return (
    <span className={styles.topicMastery}>
      Mastery
      <Bar percent={m.percent} className={styles.topicBar} />
      <strong className={m.percent < 50 ? styles.low : undefined}>{m.percent}%</strong>
    </span>
  )
}

// ---------- One topic ----------

function TopicCard({ t, picked, onPick }: { t: LevelTopic; picked: string | null; onPick: (id: string | null) => void }) {
  const earlier = t.roundCount - t.rounds.length
  return (
    <article className={picked ? `${styles.topic} ${styles.topicOn}` : styles.topic}>
      <header className={styles.topicHead}>
        <div>
          <h4 className={styles.topicName}>{t.topic}</h4>
          <span className={styles.topicMeta}>
            {t.lesson} · {t.roundCount} {t.roundCount === 1 ? 'round' : 'rounds'} · went up {t.ups}, down {t.downs}
          </span>
        </div>
        <span className={styles.topicRight}>
          <TopicMasteryLine m={t.mastery} />
          <span className={`${styles.now} ${TONE[t.level]}`}>
            Next round: <b>{LEVEL_NAME[t.level]}</b>
          </span>
        </span>
      </header>
      <LevelPath rounds={t.rounds} earlier={earlier} picked={picked} onPick={onPick} />
    </article>
  )
}

const ORDER: LevelName[] = ['easy', 'medium', 'hard']
// Design px. The path scrolls sideways inside its card when there's no room (phone).
const X0 = 72
const LANE_STEP = 28
const LANE_TOP = 14
const W = 640
const STEP = 104
const laneY = (l: LevelName) => LANE_TOP + (2 - ORDER.indexOf(l)) * LANE_STEP
const DATE_Y = laneY('easy') + 30
const H = DATE_Y + 8

/** 3 dashed lanes, the start dot, one dot per round on its end level, joined by a step line. */
function LevelPath({
  rounds,
  earlier,
  picked,
  onPick,
}: {
  rounds: LevelRound[]
  earlier: number
  picked: string | null
  onPick: (id: string | null) => void
}) {
  if (rounds.length === 0) return null
  const step = Math.min(STEP, (W - X0 - 24) / rounds.length)
  const pts = [{ x: X0, y: laneY(rounds[0].startLevel) }, ...rounds.map((r, i) => ({ x: X0 + step * (i + 1), y: laneY(r.endLevel) }))]
  const d = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `H${(pts[i - 1].x + p.x) / 2}V${p.y}H${p.x}`)).join('')
  const width = pts[pts.length - 1].x + 40

  return (
    <div className={styles.pathBox}>
      <div className={styles.path} style={{ width: Math.max(width, 420), height: H }}>
        <svg width="100%" height={H} className={styles.svg} aria-hidden="true">
          {(['hard', 'medium', 'easy'] as LevelName[]).map((l) => (
            <g key={l}>
              <line x1={X0 - 8} x2="100%" y1={laneY(l)} y2={laneY(l)} className={styles.lane} />
              <text x={0} y={laneY(l) + 4.5} className={`${styles.laneTxt} ${TONE[l]}`}>
                {LEVEL_NAME[l]}
              </text>
            </g>
          ))}
          <path d={d} className={styles.trail} />
          <circle cx={pts[0].x} cy={pts[0].y} r={5} className={styles.startDot} />
          <text x={pts[0].x} y={DATE_Y} className={styles.dateTxt} textAnchor="middle">
            {earlier > 0 ? `+${earlier} earlier` : 'start'}
          </text>
          {rounds.map((r, i) => {
            const p = pts[i + 1]
            const prev = pts[i]
            if (r.change === 'keep') return null
            return (
              <text
                key={r.id}
                x={(prev.x + p.x) / 2 + 8}
                y={(prev.y + p.y) / 2 + 5}
                className={r.change === 'up' ? styles.upTxt : styles.downTxt}
              >
                {r.change === 'up' ? '▲' : '▼'}
              </text>
            )
          })}
          {rounds.map((r, i) => (
            <text key={r.id} x={pts[i + 1].x} y={DATE_Y} className={styles.dateTxt} textAnchor="middle">
              {playedLabel(r.endedAt)}
            </text>
          ))}
        </svg>
        {rounds.map((r, i) => {
          const p = pts[i + 1]
          const Icon = gameIcon(r.game)
          const on = picked === r.id
          const label = `${gameName(r.game)}, ${playedLabel(r.endedAt)}, ${reasonScore(r.reason).split(' (')[0]}, next round ${LEVEL_NAME[r.endLevel]}`
          return (
            <button
              key={r.id}
              type="button"
              data-round-id={r.id}
              className={on ? `${styles.node} ${styles.nodeOn}` : styles.node}
              style={{ left: p.x, top: p.y }}
              aria-label={label}
              aria-pressed={on}
              onClick={() => onPick(on ? null : r.id)}
            >
              <span className={`${styles.dot} ${TONE[r.endLevel]}`}>
                <Icon size={14} strokeWidth={2.6} aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- The right card ----------

function Rules({ tab, onTab }: { tab: RulesTab; onTab: (t: RulesTab) => void }) {
  return (
    <aside className={styles.side} aria-label={tab === 'levels' ? 'How levels change' : 'How mastery works'}>
      <div className={styles.tabs}>
        <Pills
          label="Rules"
          value={tab}
          onChange={onTab}
          items={[
            { value: 'levels', label: 'Levels' },
            { value: 'mastery', label: 'Mastery' },
          ]}
        />
      </div>
      {tab === 'levels' ? <LevelRules /> : <MasteryRules />}
      <p className={styles.honest}>
        <Lightbulb size={17} aria-hidden="true" />
        <span>
          Levels and mastery are <b>rule-based</b>: the same answers always give the same result. AI is only used to draft questions
          from your lessons.
        </span>
      </p>
    </aside>
  )
}

function LevelRules() {
  return (
    <>
      <h3 className={styles.sideTitle}>
        <ListChecks size={21} aria-hidden="true" /> How levels change
      </h3>
      <ol className={styles.rules}>
        <li>
          <b>Everyone starts on Easy</b> for each topic.
        </li>
        <li>
          <b>Every 4 answers:</b> 3 or 4 right → harder questions. 0 or 1 right → easier. 2 right → same.
        </li>
        <li>
          <b>End of a round:</b> 80% or more right → next round starts harder. Under 50% → easier.
        </li>
        <li>
          <b>Buddy Help answers</b> don&rsquo;t count as right for the level.
        </li>
      </ol>
    </>
  )
}

function MasteryRules() {
  return (
    <>
      <h3 className={styles.sideTitle}>
        <Target size={21} aria-hidden="true" /> How mastery works
      </h3>
      <ol className={styles.rules}>
        <li>
          <b>Mastery</b> = right answers out of the <b>last 20</b> in a topic, so old mistakes fade out.
        </li>
        <li>
          A <b>Buddy Help</b> answer counts as <b>half</b> right.
        </li>
        <li>
          It shows after <b>8 answers</b>. One good round isn&rsquo;t mastery yet.
        </li>
        <li>
          <b>Under 50%</b> in any topic → <b>Needs help</b>. 70% or more is green.
        </li>
      </ol>
    </>
  )
}

function Mini({ level }: { level: LevelName }) {
  return <span className={`${styles.mini} ${TONE[level]}`}>{LEVEL_NAME[level]}</span>
}

function Dot({ a }: { a: LevelAnswer }) {
  if (a.helped)
    return (
      <span className={`${styles.ans} ${styles.ansHelp}`} role="img" aria-label="Buddy Help">
        ?
      </span>
    )
  return (
    <span className={`${styles.ans} ${a.right ? styles.ansOk : styles.ansNo}`} role="img" aria-label={a.right ? 'right' : 'wrong'}>
      {a.right ? <Check size={15} strokeWidth={3.2} aria-hidden="true" /> : <X size={15} strokeWidth={3.2} aria-hidden="true" />}
    </span>
  )
}

function Dots({ answers }: { answers: LevelAnswer[] }) {
  return (
    <span className={styles.dots}>
      {answers.map((a, i) => (
        <Dot key={i} a={a} />
      ))}
    </span>
  )
}

function CheckBox({ c }: { c: LevelCheck }) {
  const line = checkLine(c)
  return (
    <div className={styles.check}>
      <span className={styles.checkLabel}>
        Answers {c.from}
        {c.to > c.from ? `–${c.to}` : ''}
      </span>
      <Dots answers={c.answers} />
      <span className={styles.checkOut}>
        {line.stays === null ? (
          <>{line.score} · too few for a check</>
        ) : (
          <>
            {line.score} → {line.stays && 'stays '}
            <Mini level={line.level} />
            {line.note && ` (${line.note})`}
          </>
        )}
      </span>
    </div>
  )
}

function RoundDetail({ topic, round, onClose }: { topic: string; round: LevelRound; onClose: () => void }) {
  const end = endLine(round)
  const game = round.game as TemplateId
  return (
    <aside className={`${styles.side} ${styles.detail}`} aria-label="Round detail">
      <div className={styles.detailTop}>
        {gameThumbs[game] && <img src={gameThumbs[game]} alt="" className={styles.detailThumb} />}
        <div>
          <h3 className={`${styles.sideTitle} ${styles.detailTitle}`} tabIndex={-1} data-detail-title>
            {gameName(round.game)} · {playedLabel(round.endedAt)}
          </h3>
          <p className={styles.sideSub}>
            {topic} · {phTime(round.endedAt)} · {roundMinutes(round.startedAt, round.endedAt)}
          </p>
        </div>
        <button type="button" className={styles.closeX} aria-label="Close the round detail" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.startLine}>
        Started on <Mini level={round.startLevel} />
      </p>

      {round.checks.length > 0 ? (
        round.checks.map((c) => <CheckBox key={c.from} c={c} />)
      ) : (
        <div className={styles.check}>
          <span className={styles.checkLabel}>All answers</span>
          <Dots answers={round.answers} />
        </div>
      )}

      <div className={styles.endBox}>
        <span className={styles.checkLabel}>End of round</span>
        <strong>{reasonScore(round.reason)}</strong>
        <span>
          {end.lead}, so the next round {end.verb} <Mini level={end.level} />
          {end.note && ` (${end.note})`}
        </span>
      </div>

      <p className={styles.legend}>
        <span>
          <span aria-hidden="true"><Dot a={{ right: true, helped: false }} /></span> right
        </span>
        <span>
          <span aria-hidden="true"><Dot a={{ right: false, helped: false }} /></span> wrong
        </span>
        <span>
          <span aria-hidden="true"><Dot a={{ right: true, helped: true }} /></span> Buddy Help (counts as not right)
        </span>
      </p>
    </aside>
  )
}

