import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { PawPrint } from 'lucide-react'
import { STREAK_FOR_HELP, streakLine } from '../buddyHelp'
import { FeedbackStrip } from '../FeedbackStrip'
import { GameFrame, ProgressPill, type DotState } from '../GameFrame'
import { MissionPill, ResultsBoard } from '../ResultsScreen'
import { useRoundEnd, useStartLevel, type RoundSummary } from '../roundEnd'
import { MatchCornerScene } from '../scenes/MatchCornerScene'
import { decisionLine, makeResult } from '../session'
import type { GameProps } from '../types'
import { slotsFor, useCalmMotion, useStageFit } from '../useStage'
import {
  answer,
  current,
  finished,
  helpBlocked,
  isRight,
  next,
  records,
  takeBuddyHelp,
  wasHelped,
  type QuizDemo,
  type QuizQuestion,
} from '../quiz-show/quizRound'
import { demoBlank, firstLetter, hintLine, letterHint, spokenPrompt, splitPrompt, startBlank, wordSize } from './blankRound'
import styles from './FillBlank.module.css'

const BLANK_DEMOS: readonly QuizDemo[] = ['question', 'right', 'wrong', 'results', 'help-used', 'help-earned', 'help-none']

const SIZE_CLASS = { normal: '', small: styles.small, smaller: styles.smaller }

/**
 * Fill the Blank: up to 8 sentences with one blank on a classroom chalkboard.
 * Tap the word that fits (one of 3); a wrong pick shows the right word and why.
 * No timer, no lives. The round is Quiz Show's (same card picking, level and
 * Buddy Help rules); Buddy Help here whispers the right word's first letter.
 * Keys: 1–3 pick, Enter = Next / Got it, H = Buddy Help (GameFrame).
 */
export function FillBlank({ player, lesson, cards, lessonCanPlay, demo, preview, leaveTo, onLeave, onPlayGame }: GameProps) {
  const stage = useStageFit()
  const calm = useCalmMotion()
  // A Teacher preview starts on easy and saves nothing (roundEnd.ts).
  const levelFor = useStartLevel(preview)
  const endRound = useRoundEnd('fill-blank', lessonCanPlay, preview)
  const topic = cards[0]?.topic ?? lesson.name

  const [round, setRound] = useState(() => {
    const now = Date.now()
    if (!demo) return startBlank(cards, levelFor(topic), now)
    const at = BLANK_DEMOS.find((d) => d === demo) ?? 'question'
    return demoBlank(cards, levelFor(topic), at, now)
  })
  // Dev Results screen: the played-out demo round, not saved.
  const [summary, setSummary] = useState<RoundSummary | null>(() =>
    demo === 'results'
      ? endRound(makeResult(round.id, 'fill-blank', lesson.id, topic, round.startedAt, round.startedAt, records(round), round.help.used), round.startLevel, false)
      : null,
  )
  const [jump, setJump] = useState(0)
  const [confetti, setConfetti] = useState<number | null>(demo === 'right' || demo === 'help-earned' || demo === 'results' ? 1 : null)
  // A new number: the Buddy Help button glows (a help was just earned).
  const [glow, setGlow] = useState(demo === 'help-earned' ? 1 : 0)
  const tiles = useRef<HTMLDivElement>(null)
  const slotWord = useRef<HTMLSpanElement>(null)

  const q = current(round)
  const answered = q?.picked != null
  const rightSoFar = round.asked.filter((a) => a.right).length

  const pick = useCallback(
    (word: string) => {
      if (!q || q.picked !== null) return
      const nextRound = answer(round, word, Date.now())
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
      const result = makeResult(round.id, 'fill-blank', lesson.id, topic, round.startedAt, Date.now(), records(round), round.help.used)
      setSummary(endRound(result, round.startLevel, !demo, setSummary))
      setJump((j) => j + 1)
      setConfetti(1)
      return
    }
    setRound(next(round, Date.now()))
  }, [answered, round, lesson.id, topic, endRound, demo])

  const restart = () => {
    setSummary(null)
    setConfetti(null)
    setRound(startBlank(cards, levelFor(topic), Date.now()))
  }

  /** Buddy Help: the first letter in the slot. False when the buddy can't help now. */
  const giveHelp = () => {
    const helped = takeBuddyHelp(round)
    if (helped === round) return false
    setRound(helped)
    return true
  }

  // The tapped word slides from its tile into the slot (not with reduced motion).
  const picked = q?.picked ?? null
  const slidFor = useRef(picked === null ? -1 : round.asked.length)
  useLayoutEffect(() => {
    if (picked === null || slidFor.current === round.asked.length) return
    slidFor.current = round.asked.length
    const word = slotWord.current
    const index = q?.choices.indexOf(picked) ?? -1
    const tile = tiles.current?.children[index] as HTMLElement | undefined
    if (calm || !word || !tile || typeof word.animate !== 'function') return
    const from = tile.getBoundingClientRect()
    const to = word.getBoundingClientRect()
    const dx = (from.left + from.width / 2 - (to.left + to.width / 2)) / stage.scale
    const dy = (from.top + from.height / 2 - (to.top + to.height / 2)) / stage.scale
    word.animate([{ transform: `translate(${dx}px, ${dy}px) scale(1.08)` }, { transform: 'none' }], {
      duration: 340,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    })
  }, [picked, round.asked.length, q, calm, stage.scale])

  // The next sentence: keyboard focus moves to its first word (not when the game opens).
  const asked = round.asked.length
  const firstAsked = useRef(asked)
  useEffect(() => {
    if (!summary && asked !== firstAsked.current) tiles.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [asked, summary])

  // Keys: 1–3 pick a word, Enter goes on (the strip's button also has focus).
  useEffect(() => {
    if (summary) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !q) return
      const i = ['1', '2', '3', '4'].indexOf(e.key)
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
    game: 'fill-blank' as const,
    lessonName: lesson.name,
    stage,
    calm,
    scene: <MatchCornerScene />,
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
        confetti={confetti}
        buddyLine={decisionLine(summary.decision, summary.right, summary.total)}
        happy
        jump={jump}
        kidLine="We did it!"
        board={
          <ChalkBoard w={slots.tall.w} h={slots.tall.h} sheet>
            <ResultsBoard
              game="fill-blank"
              leaveTo={leaveTo}
              preview={preview}
              buddyName={player.buddyName}
              summary={summary}
              compact={stage.short}
              lookAgain={wrong.map((a) => ({ prompt: a.card.prompt, answer: a.card.answer }))}
              onPlayAgain={restart}
              onNext={() => (summary.nextGame ? onPlayGame(summary.nextGame) : onLeave())}
            />
          </ChalkBoard>
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
  const wrongPick = answered && !q.right

  // The buddy says every line (Ollie isn't in the games).
  const buddyLine = right
    ? round.helpEvent === 'earned'
      ? '3 in a row! You earned a Buddy Help.'
      : round.helpEvent === 'full'
        ? '3 in a row! Great job!'
        : `You filled it in! That is ${rightSoFar} right so far.`
    : wrongPick
      ? 'Good try! Now we know this one.'
      : q.hinted
        ? hintLine(q.card.answer)
        : round.help.helps > 0
          ? 'Tap the word that fits. Tap me if you get stuck!'
          : 'Tap the word that fits. Take your time.'

  // Buddy Help: once per sentence, before it's answered.
  const blocked = helpBlocked(round)
  const help = {
    count: round.help.helps,
    // Just finished 3 in a row: the dots show full for that moment.
    streak: round.helpEvent ? STREAK_FOR_HELP : round.help.streak,
    line: streakLine(round.help, round.helpEvent),
    disabled: blocked === 'none-left' || blocked === 'used',
    glow,
    onUse: giveHelp,
  }

  return (
    <GameFrame
      {...common}
      mode="play"
      progress={<ProgressPill label={`Sentence ${asked} of ${round.total}`} dots={dots} />}
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
        ) : wrongPick ? (
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
        <ChalkBoard w={slots.board.w} h={slots.board.h}>
          <Sentence
            q={q}
            number={asked}
            teacher={lesson.teacher}
            subject={q.card.subject}
            buddyName={player.buddyName}
            tilesRef={tiles}
            slotWordRef={slotWord}
            onPick={pick}
          />
        </ChalkBoard>
      }
    />
  )
}

/** The board: a green chalkboard in a wooden frame. Results: a cream sheet on the chalkboard. */
function ChalkBoard({ w, h, sheet, children }: { w: number; h: number; sheet?: boolean; children: ReactNode }) {
  return (
    <div className={styles.frame} style={{ width: w, height: h }}>
      <div className={styles.chalk}>{sheet ? <div className={styles.sheet}>{children}</div> : children}</div>
    </div>
  )
}

function Sentence({
  q,
  number,
  teacher,
  subject,
  buddyName,
  tilesRef,
  slotWordRef,
  onPick,
}: {
  q: QuizQuestion
  number: number
  teacher: string
  subject: string
  buddyName: string
  tilesRef: RefObject<HTMLDivElement | null>
  slotWordRef: RefObject<HTMLSpanElement | null>
  onPick: (word: string) => void
}) {
  const answered = q.picked !== null
  const parts = splitPrompt(q.card.prompt)
  const slotState = answered ? (q.right ? styles.slotRight : styles.slotWrong) : q.hinted ? styles.slotHint : ''
  const hint = letterHint(q.card.answer)

  const slot = (
    <span className={`${styles.slot} ${slotState}`}>
      {answered ? (
        <span ref={slotWordRef} className={`${styles.slotWord} ${SIZE_CLASS[wordSize(q.picked!)]}`}>
          {q.picked}
        </span>
      ) : q.hinted ? (
        <span className={styles.slotHintText}>
          {hint.slice(0, -1)}
          <span className={styles.hintDots}>…</span>
        </span>
      ) : (
        <span className={styles.slotEmpty}>?</span>
      )}
    </span>
  )

  // Said once the slot changes: the picked word, or the buddy's first letter.
  const slotNote = answered ? `Filled in: ${q.picked}.` : q.hinted ? `${buddyName} says it starts with ${firstLetter(q.card.answer)}.` : ''

  return (
    <div className={styles.play}>
      <div className={styles.head}>
        <span className={styles.num} aria-hidden="true">
          {number}
        </span>
        <span className={styles.ask}>Tap the word that fits</span>
        {wasHelped(q) && (
          <span className={styles.helpedTag}>
            <PawPrint size={14} strokeWidth={2.6} fill="currentColor" aria-hidden="true" /> {buddyName} helped
          </span>
        )}
        <span className={styles.from}>
          From {teacher} · {subject}
        </span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.sentence}>
          <span className="visually-hidden">{spokenPrompt(q.card.prompt)}</span>
          <span aria-hidden="true">
            {parts.hasBlank ? (
              <>
                {parts.lead}
                <span className={styles.join}>
                  {parts.joinBefore}
                  {slot}
                  {parts.joinAfter}
                </span>
                {parts.rest}
              </>
            ) : (
              // No ___ in the sentence: the slot goes at the end.
              <>
                {parts.lead} {slot}
              </>
            )}
          </span>
        </h1>
        <p className="visually-hidden" aria-live="polite">
          {slotNote}
        </p>
      </div>

      <div ref={tilesRef} className={styles.tiles} role="group" aria-label="Words">
        {q.choices.map((word, i) => {
          const isAnswer = isRight(q.card, word)
          const isPicked = word === q.picked
          // The tapped word went into the slot: its place stays as a dashed empty spot.
          if (answered && isPicked) return <span key={word} className={styles.spot} aria-hidden="true" />
          const state = !answered ? '' : isAnswer ? styles.rightShown : styles.faded
          return (
            <button
              key={word}
              type="button"
              className={`${styles.tile} ${SIZE_CLASS[wordSize(word)]} ${state}`}
              disabled={answered}
              aria-label={`${i + 1}: ${word}${answered && isAnswer ? ', right answer' : ''}`}
              onClick={() => onPick(word)}
            >
              {answered && isAnswer && <span className={styles.rightTag}>Right answer</span>}
              <span className={styles.word}>{word}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
