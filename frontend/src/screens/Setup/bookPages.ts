import { isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import { pets } from '../../setup/petData'
import { quizQuestions, type BuddyId } from '../../setup/quizData'

/**
 * The pages of the setup storybook, in order:
 * 0 = Boy or Girl, 1-5 = the quiz questions, 6 = "your perfect buddy is...",
 * 7 = Pick your buddy.
 */
export const GENDER_PAGE = 0
/** Before the story: the blank page the bedroom intro clip plays on (it turns to Boy or Girl). */
export const INTRO_PAGE = -1
export const FIRST_QUESTION_PAGE = 1
export const LAST_QUESTION_PAGE = quizQuestions.length
export const REVEAL_PAGE = LAST_QUESTION_PAGE + 1
export const PET_PAGE = REVEAL_PAGE + 1

/** Which step tab a page belongs to (1 You, 2 Quiz, 3 Buddy). */
export const tabOfPage = (page: number) => (page <= GENDER_PAGE ? 1 : page <= LAST_QUESTION_PAGE ? 2 : 3)
export const TABS = ['You', 'Quiz', 'Buddy'] as const

/**
 * How a spread is drawn:
 * - live: the page you're on (it can be tapped; its entrance plays on mount)
 * - still: a copy of the page being left, as it was (turning away)
 * - arriving: a copy of the next page, as it looks before its entrance plays
 */
export type SpreadMode = 'live' | 'still' | 'arriving'

/** The page turn. Must match .turn in components/StoryBook/bookParts.module.css. */
export const TURN_MS = 820
/** Back (on a question or Pick your buddy): the page fades out, then the earlier one fades in. */
export const FADE_MS = 250
/** Choose: confetti and "A perfect team!" before the Customize Bridge. */
export const CHOSEN_MS = 1800

/** "your perfect buddy is...": the line writes itself in pencil, left half then right half (Reveal.module.css). */
export const REVEAL_TEXT = ['your perfect', 'buddy is…'] as const
/** When the writing is done (the underline and doodles then fade in). */
export const REVEAL_WRITE_MS = 2200
/** How long the finished line stays up before the page turns on its own. */
export const REVEAL_HOLD_MS = 2000

/** Pick your buddy: "Pick your buddy!" writes itself on arrival (Pet.module.css). */
export const WRITE_MS = 1600

/** The first buddy picked on Pick your buddy: the quiz match if it's ready, else the first ready one. */
export const firstPick = (matched: BuddyId | null): BuddyId =>
  (pets.find((p) => p.id === matched && isBuddyReady(p.id)) ?? pets.find((p) => isBuddyReady(p.id)) ?? pets[0]).id

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
