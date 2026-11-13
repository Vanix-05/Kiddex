import type { CSSProperties } from 'react'
import { LETTERS_DONE_MS, REVEAL_TEXT, type SpreadMode } from './bookPages'
import styles from './Reveal.module.css'

/** Each half, word by word, with the position of each word's first letter in
    the whole line (for the pop-in order: it carries on across the spine). */
const HALVES = REVEAL_TEXT.map((half, h) => {
  const offset = REVEAL_TEXT.slice(0, h).reduce((sum, prev) => sum + prev.length + 1, 0)
  return half.split(' ').map((word, w, all) => ({
    word,
    start: offset + all.slice(0, w).reduce((sum, prev) => sum + prev.length + 1, 0),
  }))
})

/** Small gold sparkles around the words (book pixels), twinkling once the letters are in. */
const SPARKLES = [
  [150, 250, 0],
  [520, 230, 0.5],
  [470, 420, 1.1],
  [200, 440, 1.6],
  [700, 236, 0.3],
  [1080, 262, 0.9],
  [1120, 402, 1.4],
  [760, 430, 0.7],
] as const

/**
 * "your perfect buddy is...": the big sticker-text lead-in. "your perfect"
 * on the left page, "buddy is..." on the right, letters popping in one by
 * one. SetupBook turns to Pick your buddy on its own after REVEAL_HOLD_MS.
 * Before it plays (`arriving`), the pages are still blank.
 */
export function RevealSpread({ mode }: { mode: SpreadMode }) {
  const live = mode === 'live'
  const modeClass = mode === 'arriving' ? styles.waiting : mode === 'still' ? styles.still : ''

  return (
    <div className={modeClass}>
      {HALVES.map((words, h) => (
        <p
          key={h}
          className={[styles.sticker, h === 0 ? styles.left : styles.right].join(' ')}
          // The whole line is read once, from the left half.
          aria-label={h === 0 ? REVEAL_TEXT.join(' ') : undefined}
          aria-hidden={h === 0 ? undefined : true}
          tabIndex={h === 0 ? -1 : undefined}
          data-page-title={(live && h === 0) || undefined}
        >
          {words.map(({ word, start }) => (
            <span key={start} className={styles.word} aria-hidden="true">
              {[...word].map((letter, i) => (
                <span key={i} className={styles.letter} style={{ '--i': start + i } as CSSProperties}>
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </p>
      ))}

      {live &&
        SPARKLES.map(([x, y, delay], i) => (
          <span
            key={i}
            className={styles.sparkle}
            aria-hidden="true"
            style={
              {
                left: `${x}px`,
                top: `${y}px`,
                '--sparkle-delay': `${LETTERS_DONE_MS / 1000 - 0.6 + delay}s`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  )
}
