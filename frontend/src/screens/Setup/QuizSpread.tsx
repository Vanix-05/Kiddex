import { useId, type CSSProperties } from 'react'
import { quizQuestions } from '../../setup/quizData'
import type { SpreadMode } from './bookPages'
import styles from './Quiz.module.css'

/** How each of the 4 bubbles looks: tilt, size, offset and float speed. */
const BUBBLE_LOOKS = [
  { tilt: -6, width: 90, x: 0, y: -10, text: 1.05, float: 3.4, delay: 0, tint: 'lavender' },
  { tilt: 5, width: 86, x: 12, y: 8, text: 0.95, float: 3.9, delay: 0.7, tint: 'peach' },
  { tilt: 4, width: 84, x: 10, y: -4, text: 1, float: 3.6, delay: 1.3, tint: 'pink' },
  { tilt: -4, width: 96, x: 2, y: 10, text: 1.1, float: 4.2, delay: 0.4, tint: 'periwinkle' },
] as const

/** Where each bubble's cell sits (book pixels): the left column on the left
    page, the right column on the right page. */
const CELLS = [
  [100, 160],
  [690, 160],
  [100, 420],
  [690, 420],
] as const

const total = quizQuestions.length

const look = (i: number) => {
  const l = BUBBLE_LOOKS[i]
  return {
    left: `${CELLS[i][0]}px`,
    top: `${CELLS[i][1]}px`,
    '--tilt': `${l.tilt}deg`,
    '--w': `${l.width}%`,
    '--x': `${l.x}%`,
    '--y': `${l.y}%`,
    '--text': l.text,
    '--float': `${l.float}s`,
    '--float-delay': `${-l.delay}s`,
  } as CSSProperties
}

interface QuizSpreadProps {
  mode: SpreadMode
  /** Which question (0 = the first). */
  index: number
  /** The bubble just tapped: it pops and the others fade. */
  popped: number | null
  onChoose?: (answerIndex: number) => void
}

/**
 * One quiz question: the question across the top and 4 floating bubbles,
 * two on each page. Tapping one pops it (POP_MS) and fades the others, then
 * SetupBook turns the page. Drawn in the open book's own pixels.
 */
export function QuizSpread({ mode, index, popped, onChoose }: QuizSpreadProps) {
  const titleId = useId()
  const question = quizQuestions[index]
  const live = mode === 'live'

  return (
    <>
      <p className="visually-hidden">
        Question {index + 1} of {total}
      </p>
      <h2
        id={titleId}
        className={[styles.question, popped !== null && styles.questionGone].filter(Boolean).join(' ')}
        tabIndex={-1}
        data-page-title={live || undefined}
      >
        {question.question}
      </h2>

      <div role="group" aria-labelledby={titleId}>
        {question.answers.map((answer, i) => {
          // The copy turning away shows the page as it was left: bubbles gone.
          const state =
            popped === null ? 'idle' : popped !== i ? 'faded' : live ? 'popped' : 'gone'
          return (
            <div key={answer.text} className={styles.cell} style={look(i)}>
              <div className={styles.float}>
                <button
                  type="button"
                  className={[styles.bubble, styles[BUBBLE_LOOKS[i].tint]].join(' ')}
                  data-state={state}
                  onClick={() => onChoose?.(i)}
                  tabIndex={state === 'idle' ? undefined : -1}
                >
                  {answer.text}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <span className={styles.pageNumber} aria-hidden="true">
        Page {index + 1} of {total}
      </span>
    </>
  )
}
