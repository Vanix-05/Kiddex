import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { ollieQuizDone, quizQuestions, type QuizAnswer } from '../../setup/quizData'
import { quizMemory } from '../../setup/quizMemory'
import { pickBuddy } from '../../setup/scoring'
import { SetupStage } from './SetupStage'
import { PageContent, StoryBook, TURN_MS } from './StoryBook'
import type { QuizResumeState, SetupState } from './setupState'
import styles from './Quiz.module.css'

/** Tapped bubble pops, the others fade. Must match `bubble-pop` in Quiz.module.css. */
const POP_MS = 420

/** How each of the 4 bubbles looks: tilt, size, offset and float speed. */
const BUBBLE_LOOKS = [
  { tilt: -6, width: 90, x: 0, y: -10, text: 1.05, float: 3.4, delay: 0, tint: 'lavender' },
  { tilt: 5, width: 86, x: 12, y: 8, text: 0.95, float: 3.9, delay: 0.7, tint: 'peach' },
  { tilt: 4, width: 84, x: 10, y: -4, text: 1, float: 3.6, delay: 1.3, tint: 'pink' },
  { tilt: -4, width: 96, x: 2, y: 10, text: 1.1, float: 4.2, delay: 0.4, tint: 'periwinkle' },
] as const

type Phase = 'ask' | 'popping' | 'turning' | 'leaving'

const total = quizQuestions.length

/**
 * Setup step 1 (/setup): a 5-page storybook quiz that picks a buddy.
 * Picks live only in memory and are never saved; only the winning buddy id is
 * passed on (router state). "← Back" on the gender page reopens the last
 * question (see quizMemory).
 */
export function QuizStep() {
  const navigate = useNavigate()
  const location = useLocation()
  // Picks so far: the first 4 when coming back from the gender page, else none.
  const [startPicks] = useState(() => {
    const resume = (location.state as Partial<QuizResumeState> | null)?.resumeLastQuestion
    const earlier = quizMemory.recall()
    if (resume && earlier.length === total - 1) return earlier
    quizMemory.forget()
    return []
  })
  const [index, setIndex] = useState(startPicks.length)
  const [phase, setPhase] = useState<Phase>('ask')
  const [popped, setPopped] = useState<number | null>(null)
  const picks = useRef<QuizAnswer[]>(startPicks)
  const timers = useRef<number[]>([])
  const questionRef = useRef<HTMLHeadingElement>(null)
  const firstShow = useRef(true)

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // Keyboard/screen-reader focus follows the new question (the tapped bubble is gone).
  useEffect(() => {
    if (firstShow.current) {
      firstShow.current = false
      return
    }
    questionRef.current?.focus()
  }, [index])

  const question = quizQuestions[index]
  const isLast = index === total - 1

  const choose = (answerIndex: number) => {
    if (phase !== 'ask') return
    picks.current = [...picks.current.slice(0, index), question.answers[answerIndex]]
    setPopped(answerIndex)
    setPhase('popping')

    if (isLast) {
      // Turn to the gender page; Ollie's line carries on there.
      later(POP_MS, () => setPhase('leaving'))
      later(POP_MS + TURN_MS, () => {
        quizMemory.remember(picks.current.slice(0, total - 1))
        const state: SetupState = { matchedBuddy: pickBuddy(picks.current) }
        navigate(paths.setup.gender, { state })
      })
      return
    }

    later(POP_MS, () => setPhase('turning'))
    // Halfway through the turn, the next page's question takes over.
    later(POP_MS + TURN_MS / 2, () => {
      setPopped(null)
      setIndex(index + 1)
    })
    later(POP_MS + TURN_MS, () => setPhase('ask'))
  }

  const look = (i: number) => {
    const l = BUBBLE_LOOKS[i]
    return {
      '--tilt': `${l.tilt}deg`,
      '--w': `${l.width}%`,
      '--x': `${l.x}%`,
      '--y': `${l.y}%`,
      '--text': l.text,
      '--float': `${l.float}s`,
      '--float-delay': `${-l.delay}s`,
    } as CSSProperties
  }

  return (
    <SetupStage
      title="Let’s find your buddy!"
      ollieSays={phase === 'leaving' ? ollieQuizDone : question.ollie}
    >
      <StoryBook
        turning={phase === 'turning' || phase === 'leaving' ? 'forward' : null}
        pageNumber={`Page ${index + 1} of ${total}`}
      >
        <PageContent
          key={index}
          afterTurn={phase === 'turning'}
          enter={startPicks.length > 0 && index === startPicks.length}
          leaving={phase === 'leaving'}
        >
          <p className="visually-hidden">
            Question {index + 1} of {total}
          </p>
          <h2
            ref={questionRef}
            id="quiz-question"
            className={[styles.question, phase === 'popping' && styles.questionGone].filter(Boolean).join(' ')}
            tabIndex={-1}
          >
            {question.question}
          </h2>
          <div className={styles.bubbles} role="group" aria-labelledby="quiz-question">
            {question.answers.map((answer, i) => {
              const state = popped === null ? 'idle' : popped === i ? 'popped' : 'faded'
              return (
                <div key={answer.text} className={styles.cell} style={look(i)}>
                  <div className={styles.float}>
                    <button
                      type="button"
                      className={[styles.bubble, styles[BUBBLE_LOOKS[i].tint]].join(' ')}
                      data-state={state}
                      onClick={() => choose(i)}
                      tabIndex={state === 'idle' ? undefined : -1}
                    >
                      {answer.text}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </PageContent>
      </StoryBook>
    </SetupStage>
  )
}
