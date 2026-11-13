import { useState } from 'react'
import { OllieLive } from '../../components/StoryBook/OllieLive'
import styles from './PerchedOllie.module.css'

/**
 * Ollie sitting on the top edge of the setup storybook, near its top-right
 * corner, with his speech bubble on his left. He breathes and blinks, and
 * his beak moves each time his line changes; the bubble fades to the new
 * line. Placed in the book's own pixels (see PerchedOllie.module.css).
 */
export function PerchedOllie({ says }: { says: string }) {
  // Each new line: he talks again (OllieLive replays its beak on a new key).
  const [line, setLine] = useState({ text: says, talk: 1 })
  if (line.text !== says) setLine({ text: says, talk: line.talk + 1 })

  return (
    <>
      <p className={styles.bubble} aria-live="polite">
        {/* key: the new line fades in. */}
        <span key={line.talk} className={styles.text}>
          {says}
        </span>
      </p>
      <div className={styles.ollie} aria-hidden="true">
        <OllieLive talkKey={line.talk} />
      </div>
    </>
  )
}
