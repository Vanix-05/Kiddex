import { characterArt } from '../../assets/art'
import styles from './Ollie.module.css'

/** Ollie the guide owl: gently bobs, with a speech bubble above. */
export function Ollie({ says }: { says: string }) {
  return (
    <figure className={styles.ollie}>
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
