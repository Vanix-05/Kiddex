import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Mic, Pause } from 'lucide-react'
import { characterArt } from '../assets/art'
import { Companion } from '../companions/Companion'
import { lookBuddyColor, lookBuddyExtras, lookColors, lookYouExtras } from '../setup/customizeData'
import { Confetti } from './Confetti'
import { PauseCard } from './PauseCard'
import { GAMES } from './session'
import type { GameId, Player } from './types'
import { SLOTS, type StageFit } from './useStage'
import styles from './GameFrame.module.css'

/**
 * The frame every mini game shares:
 * - top: Pause (or Back to games), the game chip, the game's progress
 * - middle: the board, and under it the feedback strip after an answer
 * - left: Ollie behind a podium in the game's color, with a speech bubble
 * - right: the Student and their buddy (real rigs, Customize look), happy and
 *   jumping on a right answer
 * Short windows hide Ollie and the bubbles and put the kid in the corner.
 */
export interface GameFrameProps {
  game: GameId
  lessonName: string
  stage: StageFit
  /** Less motion: no confetti, jumps or shakes. */
  calm: boolean
  /** The full-screen background. */
  scene: ReactNode
  /** play: a Pause button. results: Back to games. */
  mode: 'play' | 'results'
  /** Top right: the game's progress, or the mission on Results. */
  progress: ReactNode
  board: ReactNode
  /** Results use a taller board. */
  tallBoard?: boolean
  /** The feedback strip under the board (only after an answer). */
  strip?: ReactNode
  /** A spotlight on the stage (a right answer, Results). */
  spotlight?: boolean
  /** Confetti falls while set; a new number starts a new shower. */
  confetti?: number | null
  ollieLine: string
  player: Player
  happy: boolean
  /** A new number makes the kid and buddy jump. */
  jump?: number
  kidLine?: string
  onRestart: () => void
  onLeave: () => void
}

/** The game's icon square: Quiz Show a mic, Match Up a piece of yarn. */
export function GameIcon({ game, size = 22 }: { game: GameId; size?: number }) {
  return (
    <span className={`${styles.icon} ${game === 'match-up' ? styles.iconMatch : styles.iconQuiz}`} aria-hidden="true">
      {game === 'match-up' ? <YarnIcon size={size} /> : <Mic size={size} strokeWidth={2.4} />}
    </span>
  )
}

function YarnIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="6" cy="6" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="2.6" fill="currentColor" stroke="none" />
      <path d="M7.5 7.8c2.5 4.5 6.5 3.5 8.6 8.4" />
    </svg>
  )
}

/** "Question 4 of 8 ● ● ● ◎ ○ ○ ○ ○": right green, wrong coral, current ringed. */
export type DotState = 'right' | 'wrong' | 'current' | 'todo'

export function ProgressPill({ label, dots }: { label: string; dots: DotState[] }) {
  return (
    <div className={styles.pill}>
      <span className={styles.pillLabel}>{label}</span>
      <span className={styles.dots} aria-hidden="true">
        {dots.map((d, i) => (
          <span key={i} className={`${styles.dot} ${styles[`dot_${d}`]}`} />
        ))}
      </span>
    </div>
  )
}

export function GameFrame(props: GameFrameProps) {
  const { game, lessonName, stage, calm, scene, mode, progress, board, tallBoard, strip, spotlight, confetti, ollieLine, player, happy, jump, kidLine } = props
  const [paused, setPaused] = useState(false)
  const [playAnyway, setPlayAnyway] = useState(false)
  const slots = stage.short ? SLOTS.short : SLOTS.normal
  const boardSlot = tallBoard ? slots.tall : slots.board

  // Escape opens Pause (and closes it again: PauseCard handles that).
  useEffect(() => {
    if (mode !== 'play' || paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaused(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, paused])

  const stageStyle = {
    width: stage.w,
    height: stage.h,
    transform: `translate(${stage.left}px, ${stage.top}px) scale(${stage.scale})`,
    '--s': stage.scale,
  } as CSSProperties
  const slot = (s: { x: number; y: number; w: number; h: number }) => ({ left: s.x, top: s.y, width: s.w, height: s.h })

  return (
    <div className={styles.root} data-short={stage.short || undefined} data-calm={calm || undefined}>
      <div className={styles.scene}>{scene}</div>
      {confetti != null && !calm && <Confetti key={confetti} />}

      <div className={styles.stage} style={stageStyle} inert={paused || undefined}>
        {spotlight && <div className={styles.spotlight} aria-hidden="true" />}

        <header className={styles.top}>
          <button
            type="button"
            className={styles.topButton}
            onClick={mode === 'play' ? () => setPaused(true) : props.onLeave}
          >
            {mode === 'play' ? (
              <>
                <span className={styles.pauseIcon} aria-hidden="true">
                  <Pause size={17} strokeWidth={3} fill="currentColor" />
                </span>
                Pause
              </>
            ) : (
              'Back to games'
            )}
          </button>

          <div className={styles.chip}>
            <GameIcon game={game} />
            <span className={styles.chipName}>{GAMES[game].name}</span>
            <span className={styles.chipLine} aria-hidden="true" />
            <span className={styles.chipLesson}>{lessonName}</span>
          </div>

          <div className={styles.progress}>{progress}</div>
        </header>

        <main className={styles.board} style={slot(boardSlot)}>
          {board}
        </main>

        <div className={styles.strip} style={slot(slots.strip)} role="status" aria-live="polite">
          {strip}
        </div>

        {!stage.short && (
          <div className={styles.ollie} aria-hidden="true">
            <SpeechBubble className={styles.ollieBubble} text={ollieLine} />
            <img src={characterArt.ollie} alt="" className={styles.ollieArt} draggable={false} />
            <span className={`${styles.podium} ${game === 'match-up' ? styles.podiumMatch : styles.podiumQuiz}`}>
              <svg viewBox="0 0 24 24" width="44" height="44">
                <path
                  d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
                  fill="var(--color-game-star)"
                  stroke="var(--color-card-border)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        )}
        {/* Ollie's words for screen readers too (the bubble is decorative). */}
        <p className="visually-hidden" aria-live="polite">
          Ollie: {ollieLine}
        </p>

        <Kids player={player} happy={happy} jump={calm ? undefined : jump} line={stage.short ? undefined : kidLine} />
      </div>

      {paused && (
        <PauseCard
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false)
            props.onRestart()
          }}
          onLeave={props.onLeave}
        />
      )}

      {/* Phones held upright (CSS shows it): the games need landscape, like the Lobby. */}
      {!playAnyway && (
        <div className={styles.rotate}>
          <div className={styles.rotateCard}>
            <svg viewBox="0 0 64 64" width="90" height="90" aria-hidden="true">
              <rect x="18" y="6" width="28" height="52" rx="6" />
              <circle cx="32" cy="50" r="2.5" />
            </svg>
            <h1>Turn your phone sideways</h1>
            <p>The game is wider than it is tall.</p>
            <button type="button" onClick={() => setPlayAnyway(true)}>
              Play anyway
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SpeechBubble({ text, className }: { text: string; className?: string }) {
  return <p className={[styles.bubble, className].filter(Boolean).join(' ')}>{text}</p>
}

/** The Student and their buddy side by side, on the floor, in their Customize look. */
function Kids({ player, happy, jump, line }: { player: Player; happy: boolean; jump?: number; line?: string }) {
  const emotion = happy ? 'happy' : 'calm'
  // Two identical jump animations, swapped on every new jump, restart it
  // without rebuilding the rigs.
  const jumpClass = jump ? (jump % 2 ? styles.jumpA : styles.jumpB) : ''
  return (
    <div className={styles.kids}>
      {line && <SpeechBubble className={styles.kidBubble} text={line} />}
      {/* Decorative here: the rigs are buttons elsewhere, so keep them out of Tab. */}
      <div className={styles.kidPair} inert aria-hidden="true">
        <span className={`${styles.figure} ${jumpClass}`}>
          <span className={styles.floorShadow} />
          <Companion id={player.avatar} className={styles.rig} emotion={emotion} colors={lookColors(player.look)} extras={lookYouExtras(player.look)} />
        </span>
        <span className={`${styles.figure} ${styles.buddy} ${jumpClass}`}>
          <span className={styles.floorShadow} />
          <Companion id={player.buddy} className={styles.rig} emotion={emotion} buddyColor={lookBuddyColor(player.look)} extras={lookBuddyExtras(player.look)} />
        </span>
      </div>
    </div>
  )
}
