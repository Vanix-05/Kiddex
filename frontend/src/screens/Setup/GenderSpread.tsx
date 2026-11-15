import { useId } from 'react'
import { storybookArt } from '../../assets/art'
import { Button } from '../../components/Button/Button'
import type { Avatar } from '../../setup/avatar'
import type { SpreadMode } from './bookPages'
import { Doodle, PickStamp, Tape, WavyUnderline } from './storyParts'
import page from './StoryPage.module.css'
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
 * about…" across the top, a framed picture card on each page (the pencil
 * kid in front of their background, a ribbon with the name), and Next at
 * the bottom right. A still, hand-drawn page: the pictures never move.
 * Drawn in the open book's own pixels (1216 x 748).
 */
export function GenderSpread({ mode, avatar, onPick, onNext }: GenderSpreadProps) {
  const titleId = useId()
  const live = mode === 'live'

  return (
    <>
      <h2 id={titleId} className={`${page.hand} ${page.title} ${styles.title}`} tabIndex={-1} data-page-title={live || undefined}>
        <span className={styles.titleText}>
          This story is about…
          <WavyUnderline />
        </span>
      </h2>

      {/* One card on each page, as a radio group. */}
      <div role="radiogroup" aria-labelledby={titleId}>
        {AVATARS.map(({ id, name }) => {
          const selected = avatar === id
          return (
            <label key={id} className={[page.pickCard, styles.card, styles[id], selected && page.picked].filter(Boolean).join(' ')}>
              <input
                type="radio"
                name={`avatar-${titleId}`}
                value={id}
                checked={selected}
                onChange={() => onPick?.(id)}
                className={page.radio}
              />
              <Tape className={styles.tape} />
              <span className={styles.window}>
                <img src={storybookArt.cardBg[id]} alt="" className={styles.background} draggable={false} />
                <img src={storybookArt.kids[id]} alt="" className={styles.kid} draggable={false} />
              </span>
              <span className={styles.ribbon}>
                <svg viewBox="0 0 366 66" preserveAspectRatio="none" aria-hidden="true">
                  <path className={styles.ribbonEnd} d="M4 18h40v40H4l14-20z" />
                  <path className={styles.ribbonEnd} d="M362 18h-40v40h40l-14-20z" />
                  <path d="M30 6h306v48H30z" />
                </svg>
                <span className={`${page.hand} ${styles.name}`}>{name}</span>
              </span>
              {selected && <PickStamp />}
            </label>
          )
        })}
      </div>

      {/* A few still doodles around the cards. */}
      <Doodle kind="sparkle" x={86} y={140} size={34} color="var(--color-story-star)" />
      <Doodle kind="sparkle" x={526} y={560} size={28} color="var(--color-tint-mint)" />
      <Doodle kind="heart" x={96} y={610} size={30} color="var(--color-story-girl)" />
      <Doodle kind="squiggle" x={380} y={610} size={110} color="var(--color-story-boy)" rotate={-6} />
      <Doodle kind="sparkle" x={1110} y={150} size={30} color="var(--color-story-boy)" />
      <Doodle kind="heart" x={672} y={560} size={26} color="var(--color-story-star)" />
      <Doodle kind="squiggle" x={660} y={160} size={70} color="var(--color-story-girl)" rotate={20} />

      <Button withArrow onClick={onNext} disabled={!avatar} className={`${page.next} ${styles.next}`}>
        Next
      </Button>
    </>
  )
}
