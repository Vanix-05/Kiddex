import { useId } from 'react'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { companionArt } from '../../assets/art'
import { Companion } from '../../companions/Companion'
import type { Avatar } from '../../setup/avatar'
import type { SpreadMode } from './bookPages'
import quizStyles from './Quiz.module.css'
import styles from './Gender.module.css'

const AVATARS: { id: Avatar; name: string }[] = [
  { id: 'boy', name: 'Boy' },
  { id: 'girl', name: 'Girl' },
]

interface GenderSpreadProps {
  mode: SpreadMode
  avatar: Avatar | null
  onPick?: (avatar: Avatar) => void
  onNext?: () => void
}

/**
 * Boy or Girl, the first spread of the setup storybook: "This story is
 * about…" across the top, the Boy tile on the left page, the Girl tile and
 * Next on the right page. Drawn in the open book's own pixels (1216 x 748).
 */
export function GenderSpread({ mode, avatar, onPick, onNext }: GenderSpreadProps) {
  const titleId = useId()
  const live = mode === 'live'

  return (
    <>
      <h2 id={titleId} className={quizStyles.question} tabIndex={-1} data-page-title={live || undefined}>
        This story is about…
      </h2>

      {/* One tile on each page. A radio group underneath, so keyboards and
          screen readers get the usual pick-one behavior. Tapping the
          character also picks it (and makes it dance). */}
      <div role="radiogroup" aria-labelledby={titleId}>
        {AVATARS.map(({ id, name }) => {
          const selected = avatar === id
          return (
            <label
              key={id}
              className={[styles.tile, styles[id], selected && styles.selected].filter(Boolean).join(' ')}
              onClick={() => onPick?.(id)}
            >
              <input
                type="radio"
                name={`avatar-${titleId}`}
                value={id}
                checked={selected}
                onChange={() => onPick?.(id)}
                className="visually-hidden"
              />
              {mode === 'arriving' ? (
                // The copies on the page turning in: the plain picture (the same as the
                // character standing still). Several animated ones at once make the turn stutter.
                <img src={companionArt[id]} alt="" className={styles.companion} draggable={false} />
              ) : (
                <Companion id={id} className={styles.companion} />
              )}
              <span className={styles.name}>{name}</span>
              {selected && (
                <span className={styles.check} aria-hidden="true">
                  <Icon name="check" size={24} />
                </span>
              )}
            </label>
          )
        })}
      </div>

      <Button withArrow onClick={onNext} disabled={!avatar} className={styles.next}>
        Next
      </Button>
    </>
  )
}
