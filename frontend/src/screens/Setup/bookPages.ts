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
/** Back on Pick your buddy: the page fades out, then question 5 fades in. */
export const FADE_MS = 250
/** A tapped bubble pops (the others fade). Must match bubble-pop in Quiz.module.css. */
export const POP_MS = 420
/** Choose: confetti and "A perfect team!" before the Customize Bridge. */
export const CHOSEN_MS = 1800

/** "your perfect buddy is...": each letter pops in, 45ms apart, 450ms each (Reveal.module.css). */
export const REVEAL_TEXT = ['your perfect', 'buddy is...'] as const
export const LETTER_STAGGER_MS = 45
export const LETTER_POP_MS = 450
const revealLength = REVEAL_TEXT.join(' ').length
export const LETTERS_DONE_MS = (revealLength - 1) * LETTER_STAGGER_MS + LETTER_POP_MS
/** How long the finished line stays up before the page turns on its own. */
export const REVEAL_HOLD_MS = 2000

/** Pick your buddy: "Pick your buddy!" writes itself, then the tiles pop in (Pet.module.css). */
export const WRITE_MS = 1600
export const TILE_STAGGER_MS = 100

/** The first buddy picked on Pick your buddy: the quiz match if it's ready, else the first ready one. */
export const firstPick = (matched: BuddyId | null): BuddyId =>
  (pets.find((p) => p.id === matched && isBuddyReady(p.id)) ?? pets.find((p) => isBuddyReady(p.id)) ?? pets[0]).id

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
