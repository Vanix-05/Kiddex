import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { Companion } from '../../companions/Companion'
import { paths } from '../../routes/paths'
import { ollieGenderPicked, ollieQuizDone } from '../../setup/quizData'
import { SetupStage } from './SetupStage'
import { PageContent, StoryBook, TURN_MS, type TurnDirection } from './StoryBook'
import { useSetupState, type Avatar, type QuizResumeState, type SetupState } from './setupState'
import quizStyles from './Quiz.module.css'
import styles from './Gender.module.css'

const AVATARS: { id: Avatar; name: string }[] = [
  { id: 'boy', name: 'Boy' },
  { id: 'girl', name: 'Girl' },
]

/**
 * Setup step 2 (/setup/gender): the next page of the storybook. Pick Boy or
 * Girl, then Next turns the page to /setup/reveal. "← Back" turns back to the
 * last quiz question.
 */
export function GenderStep() {
  const navigate = useNavigate()
  const { matchedBuddy } = useSetupState()
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [turning, setTurning] = useState<TurnDirection | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Opened directly, without a quiz result: take the quiz first.
  if (!matchedBuddy) return <Navigate to={paths.setup.quiz} replace />

  const turnPage = (direction: TurnDirection, then: () => void) => {
    if (turning) return
    setTurning(direction)
    timer.current = window.setTimeout(then, TURN_MS)
  }

  const handleNext = () => {
    if (!avatar) return
    const state: SetupState = { matchedBuddy, avatar }
    turnPage('forward', () => navigate(paths.setup.reveal, { state }))
  }

  const handleBack = () => {
    const state: QuizResumeState = { resumeLastQuestion: true }
    turnPage('back', () => navigate(paths.setup.quiz, { state }))
  }

  return (
    <SetupStage title="Who are you?" ollieSays={avatar ? ollieGenderPicked : ollieQuizDone}>
      <StoryBook turning={turning}>
        <PageContent enter leaving={turning !== null}>
          <h2 id="gender-title" className={quizStyles.question}>
            Who are you?
          </h2>

          {/* One tile on each page. A radio group underneath, so keyboards and
              screen readers get the usual pick-one behavior. Tapping the
              character also picks it (and makes it dance). */}
          <div className={styles.tiles} role="radiogroup" aria-labelledby="gender-title">
            {AVATARS.map(({ id, name }) => {
              const selected = avatar === id
              return (
                <label
                  key={id}
                  className={[styles.tile, styles[id], selected && styles.selected].filter(Boolean).join(' ')}
                  onClick={() => setAvatar(id)}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={id}
                    checked={selected}
                    onChange={() => setAvatar(id)}
                    className="visually-hidden"
                  />
                  <Companion id={id} className={styles.companion} />
                  <span className={styles.name}>{name}</span>
                  {selected && (
                    <span className={styles.check} aria-hidden="true">
                      <Icon name="check" size={22} />
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.back} onClick={handleBack}>
              <Icon name="arrowLeft" size={20} />
              <span>Back</span>
            </button>
            <Button withArrow onClick={handleNext} disabled={!avatar} className={styles.next}>
              Next
            </Button>
          </div>
        </PageContent>
      </StoryBook>
    </SetupStage>
  )
}
