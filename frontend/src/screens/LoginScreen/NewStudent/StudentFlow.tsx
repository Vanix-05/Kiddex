import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { NotebookPage } from '../NotebookPage/NotebookPage'
import { WelcomeStudentPopup, type PopupRects, type StudentKind } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { CodeStep } from './CodeStep'
import { LoadingVideo } from './LoadingVideo'
import { Padlock } from './Padlock'
import { ENTER_MS, LEAVE_MS, NewStudentScreen, TURN_MS, type Step } from './NewStudentScreen'

/**
 * choose = the "Welcome, Student!" popup
 * enter  = "Start here" / "Log in" transition into the steps
 * steps  = the New Student steps (School ID, one-time code, PIN code)
 *          or the Returning Student steps (School ID, PIN code)
 * back   = the steps fading out over the popup (Back on step 1)
 */
type Phase = 'choose' | 'enter' | 'steps' | 'back'

/** The sticky notes on the notebook page, for each kind of student. */
const STEP_LABELS: Record<StudentKind, readonly string[]> = {
  new: ['School ID', 'One-time code', 'PIN code'],
  returning: ['School ID', 'PIN code'],
}

const ignoreTyping = () => {}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Everything "I'm a Student" opens, drawn over the login screen without
 * changing the URL: the popup, then the New Student set-up steps or the
 * Returning Student login steps. Both share the same pages, flip and Back.
 * What the student types is kept here only (fake login, no backend yet).
 */
export function StudentFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [kind, setKind] = useState<StudentKind>('new')
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
  // Returning Student: the PIN code they made before, and Log in tapped.
  const [loginPin, setLoginPin] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  // Done! plays the loading video, then the first-time setup (quiz) starts.
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { logInNewStudent } = useSession()

  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const after = (ms: number, then: () => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(then, ms)
  }

  // ---------- Popup <-> steps ----------

  const startSteps = (next: StudentKind, rects: PopupRects) => {
    if (phase !== 'choose') return // ignore double taps
    if (next !== kind) {
      setKind(next)
      setStep(1)
    }
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
    setLoggingIn(false)
    setStep((s) => (s - 1) as Step)
  }

  const finish = () => {
    if (turningFrom === null) setLoading(true)
  }

  /** Returning Student "Log in": any School ID and PIN code work (fake login). */
  const logIn = () => {
    if (turningFrom !== null) return
    setLoggingIn(true) // the padlock opens
    // TODO: real login + go to the Main Profile
  }

  /** After the loading video: log in (fake, no backend yet) and start the quiz. */
  const startQuiz = () => {
    // TODO: send the School ID, one-time code and new PIN code (oneTimeCode,
    // pin) to the backend once it exists.
    logInNewStudent(`${schoolId.slice(0, 4)}-${schoolId.slice(4)}`)
    navigate(paths.setup.quiz)
  }

  // ---------- Pages ----------

  const renderStep = (s: Step, live: boolean, titleId?: string) =>
    kind === 'returning' ? renderReturningStep(s, live, titleId) : renderNewStep(s, live, titleId)

  /** Returning Student: School ID, then the PIN code they made before. */
  const renderReturningStep = (s: Step, live: boolean, titleId?: string) => {
    const page = { titleId, step: s, steps: STEP_LABELS.returning, onBack: goBack }
    if (s === 1) {
      return (
        <NotebookPage {...page} title="Hi, Student!" subtitle="Welcome back!">
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
    return (
      <NotebookPage
        {...page}
        longTitle
        title={
          <>
            Type your <strong>PIN code</strong>
          </>
        }
        help={
          <>
            Forgot your PIN code? <strong>Ask your teacher</strong> <span aria-hidden="true">🙋</span>
          </>
        }
      >
        <CodeStep
          hint="The 4 numbers you made."
          label="PIN code"
          groups={[4]}
          value={loginPin}
          // After Log in, the number pad no longer changes the PIN code.
          onChange={loggingIn ? ignoreTyping : setLoginPin}
          masked
          large
          art={<Padlock open={loggingIn} />}
          submitLabel="Log in"
          onSubmit={logIn}
          active={live && !loggingIn}
        />
      </NotebookPage>
    )
  }

  /** New Student: School ID, one-time code, then make a PIN code. */
  const renderNewStep = (s: Step, live: boolean, titleId?: string) => {
    const page = { titleId, step: s, steps: STEP_LABELS.new, onBack: goBack, subtitle: 'Let’s set up your account.' }
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
          active={live && !loading}
        />
      </NotebookPage>
    )
  }

  return (
    <>
      {(phase === 'choose' || phase === 'back') && (
        <WelcomeStudentPopup onClose={onClose} onStart={startSteps} intro={popupIntro} />
      )}
      {phase !== 'choose' && (
        <NewStudentScreen
          kind={kind}
          mode={phase === 'enter' ? 'enter' : phase === 'back' ? 'leave' : 'shown'}
          from={from}
          step={step}
          turningFrom={turningFrom}
          fadedIn={fadedIn}
          bounceKey={bounceKey}
          renderStep={renderStep}
        />
      )}
      {loading && <LoadingVideo onDone={startQuiz} />}
    </>
  )
}
