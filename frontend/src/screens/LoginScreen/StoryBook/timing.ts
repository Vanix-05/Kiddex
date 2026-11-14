/**
 * Timings of the Student login storybook. The CSS in StoryBook.module.css
 * uses the same numbers; change them together.
 */

/** "Start here" / "Log in": from the tap until taps work again. */
export const ENTER_MS = 1900
/** When Ollie lands in the picture frame (the cover is open by then). */
export const LAND_MS = 1650
/** Next: the page turning over the spine. */
export const TURN_MS = 820
/** Back on step 1: the cover swings shut (850) and the book shrinks back (700). */
export const LEAVE_MS = 1550

/** Done!: Ollie winks and fades into the paper, the writing fades, the tabs slide away. Then the intro clip starts. */
export const FINISH_MS = 700

export type Step = 1 | 2 | 3

/**
 * choose = the closed book (the "Welcome, Student!" popup)
 * enter  = the book opening
 * steps  = the open book
 * back   = the book closing (Back on step 1)
 */
export type BookPhase = 'choose' | 'enter' | 'steps' | 'back'
