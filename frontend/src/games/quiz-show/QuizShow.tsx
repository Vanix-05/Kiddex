import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Check, PawPrint, X } from 'lucide-react'
import { STREAK_FOR_HELP, streakLine } from '../buddyHelp'
import { FeedbackStrip } from '../FeedbackStrip'
import { GameFrame, ProgressPill, type DotState } from '../GameFrame'
import { MissionPill, ResultsBoard } from '../ResultsScreen'
import { useRoundEnd, useStartLevel, type RoundSummary } from '../roundEnd'
import { StageScene } from '../scenes/StageScene'
import { decisionLine, makeResult } from '../session'
import type { GameProps } from '../types'
import { slotsFor, useCalmMotion, useStageFit } from '../useStage'
import { MarqueeBoard } from './MarqueeBoard'
import {
  answer,
  current,
  demoQuiz,
  finished,
  helpBlocked,
  next,
  records,
  startQuiz,
  takeBuddyHelp,
  wasHelped,
  type QuizDemo,
  type QuizQuestion,
} from './quizRound'
import styles from './QuizShow.module.css'

const LETTERS = ['A', 'B', 'C', 'D'] as const

/**
 * Quiz Show: up to 8 multiple-choice cards on a theater stage. One pick per
 * question; a wrong pick shows the right answer and why. No timer, no lives.
 * The Student's buddy guides, and Buddy Help knocks one wrong choice away.
 * Keys: 1–4 or A–D pick, Enter = Next / Got it, H = Buddy Help (GameFrame).
 */
const QUIZ_DEMOS: readonly QuizDemo[] = ['question', 'right', 'wrong', 'results', 'help-used', 'help-earned', 'help-none']
export function QuizShow({ player, lesson, cards, lessonCanPlay, demo, preview, leaveTo, onLeave, onPlayGame }: GameProps) {
  const stage = useStageFit()
  const calm = useCalmMotion()
  // A Teacher preview starts on easy and saves nothing (roundEnd.ts).
  const levelFor = useStartLevel(preview)
  const endRound = useRoundEnd('quiz-show', lessonCanPlay, preview)
  const topic = cards[0]?.topic ?? lesson.name

  const [round, setRound] = useState(() => {
    const now = Date.now()
    if (!demo) return startQuiz(cards, levelFor(topic), now)
    const at = QUIZ_DEMOS.find((d) => d === demo) ?? 'question'
    return demoQuiz(cards, levelFor(topic), at, now)
  })
  // Dev Results screen: the played-out demo round, not saved.
  const [summary, setSummary] = useState<RoundSummary | null>(() =>
    demo === 'results'
      ? endRound(makeResult('quiz-show', lesson.id, topic, round.startedAt, round.startedAt, records(round), round.help.used), round.startLevel, false)
      : null,
  )
  const [jump, setJump] = useState(0)
  const [confetti, setConfetti] = useState<number | null>(demo === 'right' || demo === 'help-earned' || demo === 'results' ? 1 : null)
  // A new number: the Buddy Help button glows (a help was just earned).
  const [glow, setGlow] = useState(demo === 'help-earned' ? 1 : 0)
  const tiles = useRef<HTMLDivElement>(null)

  const q = current(round)
  const answered = q?.picked != null
  const rightSoFar = round.asked.filter((a) => a.right).length

  const pick = useCallback(
    (choice: string) => {
      if (!q || q.picked !== null) return
      const nextRound = answer(round, choice, Date.now())
      if (nextRound === round) return
      setRound(nextRound)
      if (nextRound.helpEvent === 'earned') setGlow((g) => g + 1)
      if (current(nextRound).right) {
        setJump((j) => j + 1)
        setConfetti((c) => (c ?? 0) + 1)
      } else {
        setConfetti(null)
      }
    },
    [q, round],
  )

  const goOn = useCallback(() => {
    if (!answered) return
    setConfetti(null)
    if (finished(round)) {
      const result = makeResult('quiz-show', lesson.id, topic, round.startedAt, Date.now(), records(round), round.help.used)
      setSummary(endRound(result, round.startLevel, !demo))
      setJump((j) => j + 1)
      setConfetti(1)
      return
    }
    setRound(next(round, Date.now()))
  }, [answered, round, lesson.id, topic, endRound, demo])

  const restart = () => {
    setSummary(null)
    setConfetti(null)
    setRound(startQuiz(cards, levelFor(topic), Date.now()))
  }

  /** Buddy Help: one wrong choice knocked away. False when the buddy can't help now. */
  const giveHelp = () => {
    const helped = takeBuddyHelp(round)
    if (helped === round) return false
    setRound(helped)
    return true
  }

  // The next question: keyboard focus moves to its first answer (not when the game opens).
  const asked = round.asked.length
  const firstAsked = useRef(asked)
  useEffect(() => {
    if (!summary && asked !== firstAsked.current) tiles.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [asked, summary])

  // Keys: 1–4 / A–D pick an answer, Enter goes on (the strip's button also has focus).
  useEffect(() => {
    if (summary) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !q) return
      const k = e.key.toLowerCase()
      const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k)
      if (i >= 0 && i < q.choices.length && !answered) {
        e.preventDefault()
        pick(q.choices[i])
      } else if (e.key === 'Enter' && answered && !(document.activeElement instanceof HTMLButtonElement)) {
        e.preventDefault()
        goOn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, answered, pick, goOn, summary])

  const slots = slotsFor(stage)
  const common = {
    game: 'quiz-show' as const,
    lessonName: lesson.name,
    stage,
    calm,
    scene: <StageScene />,
    player,
    preview,
    onRestart: restart,
    onLeave,
  }

  if (summary) {
    const wrong = round.asked.filter((a) => !a.right).slice(0, 2)
    return (
      <GameFrame
        {...common}
        mode="results"
        progress={
          summary.mission.games.length > 0 ? <MissionPill games={summary.mission.games} done={summary.mission.done} next={summary.nextGame} /> : null
        }
        tallBoard
        spotlight
        confetti={confetti}
        buddyLine={decisionLine(summary.decision, summary.right, summary.total)}
        happy
        jump={jump}
        kidLine="We did it!"
        board={
          <MarqueeBoard w={slots.tall.w} h={slots.tall.h} band={stage.short ? 14 : 24}>
            <ResultsBoard
              game="quiz-show"
              leaveTo={leaveTo}
              preview={preview}
              buddyName={player.buddyName}
              summary={summary}
              compact={stage.short}
              lookAgain={wrong.map((a) => ({ prompt: a.card.prompt, answer: a.card.answer }))}
              onPlayAgain={restart}
              onNext={() => (summary.nextGame ? onPlayGame(summary.nextGame) : onLeave())}
            />
          </MarqueeBoard>
        }
      />
    )
  }

  const dots: DotState[] = Array.from({ length: round.total }, (_, i) => {
    const a = round.asked[i]
    if (!a) return 'todo'
    if (a.picked === null) return 'current'
    return a.right ? 'right' : 'wrong'
  })
  const right = answered && q.right
  const wrong = answered && !q.right

  // The buddy says every line (Ollie isn't in the games).
  const buddyLine = right
    ? round.helpEvent === 'earned'
      ? '3 in a row! You earned a Buddy Help.'
      : round.helpEvent === 'full'
        ? '3 in a row! Great job!'
        : `What a star! That is ${rightSoFar} right so far.`
    : wrong
      ? 'Good try! Now we know this one.'
      : q.removed
        ? `Sniff, sniff… it is not ${LETTERS[q.choices.indexOf(q.removed)]}! Now you pick.`
        : round.help.helps > 0
          ? 'Take your time. Tap me if you get stuck!'
          : 'Take your time. There is no timer.'

  // Buddy Help: once per question, before it's answered; never down to fewer than 2 choices.
  const blocked = helpBlocked(round)
  const help = {
    count: round.help.helps,
    // Just finished 3 in a row: the dots show full for that moment.
    streak: round.helpEvent ? STREAK_FOR_HELP : round.help.streak,
    line: blocked === 'two-choices' && round.help.helps > 0 ? 'Can’t help on this one' : streakLine(round.help, round.helpEvent),
    // After an answer it stays orange (nothing to help with until the next question).
    disabled: blocked === 'none-left' || blocked === 'used' || blocked === 'two-choices',
    glow,
    onUse: giveHelp,
  }

  return (
    <GameFrame
      {...common}
      mode="play"
      progress={<ProgressPill label={`Question ${asked} of ${round.total}`} dots={dots} />}
      spotlight={!!right}
      confetti={right ? confetti : null}
      buddyLine={buddyLine}
      help={help}
      happy={!!right}
      jump={jump}
      kidLine={right ? 'Yay!' : undefined}
      strip={
        right ? (
          <FeedbackStrip key={`ok${asked}`} tone="right" title="Correct!" action={finished(round) ? 'See results' : 'Next'} onAction={goOn}>
            {q.card.explanation}
          </FeedbackStrip>
        ) : wrong ? (
          <FeedbackStrip key={`no${asked}`} tone="hint" title={`Not quite. The answer is ${q.card.answer}.`} action="Got it" onAction={goOn}>
            {q.card.explanation && (
              <>
                <b>Why:</b> {q.card.explanation}
              </>
            )}
          </FeedbackStrip>
        ) : null
      }
      board={
        <MarqueeBoard w={slots.board.w} h={slots.board.h} band={stage.short ? 14 : 24}>
          <Question
            q={q}
            number={asked}
            teacher={lesson.teacher}
            subject={q.card.subject}
            buddyName={player.buddyName}
            tilesRef={tiles}
            onPick={pick}
            calm={calm}
          />
        </MarqueeBoard>
      }
    />
  )
}

function Question({
  q,
  number,
  teacher,
  subject,
  buddyName,
  tilesRef,
  onPick,
  calm,
}: {
  q: QuizQuestion
  number: number
  teacher: string
  subject: string
  buddyName: string
  tilesRef: RefObject<HTMLDivElement | null>
  onPick: (choice: string) => void
  calm: boolean
}) {
  const answered = q.picked !== null
  return (
    <div className={styles.question}>
      <div className={styles.head}>
        <span className={styles.num} aria-hidden="true">
          {number}
        </span>
        <span className={styles.ask}>Pick the best answer</span>
        {wasHelped(q) && (
          <span className={styles.helpedTag}>
            <PawPrint size={14} strokeWidth={2.6} fill="currentColor" aria-hidden="true" /> {buddyName} helped
          </span>
        )}
        <span className={styles.from}>
          From {teacher} · {subject}
        </span>
      </div>
      <h1 className={styles.prompt}>{q.card.prompt}</h1>
      <div ref={tilesRef} className={styles.tiles} role="group" aria-label="Answers">
        {q.choices.map((choice, i) => {
          const isAnswer = choice.replace(/\s+/g, '').toLowerCase() === q.card.answer.replace(/\s+/g, '').toLowerCase()
          const isPicked = choice === q.picked
          // Buddy Help knocked this wrong choice away: it can't be picked.
          const knocked = choice === q.removed
          const state = knocked
            ? calm
              ? `${styles.knocked} ${styles.knockedCalm}`
              : styles.knocked
            : !answered
              ? ''
              : isAnswer
                ? isPicked
                  ? styles.right
                  : styles.rightShown
                : isPicked
                  ? calm
                    ? styles.wrongCalm
                    : styles.wrong
                  : styles.faded
          return (
            <button
              key={choice}
              type="button"
              className={`${styles.tile} ${state}`}
              disabled={answered || knocked}
              aria-label={`${LETTERS[i]}: ${choice}${knocked ? `, not this one (${buddyName} helped)` : ''}${answered && isAnswer ? ', right answer' : ''}${answered && isPicked && !isAnswer ? ', your pick, not right' : ''}`}
              onClick={() => onPick(choice)}
            >
              <span className={`${styles.letter} ${styles[`letter${LETTERS[i]}`]}`} aria-hidden="true">
                {LETTERS[i]}
              </span>
              <span className={styles.choice}>{choice}</span>
              {answered && isAnswer && isPicked && (
                <span className={styles.check} aria-hidden="true">
                  <Check size={24} strokeWidth={3.4} />
                </span>
              )}
              {answered && isAnswer && !isPicked && <span className={styles.rightTag}>Right answer</span>}
              {knocked && (
                <span className={styles.notThis} aria-hidden="true">
                  <PawPrint size={14} strokeWidth={2.6} fill="currentColor" /> Not this one
                </span>
              )}
              {answered && isPicked && !isAnswer && (
                <span className={styles.cross} aria-hidden="true">
                  <X size={24} strokeWidth={3.4} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
