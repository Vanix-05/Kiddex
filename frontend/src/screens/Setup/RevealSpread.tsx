import type { CSSProperties } from 'react'
import { REVEAL_TEXT, REVEAL_WRITE_MS, type SpreadMode } from './bookPages'
import { Doodle, WavyUnderline } from './storyParts'
import story from './StoryPage.module.css'
import styles from './Reveal.module.css'

/** When each half starts writing itself, and for how long (ms): the left half, then the right. */
const WRITING = [
  { from: 300, takes: 900 },
  { from: 1300, takes: 900 },
] as const

/**
 * "your perfect buddy is...": handwritten in pencil, writing itself across
 * the two pages ("your perfect" on the left, "buddy is..." on the right).
 * When the writing is done (REVEAL_WRITE_MS), a wavy underline and a few
 * still doodles fade in. SetupBook turns to Pick your buddy on its own
 * after REVEAL_HOLD_MS. Before it plays (`arriving`), the pages are blank;
 * turning away (`still`), everything is simply there.
 */
export function RevealSpread({ mode }: { mode: SpreadMode }) {
  const live = mode === 'live'
  const modeClass = mode === 'arriving' ? styles.waiting : mode === 'still' ? styles.still : ''

  return (
    <div className={modeClass} style={{ '--done': `${REVEAL_WRITE_MS}ms` } as CSSProperties}>
      {REVEAL_TEXT.map((half, h) => (
        <p
          key={half}
          className={[story.hand, story.title, styles.line, h === 0 ? styles.left : styles.right].join(' ')}
          // The whole line is read once, from the left half.
          aria-label={h === 0 ? REVEAL_TEXT.join(' ') : undefined}
          aria-hidden={h === 0 ? undefined : true}
          tabIndex={h === 0 ? -1 : undefined}
          data-page-title={(live && h === 0) || undefined}
        >
          <span
            className={styles.ink}
            aria-hidden="true"
            style={{ '--from': `${WRITING[h].from}ms`, '--takes': `${WRITING[h].takes}ms` } as CSSProperties}
          >
            {half}
          </span>
          {h === 1 && (
            <span className={`${styles.after} ${styles.underline}`}>
              <WavyUnderline />
            </span>
          )}
        </p>
      ))}

      <div className={styles.after} aria-hidden="true">
        <Doodle kind="sparkle" x={120} y={170} size={34} color="var(--color-story-star)" />
        <Doodle kind="heart" x={470} y={420} size={32} color="var(--color-story-girl)" />
        <Doodle kind="squiggle" x={110} y={440} size={110} color="var(--color-story-boy)" rotate={-8} />
        <Doodle kind="sparkle" x={980} y={180} size={30} color="var(--color-story-boy)" />
        <Doodle kind="sparkle" x={700} y={430} size={26} color="var(--color-story-leaf)" />
        <Doodle kind="heart" x={1060} y={400} size={28} color="var(--color-story-star)" />
      </div>
    </div>
  )
}
