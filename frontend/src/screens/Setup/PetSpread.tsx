import { useId, type CSSProperties } from 'react'
import { storybookArt } from '../../assets/art'
import { BuddyFigure } from '../../components/BuddyFigure/BuddyFigure'
import { buddyPicture, isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { cleanNickname, MAX_NICKNAME, MAX_SKILL, pets, skillRows, type PetInfo } from '../../setup/petData'
import type { BuddyId } from '../../setup/quizData'
import { Confetti } from './Confetti'
import { WRITE_MS, type SpreadMode } from './bookPages'
import story from './StoryPage.module.css'
import styles from './Pet.module.css'

/*
 * Where the buddies stand on the meadow (book pixels): the point under each
 * buddy's feet. Its picture is centered on x, its bottom on y, and its
 * z-index is y, so the ones in front overlap the ones behind.
 */
/** The quiz match, big, on the stump. */
const STUMP = [323, 338] as const
/** The other 7 in petData order (the match left out): 3 on the left of the bench, 3 on the right, 1 on the grass in front. */
const BENCH = [
  [205, 274],
  [142, 382],
  [226, 490],
  [442, 274],
  [506, 382],
  [422, 490],
  [323, 612],
] as const

/** How tall each buddy is drawn (book pixels): on the bench, and on the stump. The pictures keep their own width ratio. */
const HEIGHTS: Record<BuddyId, { bench: number; stump: number }> = {
  fox: { bench: 102, stump: 178 },
  kitty: { bench: 101, stump: 177 },
  axolotl: { bench: 83, stump: 145 },
  dog: { bench: 85, stump: 147 },
  otter: { bench: 86, stump: 150 },
  raccoon: { bench: 93, stump: 161 },
  ram: { bench: 86, stump: 150 },
  monkey: { bench: 90, stump: 157 },
}
/** The match's still gold glow: its size, and how far its top sits above the buddy's middle. */
const GLOW_SIZE = 250
const GLOW_ABOVE_MIDDLE = 120

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
  /** Choose could not be saved: a friendly line, and the button says Try again. */
  saveProblem?: boolean
}

/**
 * Pick your buddy, the last spread of the setup storybook.
 * Left page: one still pencil drawing, a meadow with a tree stump and a
 * bench. The quiz match stands big on the stump (a soft gold glow behind it,
 * a "Your match!" ribbon under it); the other buddies stand small on the
 * bench and the grass, with name tags. Each buddy is a button: tapping it
 * picks it (an orange pencil circle). Back is at the bottom. Right page: the
 * picked buddy (standing top-right, the only thing that moves), its details,
 * a Name box and Choose. On arrival "Pick your buddy!" writes itself.
 * Drawn in the open book's own pixels.
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
  saveProblem = false,
}: PetSpreadProps) {
  const titleId = useId()
  const live = mode === 'live'
  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  const ready = isBuddyReady(pet.id)
  const isMatch = pet.id === matchedBuddy
  const nickname = names[pet.id] ?? ''
  const displayName = nickname.trim() || pet.name
  const modeClass = live ? styles.arrive : mode === 'arriving' ? styles.waiting : ''

  // The match on the stump (if there is none yet, the first buddy); the rest on the bench, as many as there are places.
  const stumpPet = pets.find((p) => p.id === matchedBuddy) ?? pets[0]
  const benchPets = pets.filter((p) => p !== stumpPet).slice(0, BENCH.length)
  const stumpHeight = HEIGHTS[stumpPet.id].stump
  const [stumpX, stumpY] = STUMP

  const buddy = (p: PetInfo, x: number, y: number, onStump: boolean) => (
    <li key={p.id}>
      <GangBuddy
        pet={p}
        x={x}
        y={y}
        height={HEIGHTS[p.id][onStump ? 'stump' : 'bench']}
        onStump={onStump}
        match={p.id === matchedBuddy}
        selected={p.id === pet.id}
        chosen={chosen}
        onPick={() => !busy && onSelect?.(p.id)}
      />
    </li>
  )

  return (
    <div className={modeClass} style={{ '--write': `${WRITE_MS}ms` } as CSSProperties}>
      {/* ---------- Left page: the gang in the meadow ---------- */}
      <div className={styles.meadow}>
        <img src={storybookArt.meadow} alt="" className={styles.meadowPicture} draggable={false} />
      </div>
      {/* The match's soft gold glow: still. */}
      <span
        className={styles.glow}
        aria-hidden="true"
        style={{ left: stumpX - GLOW_SIZE / 2, top: stumpY - stumpHeight / 2 - GLOW_ABOVE_MIDDLE, width: GLOW_SIZE, height: GLOW_SIZE }}
      />

      <p className={`${story.hand} ${styles.kicker}`}>Meet the gang</p>
      <h2
        id={titleId}
        className={`${story.hand} ${story.title} ${styles.menuTitle}`}
        tabIndex={-1}
        data-page-title={live || undefined}
      >
        Pick your buddy!
      </h2>

      <ul className={styles.gang} aria-labelledby={titleId}>
        {buddy(stumpPet, stumpX, stumpY, true)}
        {benchPets.map((p, i) => buddy(p, BENCH[i][0], BENCH[i][1], false))}
      </ul>

      {stumpPet.id === matchedBuddy && (
        <span className={`${story.hand} ${styles.matchRibbon}`} aria-hidden="true" style={{ left: stumpX - 82, top: stumpY + 22 }}>
          <MatchRibbon />★ Your match!
        </span>
      )}

      <button
        type="button"
        className={`${story.hand} ${styles.back}`}
        onClick={() => !busy && onBack?.()}
        disabled={chosen}
      >
        <Icon name="arrowLeft" size={24} />
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
        {!ready ? 'Coming soon!' : saveProblem ? 'Try again' : `Choose ${displayName}!`}
      </Button>
      {live && (
        <p role="alert" className={styles.saveProblem}>
          {saveProblem ? SAVE_PROBLEM : ''}
        </p>
      )}
    </div>
  )
}

/** Choose could not reach the server (the picks stay on the page). */
const SAVE_PROBLEM = 'Oops! We couldn’t save your buddy. Check the internet, then tap Try again.'

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

interface GangBuddyProps {
  pet: PetInfo
  /** Where its feet are (book pixels). */
  x: number
  y: number
  /** How tall it is drawn (book pixels). */
  height: number
  /** On the stump: no name tag (the "Your match!" ribbon is there). */
  onStump: boolean
  match: boolean
  selected: boolean
  chosen: boolean
  onPick: () => void
}

/**
 * One buddy in the meadow: its plain pencil picture, a button. Picked: an
 * orange pencil circle around it and an orange name tag. A buddy that isn't
 * ready (or has no pencil picture yet) is greyed, "Coming soon".
 */
function GangBuddy({ pet, x, y, height, onStump, match, selected, chosen, onPick }: GangBuddyProps) {
  const picture = storybookArt.pencilBuddies[pet.id]
  const ok = isBuddyReady(pet.id) && !!picture
  const picked = ok && selected
  return (
    <button
      type="button"
      className={[styles.buddy, picked && styles.picked, !ok && styles.notReady].filter(Boolean).join(' ')}
      style={{ left: x, top: y - height, height, zIndex: y }}
      onClick={onPick}
      disabled={!ok || chosen}
      aria-pressed={ok ? selected : undefined}
      aria-label={ok ? `${pet.name}${match ? ', your match' : ''}` : `${pet.name}, coming soon`}
    >
      <span className={styles.buddyArt}>
        {picked && <PencilRing />}
        {picture ? (
          <img src={picture} alt="" className={styles.buddyPicture} draggable={false} />
        ) : (
          <Silhouette className={styles.buddySilhouette} />
        )}
      </span>
      {!onStump && <span className={`${story.hand} ${styles.tag}`}>{ok ? pet.name : 'Coming soon'}</span>}
    </button>
  )
}

/** The hand-drawn orange loop around the picked buddy (behind its picture). */
function PencilRing() {
  return (
    <svg className={styles.ring} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M50 4C80 3 97 22 96 50S78 97 49 96 3 78 4 49 22 5 54 6"
        fill="none"
        style={{ stroke: 'var(--color-story-picked)' }}
        strokeWidth="3.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** The yellow "Your match!" banner with folded ends, under the match's feet. */
function MatchRibbon() {
  const ink = { stroke: 'var(--color-card-border)' }
  return (
    <svg className={styles.ribbonArt} viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 8h22v28H2l9-14z" style={{ ...ink, fill: 'var(--color-story-ribbon-end)' }} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M198 8h-22v28h22l-9-14z" style={{ ...ink, fill: 'var(--color-story-ribbon-end)' }} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 2h168v32H16z" style={{ ...ink, fill: 'var(--color-story-ribbon)' }} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}
