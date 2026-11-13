import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import book from '../../components/StoryBook/bookParts.module.css'
import { fitStage } from '../../components/StoryBook/fitStage'
import { StepTabs } from '../../components/StoryBook/StepTabs'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import type { Avatar } from '../../setup/avatar'
import { ollieChosen, ollieOnMatch, ollieOnOther, petById } from '../../setup/petData'
import {
  ollieGenderPicked,
  ollieReveal,
  ollieWhoIsTheHero,
  quizQuestions,
  type BuddyId,
  type QuizAnswer,
} from '../../setup/quizData'
import { pickBuddy } from '../../setup/scoring'
import { Desk, DeskProps } from './Desk'
import { GenderSpread } from './GenderSpread'
import { PerchedOllie } from './PerchedOllie'
import { PetSpread } from './PetSpread'
import { QuizSpread } from './QuizSpread'
import { RevealSpread } from './RevealSpread'
import {
  CHOSEN_MS,
  FADE_MS,
  FIRST_QUESTION_PAGE,
  firstPick,
  GENDER_PAGE,
  LAST_QUESTION_PAGE,
  LETTERS_DONE_MS,
  PET_PAGE,
  POP_MS,
  reducedMotion,
  REVEAL_HOLD_MS,
  REVEAL_PAGE,
  tabOfPage,
  TABS,
  TURN_MS,
  type SpreadMode,
} from './bookPages'
import styles from './SetupBook.module.css'

/** The page being turned away: which page, and the bubble popped on it. */
interface Leaving {
  page: number
  popped: number | null
}

/**
 * The first-time setup (/setup), all in one storybook lying on the desk:
 * Boy or Girl -> questions 1 to 5 -> "your perfect buddy is..." -> Pick your
 * buddy. The page and every answer live here, so a page turn can show the
 * next page underneath the one turning. Answers are never saved: only the
 * final picks go to finishSetup (Choose), then on to the Customize Bridge.
 *
 * Everything is laid out on a 1440 x 900 stage scaled to fit the window;
 * the open book is 1216 x 748 at (96, 130), as on the Student login.
 */
export function SetupBook() {
  const navigate = useNavigate()
  const { finishSetup } = useSession()
  const rootRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  const [page, setPage] = useState(GENDER_PAGE)
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [picks, setPicks] = useState<QuizAnswer[]>([])
  const [matchedBuddy, setMatchedBuddy] = useState<BuddyId | null>(null)
  const [selectedId, setSelectedId] = useState<BuddyId>(() => firstPick(null))
  // Nicknames typed so far, per buddy, so switching back keeps them.
  const [names, setNames] = useState<Partial<Record<BuddyId, string>>>({})
  const [chosen, setChosen] = useState(false)

  const [popped, setPopped] = useState<number | null>(null)
  const [leaving, setLeaving] = useState<Leaving | null>(null)
  const [fading, setFading] = useState<'out' | 'in' | null>(null)
  // Goes up each time a new page has landed: focus moves to its title.
  const [landed, setLanded] = useState(0)

  // Taps are ignored while a page turns or fades, a bubble pops or the reveal plays.
  const busy = leaving !== null || popped !== null || fading === 'out' || chosen || page === REVEAL_PAGE

  // ---------- Timers ----------
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // ---------- Fit the stage to the window ----------
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => root.style.setProperty('--stage', fitStage(root.clientWidth, root.clientHeight))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Keyboard and screen-reader focus moves to the new page's title.
  useEffect(() => {
    if (landed) liveRef.current?.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true })
  }, [landed])

  // ---------- Moving between pages ----------

  /** The reveal holds, then turns to Pick your buddy on its own. */
  const holdReveal = () =>
    later((reducedMotion() ? 0 : LETTERS_DONE_MS) + REVEAL_HOLD_MS, () => turn(REVEAL_PAGE, PET_PAGE, null))

  /** Next: the right page turns over the spine; the next page is underneath. */
  const turn = (from: number, next: number, poppedOnIt: number | null) => {
    const arrive = () => {
      setLanded((n) => n + 1)
      if (next === REVEAL_PAGE) holdReveal()
    }
    setPopped(null)
    setFading(null)
    setPage(next)
    if (reducedMotion()) {
      arrive()
      return
    }
    setLeaving({ page: from, popped: poppedOnIt })
    later(TURN_MS, () => {
      setLeaving(null)
      arrive()
    })
  }

  // ---------- Page actions ----------

  const pickAvatar = (a: Avatar) => {
    if (!busy) setAvatar(a)
  }

  const genderNext = () => {
    if (!busy && avatar) turn(GENDER_PAGE, FIRST_QUESTION_PAGE, null)
  }

  /** A bubble: it pops, the others fade, then the page turns. */
  const answer = (answerIndex: number) => {
    if (busy) return
    const q = page - FIRST_QUESTION_PAGE
    const nextPicks = [...picks.slice(0, q), quizQuestions[q].answers[answerIndex]]
    setPicks(nextPicks)
    setPopped(answerIndex)
    later(POP_MS, () => {
      if (page < LAST_QUESTION_PAGE) {
        turn(page, page + 1, answerIndex)
        return
      }
      // The last answer: work out the match, then on to the reveal.
      const match = pickBuddy(nextPicks)
      setMatchedBuddy(match)
      setSelectedId(firstPick(match))
      setNames({})
      turn(page, REVEAL_PAGE, answerIndex)
    })
  }

  /** Back on Pick your buddy: a quick fade back to question 5. The first 4 answers stay. */
  const petBack = () => {
    if (busy) return
    const toLastQuestion = () => {
      setPage(LAST_QUESTION_PAGE)
      setPicks((p) => p.slice(0, LAST_QUESTION_PAGE - FIRST_QUESTION_PAGE))
      setFading('in')
      setLanded((n) => n + 1)
    }
    if (reducedMotion()) {
      toLastQuestion()
      return
    }
    setFading('out')
    later(FADE_MS, toLastQuestion)
  }

  const choose = () => {
    const nickname = (names[selectedId] ?? '').trim()
    if (busy || !avatar || !isBuddyReady(selectedId)) return
    setChosen(true)
    later(CHOSEN_MS, () => {
      finishSetup({ avatar, buddy: selectedId, nickname })
      navigate(paths.customize, { replace: true })
    })
  }

  // ---------- What Ollie says ----------

  // During a turn he keeps the line of the page being left.
  const ollieSays = (p: number): string => {
    if (p === GENDER_PAGE) return avatar ? ollieGenderPicked : ollieWhoIsTheHero
    if (p <= LAST_QUESTION_PAGE) return quizQuestions[p - FIRST_QUESTION_PAGE].ollie
    if (p === REVEAL_PAGE) return ollieReveal
    if (chosen) return ollieChosen
    return selectedId === matchedBuddy ? ollieOnMatch : ollieOnOther(petById(selectedId)?.name ?? '')
  }

  // ---------- The pages ----------

  const spread = (p: number, mode: SpreadMode, poppedHere: number | null): ReactNode => {
    if (p === GENDER_PAGE) return <GenderSpread mode={mode} avatar={avatar} onPick={pickAvatar} onNext={genderNext} />
    if (p <= LAST_QUESTION_PAGE)
      return <QuizSpread mode={mode} index={p - FIRST_QUESTION_PAGE} popped={poppedHere} onChoose={answer} />
    if (p === REVEAL_PAGE) return <RevealSpread mode={mode} />
    return (
      <PetSpread
        mode={mode}
        matchedBuddy={matchedBuddy}
        selectedId={selectedId}
        onSelect={setSelectedId}
        names={names}
        onName={(id, name) => setNames((n) => ({ ...n, [id]: name }))}
        chosen={chosen}
        busy={busy}
        onChoose={choose}
        onBack={petBack}
      />
    )
  }

  const liveClass = [styles.spread, fading === 'out' && styles.fadeOut, fading === 'in' && styles.fadeIn]
    .filter(Boolean)
    .join(' ')

  return (
    <main ref={rootRef} className={styles.screen}>
      <Desk />
      <div className={styles.stage}>
        <DeskProps />
        <h1 className="visually-hidden">Your storybook</h1>

        <div className={styles.book}>
          <span className={book.floorShadow} />
          <span className={`${book.board} ${book.boardLeft}`} />
          <span className={`${book.board} ${book.boardRight}`} />
          <StepTabs steps={TABS} step={tabOfPage(page)} className={styles.tabs} />
          <span className={`${book.stack} ${book.stackLeft}`} />
          <span className={`${book.stack} ${book.stackRight}`} />
          <div className={`${book.paper} ${book.paperLeft} ${styles.pageLeft}`} />
          <div className={`${book.paper} ${book.paperRight} ${styles.pageRight}`} />

          {leaving ? (
            <>
              {/* The left half of the page being left stays until the page lands... */}
              <div className={`${styles.spread} ${styles.clipLeft}`} aria-hidden="true" inert>
                {spread(leaving.page, 'still', leaving.popped)}
              </div>
              {/* ...and the right half of the next page is already underneath. */}
              <div className={`${styles.spread} ${styles.clipRight}`} aria-hidden="true" inert>
                {spread(page, 'arriving', null)}
              </div>
            </>
          ) : (
            // The page you're on. Keyed by page, so its entrance plays when it lands.
            <div key={page} ref={liveRef} className={liveClass} inert={fading === 'out'}>
              {spread(page, 'live', popped)}
            </div>
          )}

          <span className={book.gutter} />
          <span className={`${book.ribbon} ${styles.ribbon}`} />

          {/* The turning page. Front: the right half of the page being left.
              Back: the left half of the next page. */}
          {leaving && (
            <div className={book.turn} aria-hidden="true" inert>
              <div className={book.turnLift}>
                <div className={`${book.face} ${book.faceBack}`}>
                  <div className={`${book.paper} ${book.paperLeft}`}>
                    <div className={`${styles.spread} ${styles.onLeftPage}`}>{spread(page, 'arriving', null)}</div>
                  </div>
                  <span className={`${book.shade} ${book.shadeBack}`} />
                </div>
                <div className={book.face}>
                  <div className={`${book.paper} ${book.paperRight}`}>
                    <div className={`${styles.spread} ${styles.onRightPage}`}>
                      {spread(leaving.page, 'still', leaving.popped)}
                    </div>
                  </div>
                  <span className={`${book.shade} ${book.shadeFront}`} />
                </div>
              </div>
            </div>
          )}

          <PerchedOllie says={ollieSays(leaving ? leaving.page : page)} />
        </div>

        {/* Swallows taps while anything moves (no double taps). */}
        {busy && <div className={styles.blocker} aria-hidden="true" />}
      </div>
    </main>
  )
}
