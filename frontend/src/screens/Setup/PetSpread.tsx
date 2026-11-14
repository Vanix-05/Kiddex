import { useId, type CSSProperties } from 'react'
import { BuddyFigure } from '../../components/BuddyFigure/BuddyFigure'
import { buddyPicture, isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { cleanNickname, MAX_NICKNAME, MAX_SKILL, pets, skillRows } from '../../setup/petData'
import type { BuddyId } from '../../setup/quizData'
import { Confetti } from './Confetti'
import { TILE_STAGGER_MS, WRITE_MS, type SpreadMode } from './bookPages'
import styles from './Pet.module.css'

/** Pet menu: tiles per row, and rows shown before it scrolls. */
const MENU_COLUMNS = 4
const MENU_MAX_ROWS = 3

interface PetSpreadProps {
  mode: SpreadMode
  matchedBuddy: BuddyId | null
  selectedId: BuddyId
  onSelect?: (id: BuddyId) => void
  /** Nicknames typed so far, per buddy, so switching back keeps them. */
  names: Partial<Record<BuddyId, string>>
  onName?: (id: BuddyId, name: string) => void
  /** Choose was tapped: confetti, and nothing can be changed any more. */
  chosen: boolean
  /** Something is moving: taps are ignored. */
  busy: boolean
  /**
   * The right page is covered (the buddy is pulling the Student in): its
   * animated buddy is taken away, so nothing redraws under the cover.
   */
  covered?: boolean
  /** The buddy on the page stands still (its plain picture): the camera is moving, and a live buddy would redraw the whole book every frame. */
  frozen?: boolean
  onChoose?: () => void
  onBack?: () => void
}

/**
 * Pick your buddy, the last spread of the setup storybook.
 * Left page: "Meet the gang", a menu of every buddy in petData.ts (the quiz
 * match glows), and Back. Right page: the picked buddy (standing top-right),
 * its details, a Name box and Choose. On arrival "Pick your buddy!" writes
 * itself and the tiles pop in one by one. Drawn in the open book's own pixels.
 */
export function PetSpread({
  mode,
  matchedBuddy,
  selectedId,
  onSelect,
  names,
  onName,
  chosen,
  busy,
  covered = false,
  frozen = false,
  onChoose,
  onBack,
}: PetSpreadProps) {
  const titleId = useId()
  const live = mode === 'live'
  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  const ready = isBuddyReady(pet.id)
  const isMatch = pet.id === matchedBuddy
  const nickname = names[pet.id] ?? ''
  const displayName = nickname.trim() || pet.name
  const visibleRows = Math.min(Math.ceil(pets.length / MENU_COLUMNS), MENU_MAX_ROWS)
  const modeClass = live ? styles.arrive : mode === 'arriving' ? styles.waiting : ''

  return (
    <div className={modeClass} style={{ '--write': `${WRITE_MS}ms` } as CSSProperties}>
      {/* ---------- Left page: the gang ---------- */}
      <p className={styles.kicker}>Meet the gang</p>
      <h2 id={titleId} className={styles.menuTitle} tabIndex={-1} data-page-title={live || undefined}>
        Pick your buddy!
      </h2>

      <ul
        className={styles.menu}
        aria-labelledby={titleId}
        style={{ '--columns': MENU_COLUMNS, '--visible-rows': visibleRows } as CSSProperties}
      >
        {pets.map((p, k) => {
          const ok = isBuddyReady(p.id)
          const picture = buddyPicture(p.id)
          const selected = p.id === pet.id
          const match = p.id === matchedBuddy
          return (
            <li
              key={p.id}
              className={styles.menuItem}
              style={{ '--pop-delay': `${WRITE_MS + k * TILE_STAGGER_MS}ms` } as CSSProperties}
            >
              {/* The quiz match glows softly, under its usual look. */}
              {/* (Not once a buddy is chosen: nothing can be picked any more, and its endless glow would keep redrawing the page.) */}
              {match && !chosen && <span className={styles.glow} aria-hidden="true" />}
              <button
                type="button"
                className={[styles.tile, styles[p.tint], selected && styles.selected, !ok && styles.locked]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !busy && onSelect?.(p.id)}
                disabled={!ok || chosen}
                aria-pressed={ok ? selected : undefined}
                aria-label={ok ? `${p.name}${match ? ', your match' : ''}` : `${p.name}, coming soon`}
              >
                <span className={styles.tileArt}>
                  {ok && picture ? (
                    <img src={picture} alt="" className={styles.tileImage} draggable={false} />
                  ) : (
                    <Silhouette className={styles.tileSilhouette} />
                  )}
                </span>
                <span className={styles.tileName}>{p.name}</span>
                {!ok && <span className={styles.soonTag}>Coming soon</span>}
                {selected && (
                  <span className={styles.check} aria-hidden="true">
                    <Icon name="check" size={18} />
                  </span>
                )}
              </button>
              {match && (
                <span className={styles.matchRibbon} aria-hidden="true">
                  ★ Your match!
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <button type="button" className={styles.back} onClick={() => !busy && onBack?.()} disabled={chosen}>
        <Icon name="arrowLeft" size={22} />
        <span>Back</span>
      </button>

      {/* ---------- Right page: the picked buddy ---------- */}
      <div key={pet.id} className={styles.rightPage} aria-live="polite">
        <h3 className={styles.petName}>{pet.name}</h3>
        {isMatch && <span className={styles.matchChip}>★ Your match</span>}
        <p className={styles.intro}>“{pet.intro}”</p>

        <ul className={styles.skills}>
          {skillRows.map(({ key, icon, label }) => {
            const level = pet.skills[key]
            return (
              <li key={key} className={styles.skill}>
                <span className={styles.skillIcon} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.skillLabel}>{label}</span>
                <span className={styles.dots} role="img" aria-label={`${level} out of ${MAX_SKILL}`}>
                  {Array.from({ length: MAX_SKILL }, (_, i) => (
                    <span key={i} className={[styles.dot, i < level && styles.dotOn].filter(Boolean).join(' ')} />
                  ))}
                </span>
              </li>
            )
          })}
        </ul>

        <p className={styles.funFact}>
          <strong>Fun fact:</strong> {pet.funFact}
        </p>
      </div>

      {/* The picked buddy stands top-right on the right page. key: a newly picked one hops in. */}
      <div key={`figure-${pet.id}`} className={styles.figureWrap}>
        {covered ? null : frozen && buddyPicture(pet.id) ? (
          <img src={buddyPicture(pet.id)} alt="" className={styles.figure} draggable={false} />
        ) : ready ? (
          <BuddyFigure id={pet.id} name={displayName} className={styles.figure} />
        ) : (
          <Silhouette className={styles.figure} />
        )}
        {chosen && <Confetti />}
      </div>

      <label className={styles.nameLine}>
        <span className={styles.nameLabel}>Name</span>
        <input
          className={styles.nameInput}
          value={nickname}
          placeholder={pet.name}
          maxLength={MAX_NICKNAME}
          onChange={(e) => onName?.(pet.id, cleanNickname(e.target.value))}
          disabled={!ready || chosen}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <Button className={styles.choose} onClick={onChoose} disabled={!ready || chosen}>
        {ready ? `Choose ${displayName}!` : 'Coming soon!'}
      </Button>
    </div>
  )
}

/** Soft "mystery pet" shape for pets with no art yet. */
function Silhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={[styles.silhouette, className].filter(Boolean).join(' ')} aria-hidden="true">
      <path d="M28 30 22 8l20 14M72 30l6-22-20 14" />
      <circle cx="50" cy="40" r="26" />
      <ellipse cx="50" cy="88" rx="24" ry="28" />
    </svg>
  )
}
