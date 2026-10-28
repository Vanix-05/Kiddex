import { useEffect, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { ollieReveal } from '../../setup/quizData'
import { PlainBox, SetupStage } from './SetupStage'
import { quizMemory } from '../../setup/quizMemory'
import { useSetupState, type SetupState } from './setupState'
import styles from './Reveal.module.css'

const TEXT = 'your perfect buddy is...'
/** Each word with the position of its first letter in TEXT (for the pop-in order). */
const WORDS = TEXT.split(' ').map((word, w, all) => ({
  word,
  start: all.slice(0, w).reduce((sum, prev) => sum + prev.length + 1, 0),
}))
// Must match the letter animation in Reveal.module.css.
const LETTER_STAGGER_MS = 45
const LETTER_POP_MS = 450
const LETTERS_DONE_MS = (TEXT.length - 1) * LETTER_STAGGER_MS + LETTER_POP_MS
/** How long the finished line stays up before /setup/pet. */
const HOLD_MS = 2000

/**
 * /setup/reveal (shown after the gender page): the big sticker-text lead-in,
 * then on to /setup/pet with the matched buddy.
 */
export function RevealStep() {
  const navigate = useNavigate()
  const { matchedBuddy, avatar } = useSetupState()

  useEffect(() => {
    if (!matchedBuddy) return
    // No more going back to the quiz from here.
    quizMemory.forget()
    const state: SetupState = { matchedBuddy, ...(avatar && { avatar }) }
    const timer = window.setTimeout(() => navigate(paths.setup.pet, { state }), LETTERS_DONE_MS + HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [matchedBuddy, avatar, navigate])

  // Opened directly, without a quiz result: take the quiz first.
  if (!matchedBuddy) return <Navigate to={paths.setup.quiz} replace />

  return (
    <SetupStage title="Your buddy" ollieSays={ollieReveal}>
      <PlainBox>
        <p className={styles.sticker} aria-label={TEXT}>
          {/* Words stay whole when the line wraps; each letter pops in. */}
          {WORDS.map(({ word, start }) => (
            <span key={start} className={styles.word} aria-hidden="true">
              {[...word].map((letter, i) => (
                <span key={i} className={styles.letter} style={{ '--i': start + i } as CSSProperties}>
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </p>
      </PlainBox>
    </SetupStage>
  )
}
