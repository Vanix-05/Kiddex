import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { FeedbackStrip } from '../FeedbackStrip'
import { GameFrame, GameIcon, ProgressPill, type DotState } from '../GameFrame'
import { MissionPill, ResultsBoard } from '../ResultsScreen'
import { useRoundEnd, type RoundSummary } from '../roundEnd'
import { MatchCornerScene } from '../scenes/MatchCornerScene'
import { decisionLine, makeResult } from '../session'
import type { GameProps } from '../types'
import { useGameProgress } from '../useGameProgress'
import { SLOTS, useCalmMotion, useStageFit } from '../useStage'
import { cardOf, clearMiss, demoMatch, done, isTied, records, startMatch, tap, tryPair, type MatchRound, type Side } from './matchRound'
import styles from './MatchUp.module.css'

/** Card rows and columns inside the board, in design px (normal and short windows). */
const GEO = {
  normal: { cardTop: 112, cardH: 70, step: 82, leftX: 66, rightX: 470, cardW: 260 },
  short: { cardTop: 70, cardH: 48, step: 52, leftX: 30, rightX: 324, cardW: 250 },
}

/** Each tied pair takes the next color. */
const PAIR_COLORS = ['teal', 'pink', 'yellow', 'blue', 'purple'] as const

const DRAG_START = 8

/** The time of a tap (only ever called from event handlers). */
const clock = () => Date.now()

interface Drag {
  side: Side
  id: string
  pointerId: number
  x0: number
  y0: number
  x: number
  y: number
  moved: boolean
}

/**
 * Match Up: tie each prompt (left) to its partner (right) with yarn. Tap a
 * card, then its partner; or drag from one pin to another. A wrong pair turns
 * coral with a hint until Okay. Right only counts on the first try.
 */
export function MatchUp({ player, lesson, cards, lessonCanPlay, demo, onLeave, onPlayGame }: GameProps) {
  const stage = useStageFit()
  const calm = useCalmMotion()
  const { levelFor } = useGameProgress()
  const endRound = useRoundEnd('match-up', lessonCanPlay)
  const topic = cards[0]?.topic ?? lesson.name

  const [round, setRound] = useState<MatchRound>(() =>
    demo === 'picked' || demo === 'miss' ? demoMatch(cards, levelFor(topic), demo, Date.now()) : startMatch(cards, levelFor(topic), Date.now()),
  )
  const [summary, setSummary] = useState<RoundSummary | null>(() => {
    if (demo !== 'results') return null
    // Dev Results: a finished board, one pair tied on the second try.
    let r = round
    r.left.forEach((id, i) => {
      if (i === 0) r = clearMiss(tryPair(r, id, r.left[1], id, r.startedAt))
      r = tryPair(r, id, id, id, r.startedAt)
    })
    return endRound(makeResult('match-up', lesson.id, topic, r.startedAt, r.startedAt, records(r)), r.startLevel, false)
  })
  const [jump, setJump] = useState(0)
  const [lastTie, setLastTie] = useState(false)
  const [confetti, setConfetti] = useState<number | null>(demo === 'results' ? 1 : null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const ignoreClick = useRef(false)

  const geo = stage.short ? GEO.short : GEO.normal
  const slots = stage.short ? SLOTS.short : SLOTS.normal
  const n = round.cards.length
  const offset = ((5 - n) * geo.step) / 2
  const rowY = (i: number) => geo.cardTop + offset + i * geo.step
  const pin = (side: Side, id: string) => {
    const i = (side === 'left' ? round.left : round.right).indexOf(id)
    return { x: side === 'left' ? geo.leftX + geo.cardW : geo.rightX, y: rowY(i) + geo.cardH / 2 }
  }

  const apply = (next: MatchRound) => {
    const tiedNow = next.tied.length > round.tied.length
    setRound(next)
    setLastTie(tiedNow)
    if (tiedNow) setJump((j) => j + 1)
  }

  // Every pair tied: a moment to see the finished board, then Results.
  const allDone = done(round)
  useEffect(() => {
    if (!allDone || summary) return
    const t = window.setTimeout(() => {
      const result = makeResult('match-up', lesson.id, topic, round.startedAt, Date.now(), records(round))
      setSummary(endRound(result, round.startLevel, !demo))
      setJump((j) => j + 1)
      setConfetti(1)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [allDone, summary, round, lesson.id, topic, endRound, demo])

  const restart = () => {
    setSummary(null)
    setConfetti(null)
    setLastTie(false)
    setRound(startMatch(cards, levelFor(topic), Date.now()))
  }

  // ---------- Drag from a card (or its pin) to its partner ----------

  /** Pointer position in board design px. */
  const toBoard = (e: PointerEvent) => {
    const rect = boardRef.current!.getBoundingClientRect()
    const scale = rect.width / slots.board.w
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  const onPointerDown = (e: PointerEvent, side: Side, id: string) => {
    if (round.miss || isTied(round, id) || e.button !== 0) return
    const p = toBoard(e)
    setDrag({ side, id, pointerId: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false })
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    const p = toBoard(e)
    const moved = drag.moved || Math.hypot(p.x - drag.x0, p.y - drag.y0) > DRAG_START
    // Capture only once it's a drag: capturing on press would send a tap's click to the board.
    if (moved && !drag.moved) boardRef.current?.setPointerCapture(e.pointerId)
    setDrag({ ...drag, x: p.x, y: p.y, moved })
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    setDrag(null)
    if (!drag.moved) return // a tap: the click handles it
    ignoreClick.current = true
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-card]')
    const side = target?.dataset.side as Side | undefined
    const id = target?.dataset.card
    if (!side || !id || side === drag.side || isTied(round, id)) return
    const now = Date.now()
    apply(side === 'left' ? tryPair(round, id, drag.id, drag.id, now) : tryPair(round, drag.id, id, drag.id, now))
  }

  const onTap = (side: Side, id: string) => {
    if (ignoreClick.current) {
      ignoreClick.current = false
      return
    }
    apply(tap(round, side, id, clock()))
  }

  // ---------- Frame ----------

  const common = {
    game: 'match-up' as const,
    lessonName: lesson.name,
    stage,
    calm,
    scene: <MatchCornerScene />,
    player,
    onRestart: restart,
    onLeave,
  }

  if (summary) {
    const missed = round.cards.filter((c) => (round.tries[c.id] ?? 0) !== 1).slice(0, 2)
    return (
      <GameFrame
        {...common}
        mode="results"
        progress={<MissionPill games={summary.mission.games} done={summary.mission.done} next={summary.nextGame} />}
        tallBoard
        confetti={confetti}
        ollieLine={decisionLine(summary.decision, summary.right, summary.total)}
        happy
        jump={jump}
        kidLine="We did it!"
        board={
          <CorkBoard w={slots.tall.w} h={slots.tall.h} sheet>
            <ResultsBoard
              game="match-up"
              name={player.name}
              summary={summary}
              compact={stage.short}
              lookAgain={missed.map((c) => ({ prompt: `${c.prompt} →`, answer: c.answer }))}
              onPlayAgain={restart}
              onNext={() => (summary.nextGame ? onPlayGame(summary.nextGame) : onLeave())}
            />
          </CorkBoard>
        }
      />
    )
  }

  const colorOf = (id: string) => PAIR_COLORS[round.tied.indexOf(id) % PAIR_COLORS.length]
  const firstOpen = round.left.find((id) => !isTied(round, id))
  const dots: DotState[] = round.left.map((id) =>
    isTied(round, id) ? ((round.tries[id] ?? 0) === 1 ? 'right' : 'wrong') : id === firstOpen ? 'current' : 'todo',
  )
  const miss = round.miss
  const missHint = miss ? cardOf(round, miss.left)?.explanation : undefined
  const picked = round.picked
  const otherSide = picked?.side === 'left' ? 'right' : 'left'

  const ollieLine = miss
    ? 'So close! Look at the hint, then pick again.'
    : picked
      ? `Nice pick! Now tap its partner on the ${otherSide}.`
      : allDone
        ? 'All tied up! Great work.'
        : lastTie
          ? `You tied them! ${n - round.tied.length} to go.`
          : 'Tie each one to its partner. Tap a card to start.'

  const cardButton = (side: Side, id: string, i: number) => {
    const card = cardOf(round, id)!
    const tied = isTied(round, id)
    const isPicked = picked?.side === side && picked.id === id
    const isMiss = !!miss && (side === 'left' ? miss.left === id : miss.right === id)
    const state = tied ? styles[`pair_${colorOf(id)}`] : isMiss ? (calm ? styles.missCalm : `${styles.miss} ${side === 'left' ? styles.missL : styles.missR}`) : isPicked ? styles.picked : ''
    const text = side === 'left' ? card.prompt : card.answer
    return (
      <button
        key={id}
        type="button"
        data-card={id}
        data-side={side}
        className={`${styles.card} ${side === 'left' ? styles.cardL : styles.cardR} ${state}`}
        style={{ left: side === 'left' ? geo.leftX : geo.rightX, top: rowY(i), width: geo.cardW, height: geo.cardH }}
        aria-pressed={isPicked}
        aria-disabled={tied || !!miss}
        aria-label={`${text}${tied ? ', tied' : ''}${isMiss ? ', not partners' : ''}`}
        onPointerDown={(e) => onPointerDown(e, side, id)}
        onClick={() => onTap(side, id)}
      >
        <span className={styles.cardText}>{text}</span>
        <span className={styles.pin} aria-hidden="true" />
      </button>
    )
  }

  // The picked card's short hanging yarn, or the yarn following a drag.
  const loose = drag?.moved ? { from: pin(drag.side, drag.id), to: { x: drag.x, y: drag.y }, side: drag.side } : null
  const hanging = !loose && picked ? pin(picked.side, picked.id) : null
  // The hanging yarn stays in the gap between the columns.
  const hangX = Math.min(74, (geo.rightX - geo.leftX - geo.cardW) * 0.6) * (picked?.side === 'left' ? 1 : -1)
  const hangY = stage.short ? 28 : 40

  return (
    <GameFrame
      {...common}
      mode="play"
      progress={<ProgressPill label={`${round.tied.length} of ${n} matched`} dots={dots} />}
      ollieLine={ollieLine}
      happy={lastTie && !miss}
      jump={jump}
      kidLine={miss ? 'We can do it!' : lastTie ? 'Yay!' : undefined}
      strip={
        miss ? (
          <FeedbackStrip key={`${miss.left}-${miss.right}`} tone="hint" title="Not partners. Try another one!" action="Okay" onAction={() => setRound(clearMiss(round))}>
            <b>Hint:</b> {missHint ?? 'Look at both words again.'}
          </FeedbackStrip>
        ) : null
      }
      board={
        <CorkBoard w={slots.board.w} h={slots.board.h} teacher={lesson.teacher} subject={cards[0]?.subject ?? lesson.subject}>
          <div ref={boardRef} className={styles.play} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
            <svg className={styles.yarns} viewBox={`0 0 ${slots.board.w} ${slots.board.h}`} aria-hidden="true">
              {round.tied.map((id) => {
                const a = pin('left', id)
                const b = pin('right', id)
                return <Yarn key={id} from={a} to={b} color={`var(--color-pair-${colorOf(id)}-yarn)`} />
              })}
              {loose && <Yarn from={loose.from} to={loose.to} color="var(--color-yarn-picked)" />}
              {hanging && (
                <>
                  <Yarn
                    from={hanging}
                    to={{ x: hanging.x + hangX, y: hanging.y + hangY }}
                    color="var(--color-yarn-picked)"
                    sag
                  />
                  <circle
                    cx={hanging.x + hangX}
                    cy={hanging.y + hangY}
                    r="9"
                    fill="var(--color-yarn-picked)"
                    stroke="var(--color-card-border)"
                    strokeWidth="2.5"
                  />
                </>
              )}
            </svg>
            <div className={styles.column} role="group" aria-label="Left cards">
              {round.left.map((id, i) => cardButton('left', id, i))}
            </div>
            <div className={styles.column} role="group" aria-label="Right cards">
              {round.right.map((id, i) => cardButton('right', id, i))}
            </div>
          </div>
        </CorkBoard>
      }
    />
  )
}

/** A curvy piece of yarn between two points (a dashed light twist on top). */
function Yarn({ from, to, color, sag }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; sag?: boolean }) {
  const dx = (to.x - from.x) * 0.5
  const d = sag
    ? `M${from.x} ${from.y} C${from.x + dx * 0.4} ${from.y + 30} ${to.x - dx * 0.6} ${to.y + 12} ${to.x} ${to.y}`
    : `M${from.x} ${from.y} C${from.x + dx} ${from.y} ${to.x - dx} ${to.y} ${to.x} ${to.y}`
  return (
    <g>
      <path d={d} fill="none" stroke="var(--color-card-border)" strokeWidth="9" strokeLinecap="round" opacity="0.35" />
      <path d={d} fill="none" stroke={color} strokeWidth="6.5" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--color-input-bg)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 7" opacity="0.85" />
    </g>
  )
}

/** Match Up's board: a wooden frame with cork inside, and the cream note at the top. */
function CorkBoard({
  w,
  h,
  teacher,
  subject,
  sheet,
  children,
}: {
  w: number
  h: number
  teacher?: string
  subject?: string
  /** Results: a cream sheet pinned on the cork. */
  sheet?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.frame} style={{ width: w, height: h }}>
      <div className={styles.cork}>
        {teacher && (
          <div className={styles.note}>
            <GameIcon game="match-up" size={18} />
            <span className={styles.noteTitle}>Tie each one to its partner</span>
            <span className={styles.noteFrom}>
              From {teacher} · {subject}
            </span>
          </div>
        )}
        {sheet ? <div className={styles.sheet}>{children}</div> : children}
      </div>
    </div>
  )
}
