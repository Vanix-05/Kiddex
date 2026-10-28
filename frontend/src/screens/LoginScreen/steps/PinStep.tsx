import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../../../components/Icon/Icon'
import { buddyImage, findLearner } from '../../../mock/learners'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { LoginCard } from '../LoginCard'
import { BackLink, FormError } from './shared'
import { Egg } from './Egg'
import styles from './steps.module.css'

const PIN_LENGTH = 4
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Step 5 (/learner/pin): 4-digit PIN on a big keypad. Any PIN works for now (fake auth). */
export function PinStep() {
  const navigate = useNavigate()
  const { classCode, learnerId, logInLearner } = useSession()
  const learner = findLearner(classCode, learnerId)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const press = useCallback((digit: string) => {
    setError('')
    setPin((p) => (p.length < PIN_LENGTH ? p + digit : p))
  }, [])

  const erase = useCallback(() => {
    setError('')
    setPin((p) => p.slice(0, -1))
  }, [])

  const submit = useCallback(async () => {
    if (submitting || !learner) return
    if (pin.length < PIN_LENGTH) {
      setError('Type all 4 numbers.')
      return
    }
    setSubmitting(true)
    try {
      await logInLearner(pin)
      // No buddy yet: pick one first.
      navigate(learner.buddy ? paths.learner.home : paths.setup.quiz)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPin('')
      setSubmitting(false)
    }
  }, [submitting, learner, pin, logInLearner, navigate])

  // A physical keyboard works too: digits, Backspace and Enter.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') erase()
      else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) submit()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, erase, submit])

  // Nobody picked yet (e.g. opened this page directly): go back to the tiles.
  if (!learner) return <Navigate to={paths.learner.who} replace />

  const image = buddyImage(learner)

  return (
    <LoginCard title={`Hi, ${learner.handle}!`} subtitle="Type your secret PIN" tall>
      <span className={[styles.pinBuddy, styles[learner.tint]].join(' ')} aria-hidden="true">
        {image ? <img src={image} alt="" draggable={false} /> : <Egg className={styles.pinEgg} />}
      </span>

      <div className={styles.dots} role="img" aria-label={`${pin.length} of ${PIN_LENGTH} numbers typed`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={[styles.dot, i < pin.length && styles.dotFilled].filter(Boolean).join(' ')} />
        ))}
      </div>

      <FormError message={error} />

      <div className={styles.keypad}>
        {DIGITS.map((d) => (
          <button key={d} type="button" className={styles.key} onClick={() => press(d)} disabled={submitting}>
            {d}
          </button>
        ))}
        <button type="button" className={styles.key} onClick={erase} disabled={submitting} aria-label="Delete">
          <Icon name="backspace" size={28} />
        </button>
        <button type="button" className={styles.key} onClick={() => press('0')} disabled={submitting}>
          0
        </button>
        <button
          type="button"
          className={[styles.key, styles.keyCheck].join(' ')}
          onClick={submit}
          disabled={submitting}
          aria-label="Done"
        >
          <Icon name="check" size={30} />
        </button>
      </div>

      <BackLink to={paths.learner.who}>That’s not me</BackLink>
    </LoginCard>
  )
}
