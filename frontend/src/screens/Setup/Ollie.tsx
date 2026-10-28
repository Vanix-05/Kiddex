import { characterArt } from '../../assets/art'
import styles from './Ollie.module.css'

/**
 * Ollie the guide owl: gently bobs, with a speech bubble above.
 * `small`: perched version (e.g. on the corner of the book), with the bubble
 * to his left.
 */
export function Ollie({ says, small = false }: { says: string; small?: boolean }) {
  return (
    <figure className={[styles.ollie, small && styles.small].filter(Boolean).join(' ')}>
      {/* Read out when the line changes. key= replays the pop-in animation. */}
      <figcaption className={styles.bubbleWrap} aria-live="polite">
        <span key={says} className={styles.bubble}>
          {says}
        </span>
      </figcaption>
      <div className={styles.bob}>
        <img
          src={characterArt.ollie}
          alt="Ollie the owl"
          className={styles.image}
          width={428}
          height={600}
          draggable={false}
        />
      </div>
    </figure>
  )
}
