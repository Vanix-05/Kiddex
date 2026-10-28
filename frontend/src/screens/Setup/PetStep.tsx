import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BuddyFigure } from '../../components/BuddyFigure/BuddyFigure'
import { buddyPicture, isBuddyReady } from '../../components/BuddyFigure/buddyArt'
import { Button } from '../../components/Button/Button'
import { Icon } from '../../components/Icon/Icon'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import {
  cleanNickname,
  MAX_NICKNAME,
  MAX_SKILL,
  ollieChosen,
  ollieOnMatch,
  ollieOnOther,
  pets,
  skillRows,
} from '../../setup/petData'
import type { BuddyId } from '../../setup/quizData'
import { Confetti } from './Confetti'
import { Ollie } from './Ollie'
import { SetupStage } from './SetupStage'
import { PageContent, StoryBook, TURN_MS } from './StoryBook'
import { useSetupState, type SetupState } from './setupState'
import styles from './Pet.module.css'

/** Confetti + "A perfect team!" before going to Learner Home. */
const CHOSEN_MS = 1800
/** Pet menu: tiles per row, and rows shown before it scrolls. */
const MENU_COLUMNS = 4
const MENU_MAX_ROWS = 3

/** The first pet that can be picked: the quiz match if it's ready, else the first ready one. */
const firstPick = (matched: BuddyId | null) =>
  (pets.find((p) => p.id === matched && isBuddyReady(p.id)) ?? pets.find((p) => isBuddyReady(p.id)) ?? pets[0]).id

/**
 * Setup step 4 (/setup/pet). Left page: a menu of every pet in petData.ts.
 * Right page: the picked pet's details and Choose. The picked pet also stands
 * big on the right with a Name box; Ollie perches on the book.
 * Choose saves the picks and goes to Learner Home; Back returns to the gender page.
 */
export function PetStep() {
  const navigate = useNavigate()
  const { finishSetup } = useSession()
  const { matchedBuddy, avatar } = useSetupState()
  const [selectedId, setSelectedId] = useState<BuddyId>(() => firstPick(matchedBuddy))
  const [leaving, setLeaving] = useState(false)
  const [chosen, setChosen] = useState(false)
  // Nicknames typed so far, per pet, so switching back keeps them.
  const [names, setNames] = useState<Partial<Record<BuddyId, string>>>({})
  const timers = useRef<number[]>([])

  const busy = leaving || chosen

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // Opened directly: earlier steps first.
  if (!matchedBuddy) return <Navigate to={paths.setup.quiz} replace />
  if (!avatar) {
    const state: SetupState = { matchedBuddy }
    return <Navigate to={paths.setup.gender} replace state={state} />
  }

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  const ready = isBuddyReady(pet.id)
  const isMatch = pet.id === matchedBuddy
  const nickname = names[pet.id] ?? ''
  const displayName = nickname.trim() || pet.name
  const visibleRows = Math.min(Math.ceil(pets.length / MENU_COLUMNS), MENU_MAX_ROWS)

  const handleChoose = () => {
    if (!ready || busy) return
    setChosen(true)
    later(CHOSEN_MS, () => {
      finishSetup({ avatar, buddy: pet.id, nickname: nickname.trim() })
      navigate(paths.learner.home, { replace: true })
    })
  }

  const handleBack = () => {
    if (busy) return
    setLeaving(true)
    const state: SetupState = { matchedBuddy, avatar }
    later(TURN_MS, () => navigate(paths.setup.gender, { state }))
  }

  const ollieSays = chosen ? ollieChosen : isMatch ? ollieOnMatch : ollieOnOther(pet.name)

  const petSide = (
    <div className={styles.petSide}>
      {/* key: a newly picked pet hops in. */}
      <div key={pet.id} className={styles.figureWrap}>
        {ready ? (
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
          onChange={(e) => setNames((n) => ({ ...n, [pet.id]: cleanNickname(e.target.value) }))}
          disabled={!ready || chosen}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
    </div>
  )

  return (
    <SetupStage title="Pick your buddy" aside={petSide} wide>
      <div className={styles.bookArea}>
        {/* Ollie, small, perched on the top corner of the book. */}
        <div className={styles.perch}>
          <Ollie small says={ollieSays} />
        </div>

        <StoryBook turning={leaving ? 'back' : null}>
          <PageContent enter leaving={leaving}>
            <div className={styles.spread}>
              {/* ---------- Left page: the pet menu ---------- */}
              <div className={styles.leftPage}>
                <p className={styles.kicker}>Meet the gang</p>
                <h2 id="pet-menu-title" className={styles.menuTitle}>
                  Pick your buddy!
                </h2>

                <ul
                  className={styles.menu}
                  aria-labelledby="pet-menu-title"
                  style={{ '--columns': MENU_COLUMNS, '--visible-rows': visibleRows } as CSSProperties}
                >
                  {pets.map((p) => {
                    const ok = isBuddyReady(p.id)
                    const picture = buddyPicture(p.id)
                    const selected = p.id === pet.id
                    const match = p.id === matchedBuddy
                    return (
                      <li key={p.id} className={styles.menuItem}>
                        <button
                          type="button"
                          className={[styles.tile, styles[p.tint], selected && styles.selected, !ok && styles.locked]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setSelectedId(p.id)}
                          disabled={!ok || busy}
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
                              <Icon name="check" size={16} />
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

                <button type="button" className={styles.back} onClick={handleBack} disabled={busy}>
                  <Icon name="arrowLeft" size={20} />
                  <span>Back</span>
                </button>
              </div>

              {/* ---------- Right page: the picked pet ---------- */}
              <div key={pet.id} className={styles.rightPage} aria-live="polite">
                <div className={styles.titleRow}>
                  <h3 className={styles.petName}>{pet.name}</h3>
                  {isMatch && <span className={styles.matchChip}>★ Your match</span>}
                </div>
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

                <Button fullWidth className={styles.choose} onClick={handleChoose} disabled={!ready || busy}>
                  {ready ? `Choose ${displayName}!` : 'Coming soon!'}
                </Button>
              </div>
            </div>
          </PageContent>
        </StoryBook>
      </div>
    </SetupStage>
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
