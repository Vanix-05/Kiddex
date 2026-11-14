import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Check, X } from 'lucide-react'
import { FeedbackStrip } from '../FeedbackStrip'
import { GameFrame, ProgressPill, type DotState } from '../GameFrame'
import { MissionPill, ResultsBoard } from '../ResultsScreen'
import { useRoundEnd, type RoundSummary } from '../roundEnd'
import { StageScene } from '../scenes/StageScene'
import { decisionLine, makeResult } from '../session'
import type { GameProps } from '../types'
import { useGameProgress } from '../useGameProgress'
import { SLOTS, useCalmMotion, useStageFit } from '../useStage'
import { MarqueeBoard } from './MarqueeBoard'
import { answer, current, demoQuiz, finished, next, records, startQuiz, type QuizQuestion } from './quizRound'
import styles from './QuizShow.module.css'

const LETTERS = ['A', 'B', 'C', 'D'] as const

/**
 * Quiz Show: up to 8 multiple-choice cards on a theater stage. One pick per
 * question; a wrong pick shows the right answer and why. No timer, no lives.
 * Keys: 1–4 or A–D pick, Enter = Next / Got it.
 */
export function QuizShow({ player, lesson, cards, lessonCanPlay, demo, leaveTo, onLeave, onPlayGame }: GameProps) {
  const stage = useStageFit()
  const calm = useCalmMotion()
  const { levelFor } = useGameProgress()
  const endRound = useRoundEnd('quiz-show', lessonCanPlay)
  const topic = cards[0]?.topic ?? lesson.name

  const [round, setRound] = useState(() => {
    const now = Date.now()
    if (!demo) return startQuiz(cards, levelFor(topic), now)
    const at = demo === 'results' || demo === 'right' || demo === 'wrong' ? demo : 'question'
    return demoQuiz(cards, levelFor(topic), at, now)
  })
  // Dev Results screen: the played-out demo round, not saved.
  const [summary, setSummary] = useState<RoundSummary | null>(() =>
    demo === 'results' ? endRound(makeResult('quiz-show', lesson.id, topic, round.startedAt, round.startedAt, records(round)), round.startLevel, false) : null,
  )
  const [jump, setJump] = useState(0)
  const [confetti, setConfetti] = useState<number | null>(demo === 'right' || demo === 'results' ? 1 : null)
  const tiles = useRef<HTMLDivElement>(null)

  const q = current(round)
  const answered = q?.picked != null
  const rightSoFar = round.asked.filter((a) => a.right).length

  const pick = useCallback(
    (choice: string) => {
      if (!q || q.picked !== null) return
      const nextRound = answer(round, choice, Date.now())
      setRound(nextRound)
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
      const result = makeResult('quiz-show', lesson.id, topic, round.startedAt, Date.now(), records(round))
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

  const slots = stage.short ? SLOTS.short : SLOTS.normal
  const common = {
    game: 'quiz-show' as const,
    lessonName: lesson.name,
    stage,
    calm,
    scene: <StageScene />,
    player,
    onRestart: restart,
    onLeave,
  }

  if (summary) {
    const wrong = round.asked.filter((a) => !a.right).slice(0, 2)
    return (
      <GameFrame
        {...common}
        mode="results"
        progress={<MissionPill games={summary.mission.games} done={summary.mission.done} next={summary.nextGame} />}
        tallBoard
        spotlight
        confetti={confetti}
        ollieLine={decisionLine(summary.decision, summary.right, summary.total)}
        happy
        jump={jump}
        kidLine="We did it!"
        board={
          <MarqueeBoard w={slots.tall.w} h={slots.tall.h} band={stage.short ? 14 : 24}>
            <ResultsBoard
              game="quiz-show"
              leaveTo={leaveTo}
              name={player.name}
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

  return (
    <GameFrame
      {...common}
      mode="play"
      progress={<ProgressPill label={`Question ${asked} of ${round.total}`} dots={dots} />}
      spotlight={!!right}
      confetti={right ? confetti : null}
      ollieLine={
        right ? `What a star! That is ${rightSoFar} right so far.` : wrong ? 'Good try! Now we know this one.' : `Take your time, ${player.name}. There is no timer.`
      }
      happy={!!right}
      jump={jump}
      kidLine={right ? 'Yay!' : wrong ? `It’s okay, ${player.name}!` : undefined}
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
          <Question q={q} number={asked} teacher={lesson.teacher} subject={q.card.subject} tilesRef={tiles} onPick={pick} calm={calm} />
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
  tilesRef,
  onPick,
  calm,
}: {
  q: QuizQuestion
  number: number
  teacher: string
  subject: string
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
        <span className={styles.from}>
          From {teacher} · {subject}
        </span>
      </div>
      <h1 className={styles.prompt}>{q.card.prompt}</h1>
      <div ref={tilesRef} className={styles.tiles} role="group" aria-label="Answers">
        {q.choices.map((choice, i) => {
          const isAnswer = choice.replace(/\s+/g, '').toLowerCase() === q.card.answer.replace(/\s+/g, '').toLowerCase()
          const isPicked = choice === q.picked
          const state = !answered ? '' : isAnswer ? (isPicked ? styles.right : styles.rightShown) : isPicked ? (calm ? styles.wrongCalm : styles.wrong) : styles.faded
          return (
            <button
              key={choice}
              type="button"
              className={`${styles.tile} ${state}`}
              disabled={answered}
              aria-label={`${LETTERS[i]}: ${choice}${answered && isAnswer ? ', right answer' : ''}${answered && isPicked && !isAnswer ? ', your pick, not right' : ''}`}
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
