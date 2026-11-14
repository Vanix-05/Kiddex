import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import { Bedroom, type BedroomHandle } from '../../components/Bedroom/Bedroom'
import book from '../../components/StoryBook/bookParts.module.css'
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
import { GenderSpread } from './GenderSpread'
import { Doodles } from './intro/Doodles'
import { useIntroClip } from './intro/useIntroClip'
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
  INTRO_PAGE,
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
 * The first-time setup (/setup), all in one storybook lying on the desk in
 * the kid's bedroom: Boy or Girl -> questions 1 to 5 -> "your perfect buddy
 * is..." -> Pick your buddy. The page and every answer live here, so a page
 * turn can show the next page underneath the one turning. Answers are never
 * saved: only the final picks go to finishSetup (Choose), then on to the
 * Customize Bridge.
 *
 * A first-time Student arrives through the bedroom intro clip (once per
 * session): the same book and bedroom, with the camera moving (intro/). The
 * clip ends by turning the blank page to Boy or Girl, so there is no jump.
 *
 * The book is 1216 x 748 at (96, 130) on a 1440 x 900 stage (Bedroom's book view).
 */
export function SetupBook({ intro, freezeAt, onIntroEnd }: SetupBookProps = {}) {
  const navigate = useNavigate()
  const { finishSetup, seenIntroClip, markIntroClipSeen } = useSession()
  const bedroomRef = useRef<BedroomHandle>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  // The intro clip: playing -> story (the page turns to Boy or Girl) -> over.
  const [clip, setClip] = useState<'playing' | 'story' | 'over'>(() => ((intro ?? !seenIntroClip) ? 'playing' : 'over'))
  // Once only, even if they skip it or reload.
  useEffect(() => {
    if (intro === undefined && !seenIntroClip) markIntroClipSeen()
  }, [intro, seenIntroClip, markIntroClipSeen])

  const [page, setPage] = useState(() => (clip === 'playing' ? INTRO_PAGE : GENDER_PAGE))
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

  // Taps are ignored while the clip plays, a page turns or fades, a bubble pops or the reveal plays.
  const busy = clip !== 'over' || leaving !== null || popped !== null || fading === 'out' || chosen || page === REVEAL_PAGE

  // ---------- Timers ----------
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

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

  // ---------- The intro clip ----------

  const turnRef = useRef(turn)
  useEffect(() => {
    turnRef.current = turn
  })
  /** The clip hands over: Ollie is on the book, and the blank page turns to Boy or Girl (or just shows it). */
  const beginStory = useCallback((turnPage: boolean) => {
    setClip('story')
    if (turnPage) turnRef.current(INTRO_PAGE, GENDER_PAGE, null)
    else setPage(GENDER_PAGE)
  }, [])
  const endClip = useCallback(() => {
    setClip('over')
    setLanded((n) => n + 1)
    onIntroEnd?.()
  }, [onIntroEnd])
  const introParts = useIntroClip({
    bedroom: bedroomRef,
    active: clip !== 'over',
    handedOver: clip === 'story',
    freezeAt,
    onStory: beginStory,
    onEnd: endClip,
  })

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
    if (p <= GENDER_PAGE) return avatar ? ollieGenderPicked : ollieWhoIsTheHero
    if (p <= LAST_QUESTION_PAGE) return quizQuestions[p - FIRST_QUESTION_PAGE].ollie
    if (p === REVEAL_PAGE) return ollieReveal
    if (chosen) return ollieChosen
    return selectedId === matchedBuddy ? ollieOnMatch : ollieOnOther(petById(selectedId)?.name ?? '')
  }

  // ---------- The pages ----------

  const spread = (p: number, mode: SpreadMode, poppedHere: number | null): ReactNode => {
    // The clip's blank page: once it turns away, the doodles left on it are part of the page.
    if (p === INTRO_PAGE) return mode === 'live' ? null : <Doodles mode="left" />
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

  const theBook = (
    <div className={styles.book}>
      <span className={book.floorShadow} />
      <span className={`${book.board} ${book.boardLeft}`} />
      <span className={`${book.board} ${book.boardRight}`} />
      {/* The tabs wait behind the book until the story begins. */}
      <StepTabs
        steps={TABS}
        step={tabOfPage(page)}
        className={clip === 'playing' ? `${styles.tabs} ${styles.tabsAway}` : styles.tabs}
      />
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
      {introParts.onPage}

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

      {/* Ollie sits on the book once the clip has brought him there. */}
      {clip !== 'playing' && <PerchedOllie says={ollieSays(leaving ? leaving.page : page)} />}
    </div>
  )

  return (
    <main>
      <h1 className="visually-hidden">Your storybook</h1>
      <Bedroom
        ref={bedroomRef}
        book={theBook}
        aboveHands={introParts.aboveHands}
        backdrop={introParts.backdrop}
        locked={clip !== 'over'}
      >
        {/* Swallows taps while anything moves (no double taps). */}
        {busy && <div className={styles.blocker} aria-hidden="true" />}
        {introParts.overlay}
      </Bedroom>
    </main>
  )
}

interface SetupBookProps {
  /** Play the intro clip or not. Default: once per session, for a Student who hasn't seen it. */
  intro?: boolean
  /** Dev only: hold the clip at this moment (seconds). */
  freezeAt?: number
  /** Dev only: the clip has ended (or was skipped). */
  onIntroEnd?: () => void
}
