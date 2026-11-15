import { useId, type CSSProperties } from 'react'
import { storybookArt } from '../../assets/art'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { quizQuestions } from '../../setup/quizData'
import type { SpreadMode } from './bookPages'
import { Doodle, PencilArrow, PickStamp, ProgressStar, Tape } from './storyParts'
import page from './StoryPage.module.css'
import styles from './Quiz.module.css'

/** Each answer card's tint (kept from the old bubbles) and tilt, in answer order. */
const CARD_LOOKS = [
  { tint: '--color-tint-lavender', tilt: -1.5 },
  { tint: '--color-tint-peach', tilt: 1.2 },
  { tint: '--color-tint-pink', tilt: 1 },
  { tint: '--color-tint-periwinkle', tilt: -1.2 },
] as const

const total = quizQuestions.length

interface QuizSpreadProps {
  mode: SpreadMode
  /** Which question (0 = the first). */
  index: number
  /** The answer picked on this page (index into its answers), if any. */
  picked: number | null
  onPick?: (answerIndex: number) => void
  onNext?: () => void
  onBack?: () => void
}

/**
 * One quiz question, as a still picture page. Left page: "Question N of 5",
 * the question and its scene picture, Back. Right page: "Pick one!", 4
 * picture cards (a radio group) and Next (Finish on the last question).
 * Tapping a card only picks it; Next turns the page (SetupBook).
 * Drawn in the open book's own pixels (1216 x 748).
 */
export function QuizSpread({ mode, index, picked, onPick, onNext, onBack }: QuizSpreadProps) {
  const titleId = useId()
  const question = quizQuestions[index]
  const live = mode === 'live'
  const last = index === total - 1

  return (
    <>
      {/* ---------- Left page ---------- */}
      <div className={styles.progress}>
        <span className={`${page.hand} ${styles.chip}`}>
          Question {index + 1} of {total}
        </span>
        <span className={styles.stars} aria-hidden="true">
          {quizQuestions.map((q, i) => (
            <ProgressStar key={q.question} done={i <= index} />
          ))}
        </span>
      </div>

      <h2 id={titleId} className={`${page.hand} ${page.title} ${styles.question}`} tabIndex={-1} data-page-title={live || undefined}>
        {question.question}
      </h2>

      <div className={styles.scene}>
        <img src={storybookArt.scenes[index]} alt="" className={styles.scenePicture} draggable={false} />
      </div>
      <Tape className={styles.sceneTape} />
      <Doodle kind="heart" x={530} y={196} size={26} color="var(--color-story-girl)" />
      <Doodle kind="sparkle" x={64} y={590} size={26} color="var(--color-story-star)" />

      <button type="button" className={`${page.hand} ${page.back} ${styles.back}`} onClick={onBack}>
        <Icon name="arrowLeft" size={26} />
        <span>Back</span>
      </button>

      {/* ---------- Right page ---------- */}
      <p className={`${page.hand} ${styles.pickOne}`} aria-hidden="true">
        Pick one! <PencilArrow />
      </p>

      <div role="radiogroup" aria-labelledby={titleId} className={styles.cards}>
        {question.answers.map((answer, i) => {
          const selected = picked === i
          const look = CARD_LOOKS[i]
          return (
            <label
              key={answer.text}
              className={[page.pickCard, styles.card, selected && page.picked].filter(Boolean).join(' ')}
              style={{ '--tilt': `${look.tilt}deg`, background: `var(${look.tint})` } as CSSProperties}
            >
              <input
                type="radio"
                name={`answer-${titleId}`}
                value={i}
                checked={selected}
                onChange={() => onPick?.(i)}
                className={page.radio}
              />
              <span className={styles.art}>
                <img src={storybookArt.answers[index][i]} alt="" draggable={false} />
              </span>
              <span className={`${page.hand} ${styles.label}`}>{answer.text}</span>
              {selected && <PickStamp small />}
            </label>
          )
        })}
      </div>

      <Button withArrow onClick={onNext} disabled={picked === null} className={`${page.next} ${styles.next}`}>
        {last ? 'Finish' : 'Next'}
      </Button>
    </>
  )
}
