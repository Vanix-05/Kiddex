import { useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { preloadBedroom } from '../../../components/Bedroom/pictures'
import { paths } from '../../../routes/paths'
import { preloadLobby } from '../../Lobby/preloadLobby'
import { useSession } from '../../../session/session'
import { ApiError } from '../../../teacher/api/client'
import { BookLeftPage } from '../StoryBook/BookLeftPage'
import { BookKeypadPage, BookRightPage } from '../StoryBook/BookRightPage'
import { StoryBook } from '../StoryBook/StoryBook'
import { ENTER_MS, FINISH_MS, LAND_MS, LEAVE_MS, TURN_MS, type BookPhase, type Step } from '../StoryBook/timing'
import { CoverOllie, WelcomeCover, type StudentKind } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { CodeEntry, CodePadPage, CodeStep, type CodeStepProps } from './CodeStep'
import { Padlock } from './Padlock'
import { usePhoneSideways } from '../../../hooks/usePhoneSideways'

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

/** Ollie's page while a step shows a "didn't match" problem. */
const OLLIE_TRY_AGAIN = { title: 'Let’s try again!', line: 'Every number counts. Take your time.' }

/** After this long waiting for the server, say it may be waking up (like Teacher Login). */
const SLOW_MS = 5000
/** "Too many tries": the button waits this long (the server locks the Student for 5 minutes). */
const LOCK_MS = 5 * 60 * 1000

/** What went wrong on a step: shown in the red box (mockup 7). */
interface LoginProblem {
  step: Step
  /** wrong = didn't match; tries = 429; network = can't reach KIDDEX; other = the server's own message. */
  kind: 'wrong' | 'tries' | 'network' | 'other'
  message?: string
}

const ignoreTyping = () => {}

/** One step of the book: its title, corner picture, help line and code entry. */
interface StepPage {
  title: ReactNode
  corner?: ReactNode
  help?: ReactNode
  /** The code entry (renderRight adds `active`). */
  code: Omit<CodeStepProps, 'active'>
  /** Typing is off (after Log in, the Lobby is on its way; or waiting for the server). */
  locked?: boolean
}

/** Log in: the padlock's shackle pops open (Padlock.module.css), then the Lobby opens. */
const PADLOCK_MS = 550

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Everything "I'm a Student" opens, drawn over the login screen without
 * changing the URL: one storybook. Closed, it is the "Welcome, Student!"
 * popup; open, it shows the New Student set-up steps or the Returning
 * Student login steps, one per spread (Ollie's page left, the step right).
 * The numbers are checked by the backend (session: checkStudentCode,
 * logInNewStudent, logInReturningStudent) before the page turns, the "Done!"
 * fade or the padlock opens. A problem shows in a red box on the step.
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
  // Waiting for the server (the number pad is locked), and "Waking up KIDDEX…" after 5 seconds.
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [problem, setProblem] = useState<LoginProblem | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  // Too many tries: the button waits until then (ms); `now` ticks to show the minutes left.
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  // Done!: the book goes blank, then the first-time setup starts (with its bedroom intro clip).
  const [finishing, setFinishing] = useState(false)
  const navigate = useNavigate()
  // A phone held sideways: the book zooms in and the step is split across the spread.
  const phone = usePhoneSideways()
  const { checkStudentCode, logInNewStudent, logInReturningStudent } = useSession()

  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const after = (ms: number, then: () => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(then, ms)
  }

  // Too many tries: count the minutes down, then let them try again.
  useEffect(() => {
    if (lockedUntil === null) return
    const tick = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= lockedUntil) {
        setLockedUntil(null)
        setProblem((p) => (p?.kind === 'tries' ? null : p))
      }
    }, 10_000)
    return () => window.clearInterval(tick)
  }, [lockedUntil])
  const blocked = lockedUntil !== null && now < lockedUntil
  const minutesLeft = lockedUntil === null ? 0 : Math.max(1, Math.ceil((lockedUntil - now) / 60_000))

  /** Typing a number clears the "didn't match" look (a too-many-tries wait stays). */
  const typing =
    (set: Dispatch<SetStateAction<string>>): Dispatch<SetStateAction<string>> =>
    (value) => {
      setProblem((p) => (p && p.kind !== 'tries' ? null : p))
      set(value)
    }

  /**
   * Runs a login call for this step. While it waits, the pad is locked (and
   * after 5 seconds: "Waking up KIDDEX…"). Answers true when it worked; else
   * the problem shows on the step and `onWrong` runs (e.g. clear the PIN code).
   */
  const askServer = async (at: Step, work: () => Promise<void>, onWrong?: () => void): Promise<boolean> => {
    setBusy(true)
    setProblem(null)
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_MS)
    try {
      await work()
      return true
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      const code = err instanceof ApiError ? err.code : ''
      if (status === 429) {
        const t = Date.now()
        setNow(t)
        setLockedUntil(t + LOCK_MS)
        setProblem({ step: at, kind: 'tries' })
      } else if (status === 401) {
        setProblem({ step: at, kind: 'wrong' })
      } else if (code === 'NETWORK' || status === 0) {
        setProblem({ step: at, kind: 'network' })
      } else {
        setProblem({ step: at, kind: 'other', message: err instanceof ApiError ? err.message : undefined })
      }
      setShakeKey((k) => k + 1)
      onWrong?.()
      return false
    } finally {
      window.clearTimeout(slowTimer)
      setBusy(false)
      setSlow(false)
    }
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
    // A new Student sees the bedroom intro clip after Done!: get its pictures ready
    // now, while they type their numbers (decoding takes a few seconds on a weak laptop).
    if (next === 'new') preloadBedroom()
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

  const still = phase === 'steps' && turningFrom === null && !settling && !finishing && !busy

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
    // After Log in, the Lobby is on its way.
    if (!still || loggingIn) return
    if (step === 1) {
      closeBook()
      return
    }
    setFadedIn(!reducedMotion())
    ollieArrives()
    setLoggingIn(false)
    setProblem((p) => (p?.kind === 'tries' ? p : null))
    setStep((s) => (s - 1) as Step)
  }

  /** New Student, step 2 Next: the server checks the School ID + one-time code first. */
  const checkCode = async () => {
    if (!still || blocked) return
    if (await askServer(2, () => checkStudentCode(schoolId, oneTimeCode))) turnTo(3)
  }

  /**
   * Done!: the PIN code is saved and the Student logged in first; only then do
   * Ollie and the writing fade into the paper. Then the route rules decide
   * (RequireRole): the setup storybook for a Student with no buddy yet, the
   * Lobby for one who already has a buddy and got a New code.
   */
  const finish = async () => {
    if (!still || blocked) return
    const ok = await askServer(3, async () => {
      await logInNewStudent(schoolId, oneTimeCode, pin)
    })
    if (!ok) return
    setFinishing(true)
    after(FINISH_MS, () => navigate(paths.lobby))
  }

  /**
   * Returning Student "Log in": the server checks the School ID + PIN code
   * BEFORE the padlock opens. Then the Lobby opens behind the loading video
   * (screens/Lobby/LazyLobby.tsx). A Student who made a PIN code but closed the
   * tab before picking a buddy is sent to the setup storybook by RequireRole.
   */
  const logIn = async () => {
    if (!still || loggingIn || blocked) return
    if (!/^\d{8}$/.test(schoolId) || !/^\d{4}$/.test(loginPin)) return
    // Start the Lobby's download now; the video starts in a moment.
    void preloadLobby()
    const ok = await askServer(
      2,
      async () => {
        await logInReturningStudent(schoolId, loginPin)
      },
      () => setLoginPin(''),
    )
    if (!ok) return
    setLoggingIn(true) // the padlock opens
    after(reducedMotion() ? 0 : PADLOCK_MS, () => navigate(paths.lobby))
  }

  // ---------- Pages ----------

  const typePinTitle = (
    <>
      Type your <strong>PIN code</strong>
    </>
  )

  /**
   * What each step shows: its title, the corner picture, the help line next
   * to Back, and the code entry. Laptops draw it all on the right page; a
   * phone held sideways splits it across the spread (see renderLeft).
   */
  const stepPage = (s: Step): StepPage => {
    const page = basicStepPage(s)
    const here = problem?.step === s ? problem : null
    const waking = busy && slow ? 'Waking up KIDDEX… this can take up to a minute.' : null
    return {
      ...page,
      code: {
        ...page.code,
        hint: waking ?? page.code.hint,
        error: here ? problemText(here) : undefined,
        bad: here?.kind === 'wrong' || here?.kind === 'tries',
        shakeKey,
        busy,
        blocked,
        submitLabel: busy ? 'Checking…' : page.code.submitLabel,
        onChange: page.code.onChange === ignoreTyping ? ignoreTyping : typing(page.code.onChange),
      },
      locked: page.locked || busy,
    }
  }

  /** The red box's words (mockup 7). */
  const problemText = (p: LoginProblem): ReactNode => {
    if (p.kind === 'tries') {
      return (
        <>
          <strong>Too many tries.</strong> Wait {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}, then try again.
        </>
      )
    }
    if (p.kind === 'network') return <strong>We can’t reach KIDDEX right now. Please try again.</strong>
    if (p.kind === 'other') return <strong>{p.message ?? 'Something went wrong. Please try again.'}</strong>
    return (
      <>
        <strong>Hmm, that didn’t match.</strong>{' '}
        {kind === 'new'
          ? 'Check the School ID and code on your card, or ask your teacher.'
          : 'Check your School ID and PIN code, or ask your teacher.'}
      </>
    )
  }

  const basicStepPage = (s: Step): StepPage => {
    if (kind === 'returning') {
      if (s === 1) {
        return {
          title: 'Hi, Student!',
          code: {
            hint: (
              <>
                Welcome back! Type the <strong>School ID</strong> on your login card.
              </>
            ),
            label: 'School ID',
            groups: [4, 4],
            value: schoolId,
            onChange: setSchoolId,
            submitLabel: 'Next',
            onSubmit: () => turnTo(2),
          },
        }
      }
      return {
        title: typePinTitle,
        corner: <Padlock open={loggingIn} />,
        help: (
          <>
            Forgot your PIN code? <strong>Ask your teacher</strong>
          </>
        ),
        code: {
          hint: 'The 4 numbers you made.',
          label: 'PIN code',
          groups: [4],
          value: loginPin,
          // After Log in, the number pad no longer changes the PIN code.
          onChange: loggingIn ? ignoreTyping : setLoginPin,
          masked: true,
          large: true,
          submitLabel: 'Log in',
          onSubmit: () => void logIn(),
        },
        locked: loggingIn,
      }
    }
    if (s === 1) {
      return {
        title: 'Hi, Student!',
        code: {
          hint: (
            <>
              Type the <strong>School ID</strong> on your login card.
            </>
          ),
          label: 'School ID',
          groups: [4, 4],
          value: schoolId,
          onChange: setSchoolId,
          submitLabel: 'Next',
          onSubmit: () => turnTo(2),
        },
      }
    }
    if (s === 2) {
      return {
        title: 'Hi, Student!',
        code: {
          hint: (
            <>
              Type the <strong>one-time code</strong> on your login card. You only need it once!
            </>
          ),
          label: 'One-time code',
          groups: [3, 3],
          value: oneTimeCode,
          onChange: setOneTimeCode,
          submitLabel: 'Next',
          onSubmit: () => void checkCode(),
        },
      }
    }
    return {
      title: typePinTitle,
      corner: <Padlock open={pin.length === 4} />,
      code: {
        hint: 'Pick 4 numbers you can remember.',
        label: 'PIN code',
        groups: [4],
        value: pin,
        onChange: setPin,
        masked: true,
        large: true,
        submitLabel: 'Done!',
        onSubmit: () => void finish(),
      },
    }
  }

  /**
   * Ollie's page. Step s is pages 2s-1 (left) and 2s (right). On a phone held
   * sideways it also has the step's title, hint and boxes, and Back.
   */
  const renderLeft = (s: Step, ollie: ReactNode, withStep: boolean, titleId?: string) => {
    // A "didn't match" on this step: Ollie says let's try again.
    const tryAgain = problem?.step === s && (problem.kind === 'wrong' || problem.kind === 'tries')
    const says = tryAgain ? OLLIE_TRY_AGAIN : OLLIE_SAYS[kind][s - 1]
    const page = phone && withStep ? stepPage(s) : null
    return (
      <BookLeftPage
        chapter={s}
        title={says.title}
        line={says.line}
        pageNumber={s * 2 - 1}
        ollie={ollie}
        phone={phone}
        step={
          page
            ? {
                title: page.title,
                titleId,
                corner: page.corner,
                help: page.help,
                onBack: goBack,
                entry: <CodeEntry {...page.code} />,
              }
            : undefined
        }
      />
    )
  }

  /** The step's page: everything on a laptop, only the number pad on a phone held sideways. */
  const renderRight = (s: Step, live: boolean, titleId?: string) => {
    const page = stepPage(s)
    const code = { ...page.code, active: live && !page.locked }
    if (phone) {
      return (
        <BookKeypadPage pageNumber={s * 2}>
          <CodePadPage {...code} />
        </BookKeypadPage>
      )
    }
    return (
      <BookRightPage
        title={page.title}
        titleId={titleId}
        corner={page.corner}
        help={page.help}
        onBack={goBack}
        pageNumber={s * 2}
      >
        <CodeStep {...code} />
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
        finishing={finishing}
        bounceKey={bounceKey}
        talkKey={talkKey}
        renderLeft={renderLeft}
        renderRight={renderRight}
        onClose={onClose}
        phone={phone}
      />
    </>
  )
}
