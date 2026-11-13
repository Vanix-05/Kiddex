import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { BookLeftPage } from '../StoryBook/BookLeftPage'
import { BookRightPage } from '../StoryBook/BookRightPage'
import { StoryBook } from '../StoryBook/StoryBook'
import { ENTER_MS, LAND_MS, LEAVE_MS, TURN_MS, type BookPhase, type Step } from '../StoryBook/timing'
import { CoverOllie, WelcomeCover, type StudentKind } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { CodeStep } from './CodeStep'
import { LoadingVideo } from './LoadingVideo'
import { Padlock } from './Padlock'

/** The step tabs on the right edge of the book, for each kind of student. */
const STEP_LABELS: Record<StudentKind, readonly string[]> = {
  new: ['School ID', 'One-time code', 'PIN code'],
  returning: ['School ID', 'PIN code'],
}

/** Ollie's page (the left page) for each step: his title and his one line. */
const OLLIE_SAYS: Record<StudentKind, readonly { title: string; line: string }[]> = {
  new: [
    { title: 'Hi, I’m Ollie!', line: 'This is your storybook. First, your School ID.' },
    { title: 'Now your one-time code!', line: 'Your teacher gave it to you.' },
    { title: 'Make your own PIN code!', line: 'Don’t share it with anyone.' },
  ],
  returning: [
    { title: 'Welcome back!', line: 'Type your School ID.' },
    { title: 'Now your PIN code!', line: 'The one you made last time.' },
  ],
}

const ignoreTyping = () => {}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Everything "I'm a Student" opens, drawn over the login screen without
 * changing the URL: one storybook. Closed, it is the "Welcome, Student!"
 * popup; open, it shows the New Student set-up steps or the Returning
 * Student login steps, one per spread (Ollie's page left, the step right).
 * What the student types is kept here only (fake login, no backend yet).
 */
export function StudentFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<BookPhase>('choose')
  const [kind, setKind] = useState<StudentKind>('new')
  // Ollie's pop-in and greeting wave only play the first time the popup opens.
  const [popupIntro, setPopupIntro] = useState(true)
  const coverTitleId = useId()
  const firstPlateRef = useRef<HTMLButtonElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [turningFrom, setTurningFrom] = useState<Step | null>(null)
  // Ollie has landed in the open book, but taps are ignored a moment longer.
  const [settling, setSettling] = useState(false)
  const [fadedIn, setFadedIn] = useState(false)
  const [bounceKey, setBounceKey] = useState(0)
  const [talkKey, setTalkKey] = useState(0)

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

  /** Ollie arrives on a page: his small hop, and he says his line. */
  const ollieArrives = () => {
    setBounceKey((k) => k + 1)
    setTalkKey((k) => k + 1)
  }

  // ---------- Closed book <-> open book ----------

  /** "Start here" / "Log in": the book opens and Ollie flies into it. */
  const startSteps = (next: StudentKind) => {
    if (phase !== 'choose') return // ignore double taps
    if (next !== kind) {
      setKind(next)
      setStep(1)
    }
    setFadedIn(false)
    if (reducedMotion()) {
      setPhase('steps')
      ollieArrives()
      return
    }
    setPhase('enter')
    after(LAND_MS, () => {
      setPhase('steps')
      setSettling(true)
      ollieArrives()
      after(ENTER_MS - LAND_MS, () => setSettling(false))
    })
  }

  /** Back on step 1: the book closes and is the popup again. */
  const closeBook = () => {
    setPopupIntro(false)
    if (reducedMotion()) {
      setPhase('choose')
      return
    }
    setPhase('back')
    after(LEAVE_MS, () => setPhase('choose'))
  }

  // ---------- Step to step ----------

  const still = phase === 'steps' && turningFrom === null && !settling

  /** Next: the right page turns over the spine, the next step is underneath. */
  const turnTo = (next: Step) => {
    if (!still) return // ignore taps while anything moves
    setFadedIn(false)
    setStep(next)
    if (reducedMotion()) {
      ollieArrives()
      return
    }
    setTurningFrom(step)
    after(TURN_MS, () => {
      setTurningFrom(null)
      ollieArrives()
    })
  }

  /** Back: a quick fade to the previous step. Typed values are kept. */
  const goBack = () => {
    if (!still) return
    if (step === 1) {
      closeBook()
      return
    }
    setFadedIn(!reducedMotion())
    ollieArrives()
    setLoggingIn(false)
    setStep((s) => (s - 1) as Step)
  }

  const finish = () => {
    if (still) setLoading(true)
  }

  /** Returning Student "Log in": any School ID and PIN code work (fake login). */
  const logIn = () => {
    if (!still) return
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

  /** Ollie's page. Step s is pages 2s-1 (left) and 2s (right). */
  const renderLeft = (s: Step, ollie: ReactNode) => {
    const says = OLLIE_SAYS[kind][s - 1]
    return <BookLeftPage chapter={s} title={says.title} line={says.line} pageNumber={s * 2 - 1} ollie={ollie} />
  }

  const renderRight = (s: Step, live: boolean, titleId?: string) =>
    kind === 'returning' ? renderReturningStep(s, live, titleId) : renderNewStep(s, live, titleId)

  const typePinTitle = (
    <>
      Type your <strong>PIN code</strong>
    </>
  )

  /** Returning Student: School ID, then the PIN code they made before. */
  const renderReturningStep = (s: Step, live: boolean, titleId?: string) => {
    const page = { titleId, onBack: goBack, pageNumber: s * 2 }
    if (s === 1) {
      return (
        <BookRightPage {...page} title="Hi, Student!">
          <CodeStep
            hint={
              <>
                Welcome back! Type the <strong>School ID</strong> on your login card.
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
        </BookRightPage>
      )
    }
    return (
      <BookRightPage
        {...page}
        title={typePinTitle}
        corner={<Padlock open={loggingIn} />}
        help={
          <>
            Forgot your PIN code? <strong>Ask your teacher</strong>
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
          submitLabel="Log in"
          onSubmit={logIn}
          active={live && !loggingIn}
        />
      </BookRightPage>
    )
  }

  /** New Student: School ID, one-time code, then make a PIN code. */
  const renderNewStep = (s: Step, live: boolean, titleId?: string) => {
    const page = { titleId, onBack: goBack, pageNumber: s * 2 }
    if (s === 1) {
      return (
        <BookRightPage {...page} title="Hi, Student!">
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
        </BookRightPage>
      )
    }
    if (s === 2) {
      return (
        <BookRightPage {...page} title="Hi, Student!">
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
        </BookRightPage>
      )
    }
    return (
      <BookRightPage {...page} title={typePinTitle} corner={<Padlock open={pin.length === 4} />}>
        <CodeStep
          hint="Pick 4 numbers you can remember."
          label="PIN code"
          groups={[4]}
          value={pin}
          onChange={setPin}
          masked
          large
          submitLabel="Done!"
          onSubmit={finish}
          active={live && !loading}
        />
      </BookRightPage>
    )
  }

  return (
    <>
      <StoryBook
        phase={phase}
        cover={
          <WelcomeCover
            titleId={coverTitleId}
            firstPlateRef={firstPlateRef}
            onStart={startSteps}
            onClose={onClose}
            pressing={phase === 'enter' ? kind : undefined}
          />
        }
        coverTitleId={coverTitleId}
        coverOllie={<CoverOllie intro={popupIntro} leaving={phase === 'enter'} />}
        coverFocusRef={firstPlateRef}
        tabs={STEP_LABELS[kind]}
        step={step}
        turningFrom={turningFrom}
        settling={settling}
        fadedIn={fadedIn}
        bounceKey={bounceKey}
        talkKey={talkKey}
        renderLeft={renderLeft}
        renderRight={renderRight}
        onClose={onClose}
      />
      {loading && <LoadingVideo onDone={startQuiz} />}
    </>
  )
}
