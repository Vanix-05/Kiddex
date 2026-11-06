import { useEffect, useRef, useState } from 'react'
import { NotebookPage } from '../NotebookPage/NotebookPage'
import { WelcomeStudentPopup, type PopupRects } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { CodeStep } from './CodeStep'
import { Padlock } from './Padlock'
import { ENTER_MS, LEAVE_MS, NewStudentScreen, TURN_MS, type Step } from './NewStudentScreen'

/**
 * choose = the "Welcome, Student!" popup
 * enter  = "Start here" transition into the New Student steps
 * steps  = the New Student steps (School ID, one-time code, PIN code)
 * back   = the steps fading out over the popup (Back on step 1)
 */
type Phase = 'choose' | 'enter' | 'steps' | 'back'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Everything "I'm a Student" opens, drawn over the login screen without
 * changing the URL: the popup, then (New Student) the three set-up steps.
 * What the student types is kept here only (fake login, no backend yet).
 */
export function StudentFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [from, setFrom] = useState<PopupRects | null>(null)
  // The popup's pop-in and wave only play the first time it opens.
  const [popupIntro, setPopupIntro] = useState(true)

  const [step, setStep] = useState<Step>(1)
  const [turningFrom, setTurningFrom] = useState<Step | null>(null)
  const [fadedIn, setFadedIn] = useState(false)
  const [bounceKey, setBounceKey] = useState(0)

  const [schoolId, setSchoolId] = useState('')
  const [oneTimeCode, setOneTimeCode] = useState('')
  const [pin, setPin] = useState('')

  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const after = (ms: number, then: () => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(then, ms)
  }

  // ---------- Popup <-> steps ----------

  const startNewStudent = (rects: PopupRects) => {
    if (phase !== 'choose') return // ignore double taps
    if (reducedMotion()) {
      setPhase('steps')
      return
    }
    setFrom(rects)
    setPhase('enter')
    after(ENTER_MS, () => setPhase('steps'))
  }

  const backToPopup = () => {
    setPopupIntro(false)
    if (reducedMotion()) {
      setPhase('choose')
      return
    }
    setPhase('back')
    after(LEAVE_MS, () => setPhase('choose'))
  }

  // ---------- Step to step ----------

  /** Next: the current page turns up and away, the next step is underneath. */
  const turnTo = (next: Step) => {
    if (turningFrom !== null) return // ignore taps while a page turns
    setFadedIn(false)
    setBounceKey((k) => k + 1)
    if (!reducedMotion()) {
      setTurningFrom(step)
      after(TURN_MS, () => setTurningFrom(null))
    }
    setStep(next)
  }

  /** Back: a quick fade to the previous step. Typed values are kept. */
  const goBack = () => {
    if (turningFrom !== null) return
    if (step === 1) {
      backToPopup()
      return
    }
    setFadedIn(!reducedMotion())
    setBounceKey((k) => k + 1)
    setStep((s) => (s - 1) as Step)
  }

  const finish = () => {
    // TODO: go to the loading page (not built yet). The School ID, one-time
    // code and PIN code are in this component's state (schoolId, oneTimeCode, pin).
  }

  // ---------- Pages ----------

  const renderStep = (s: Step, live: boolean, titleId?: string) => {
    const page = { titleId, step: s, onBack: goBack, subtitle: 'Let’s set up your account.' }
    if (s === 1) {
      return (
        <NotebookPage {...page} title="Hi, Student!">
          <CodeStep
            hint={
              <>
                Type the <strong>School ID</strong> on your login card.
              </>
            }
            label="School ID"
            groups={[4, 4]}
            value={schoolId}
            onChange={setSchoolId}
            submitLabel="Next"
            onSubmit={() => turnTo(2)}
            active={live}
          />
        </NotebookPage>
      )
    }
    if (s === 2) {
      return (
        <NotebookPage {...page} title="Hi, Student!">
          <CodeStep
            hint={
              <>
                Type the <strong>one-time code</strong> on your login card. You only need it once!
              </>
            }
            label="One-time code"
            groups={[3, 3]}
            value={oneTimeCode}
            onChange={setOneTimeCode}
            submitLabel="Next"
            onSubmit={() => turnTo(3)}
            active={live}
          />
        </NotebookPage>
      )
    }
    // PIN code: no "Let's set up your account." line, just the hint.
    return (
      <NotebookPage
        {...page}
        subtitle={undefined}
        longTitle
        title={
          <>
            Type your <strong>PIN code</strong>
          </>
        }
      >
        <CodeStep
          hint="Pick 4 numbers you can remember."
          label="PIN code"
          groups={[4]}
          value={pin}
          onChange={setPin}
          masked
          large
          art={<Padlock open={pin.length === 4} />}
          submitLabel="Done!"
          onSubmit={finish}
          active={live}
        />
      </NotebookPage>
    )
  }

  return (
    <>
      {(phase === 'choose' || phase === 'back') && (
        <WelcomeStudentPopup onClose={onClose} onStartNewStudent={startNewStudent} intro={popupIntro} />
      )}
      {phase !== 'choose' && (
        <NewStudentScreen
          mode={phase === 'enter' ? 'enter' : phase === 'back' ? 'leave' : 'shown'}
          from={from}
          step={step}
          turningFrom={turningFrom}
          fadedIn={fadedIn}
          bounceKey={bounceKey}
          renderStep={renderStep}
        />
      )}
    </>
  )
}
