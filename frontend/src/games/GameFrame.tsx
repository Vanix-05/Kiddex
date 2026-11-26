import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Mic, Pause, PawPrint, PencilLine } from 'lucide-react'
import { Companion } from '../companions/Companion'
import { KidRig } from '../companions/wardrobe/KidRig'
import { kidLook, lookBuddyColor, lookBuddyExtras, lookYouExtras } from '../setup/customizeData'
import { STREAK_FOR_HELP } from './buddyHelp'
import { Confetti } from './Confetti'
import { PauseCard } from './PauseCard'
import { GAMES } from './session'
import type { GameId, Player } from './types'
import { slotsFor, type StageFit } from './useStage'
import styles from './GameFrame.module.css'

/**
 * The frame every mini game shares:
 * - top: Pause (or Back to games), the game chip, the game's progress
 * - middle: the board, and under it the feedback strip after an answer
 * - left: the Student's own buddy (real rig, Customize look), the guide, with
 *   a speech bubble under its name; the Buddy Help button under it
 * - right: the Student, with a small bubble on a right answer and on Results
 * Short windows hide the bubbles and put the buddy and the kid small in the
 * corner; the Buddy Help button stays. Ollie is not in the games.
 */

/** The Buddy Help button (play only). */
export interface BuddyHelpProps {
  /** Helps held now. */
  count: number
  /** Right answers in a row toward the next help. */
  streak: number
  /** The short line under the label: "1 more right", "New help earned!"… */
  line: string
  /** Can't be pressed (0 helps, or not on this question). */
  disabled: boolean
  /** A new number: the button glows for a moment (a help was just earned). */
  glow?: number
  /** Uses a help. Returns true when the buddy really helped (then it looks surprised and leans in). */
  onUse: () => boolean
}
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
  /** What the buddy says (every line Ollie used to say). */
  buddyLine: string
  player: Player
  happy: boolean
  /** A new number makes the kid and buddy jump. */
  jump?: number
  /** The kid's own small bubble: only on a right answer and on Results. */
  kidLine?: string
  /** Buddy Help (play only). Tapping the buddy does the same as the button; so does H. */
  help?: BuddyHelpProps
  /** A Teacher preview: a "Preview · nothing is saved" ribbon under the game chip. */
  preview?: boolean
  onRestart: () => void
  onLeave: () => void
}

/** The game's icon square: Quiz Show a mic (purple), Match Up a piece of yarn (teal), Fill the Blank a pencil (green). */
export function GameIcon({ game, size = 22 }: { game: GameId; size?: number }) {
  const look = game === 'match-up' ? styles.iconMatch : game === 'fill-blank' ? styles.iconBlank : styles.iconQuiz
  return (
    <span className={`${styles.icon} ${look}`} aria-hidden="true">
      {game === 'match-up' ? (
        <YarnIcon size={size} />
      ) : game === 'fill-blank' ? (
        <PencilLine size={size} strokeWidth={2.4} />
      ) : (
        <Mic size={size} strokeWidth={2.4} />
      )}
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
  const { game, lessonName, stage, calm, scene, mode, progress, board, tallBoard, strip, spotlight, confetti, buddyLine, player, happy, jump, kidLine } = props
  const help = mode === 'play' ? props.help : undefined
  const [paused, setPaused] = useState(false)
  // Buddy Help used: the buddy leans toward the board (a new number restarts it) and looks surprised for a moment.
  const [lean, setLean] = useState(0)
  const [surprised, setSurprised] = useState(false)
  const surpriseTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(surpriseTimer.current), [])
  const slots = slotsFor(stage)
  const boardSlot = tallBoard ? slots.tall : slots.board

  // The button, a tap on the buddy and H all do this.
  const helpRef = useRef(help)
  useEffect(() => {
    helpRef.current = help
  })
  const triggerHelp = () => {
    const h = helpRef.current
    if (!h || h.disabled || !h.onUse()) return
    setLean((n) => n + 1)
    setSurprised(true)
    window.clearTimeout(surpriseTimer.current)
    surpriseTimer.current = window.setTimeout(() => setSurprised(false), 1100)
  }
  const triggerRef = useRef(triggerHelp)
  useEffect(() => {
    triggerRef.current = triggerHelp
  })

  // Escape opens Pause (and closes it again: PauseCard handles that). H uses Buddy Help.
  useEffect(() => {
    if (mode !== 'play' || paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') setPaused(true)
      else if (e.key.toLowerCase() === 'h' && !e.repeat) {
        e.preventDefault()
        triggerRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, paused])

  const buddyFace = surprised ? 'surprised' : happy ? 'happy' : 'calm'

  const stageStyle = {
    width: stage.w,
    height: stage.h,
    transform: `translate(${stage.left}px, ${stage.top}px) scale(${stage.scale})`,
    '--s': stage.scale,
    // The design height (taller than 420 on some sideways phones): the buddy and the kid stand on its bottom.
    '--stage-h': `${stage.h}px`,
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
            {props.preview && <span className={styles.previewRibbon}>Preview · nothing is saved</span>}
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
          <p className={`${styles.bubble} ${styles.buddyBubble}`} aria-hidden="true">
            <span className={styles.buddyName}>{player.buddyName}</span>
            {buddyLine}
          </p>
        )}
        {/* The buddy's words for screen readers too (the bubble is decorative). */}
        <p className="visually-hidden" aria-live="polite">
          {player.buddyName}: {buddyLine}
        </p>

        <Characters
          player={player}
          buddyFace={buddyFace}
          kidFace={happy ? 'happy' : 'calm'}
          jump={calm ? undefined : jump}
          lean={calm ? 0 : lean}
          kidLine={stage.short ? undefined : kidLine}
          onBuddy={help && !help.disabled ? triggerHelp : undefined}
        />

        {help && <BuddyHelpButton help={help} buddyName={player.buddyName} calm={calm} onUse={triggerHelp} />}
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
    </div>
  )
}

export function SpeechBubble({ text, className }: { text: string; className?: string }) {
  return <p className={[styles.bubble, className].filter(Boolean).join(' ')}>{text}</p>
}

/**
 * The buddy on the left (tap it for Buddy Help) and the Student on the right,
 * standing on the floor in their Customize look.
 */
function Characters({
  player,
  buddyFace,
  kidFace,
  jump,
  lean,
  kidLine,
  onBuddy,
}: {
  player: Player
  buddyFace: 'calm' | 'happy' | 'surprised'
  kidFace: 'calm' | 'happy'
  jump?: number
  lean: number
  kidLine?: string
  /** Set while Buddy Help can be used: a tap on the buddy uses it. */
  onBuddy?: () => void
}) {
  // Two identical animations, swapped on every new jump (or lean), restart it
  // without rebuilding the rigs.
  const jumpClass = jump ? (jump % 2 ? styles.jumpA : styles.jumpB) : ''
  const leanClass = lean ? (lean % 2 ? styles.leanA : styles.leanB) : ''
  return (
    <div className={styles.kids}>
      {kidLine && <SpeechBubble className={styles.kidBubble} text={kidLine} />}
      {/* Mouse and touch only: keyboard users have the Buddy Help button and H. */}
      <div className={`${styles.buddySpot} ${onBuddy ? styles.buddyTap : ''}`} aria-hidden="true" onClick={onBuddy}>
        <span className={leanClass}>
          <span className={`${styles.figure} ${styles.buddyFigure} ${jumpClass}`}>
            <span className={styles.floorShadow} />
            <Companion
              id={player.buddy}
              className={styles.rig}
              emotion={buddyFace}
              buddyColor={lookBuddyColor(player.look)}
              extras={lookBuddyExtras(player.look)}
            />
          </span>
        </span>
      </div>
      {/* Decorative: keep the rig out of Tab. */}
      <div className={styles.kidSpot} inert aria-hidden="true">
        <span className={`${styles.figure} ${styles.kidFigure} ${jumpClass}`}>
          <span className={styles.floorShadow} />
          <KidRig kid={player.avatar} look={kidLook(player.look, player.avatar)} className={styles.rig} emotion={kidFace} extras={lookYouExtras(player.look)} />
        </span>
      </div>
    </div>
  )
}

/** Bottom left: Buddy Help, with the helps held and the streak toward the next one. */
function BuddyHelpButton({ help, buddyName, calm, onUse }: { help: BuddyHelpProps; buddyName: string; calm: boolean; onUse: () => void }) {
  const glowClass = help.glow && !calm ? (help.glow % 2 ? styles.helpGlowA : styles.helpGlowB) : ''
  return (
    <button
      type="button"
      className={`${styles.help} ${help.disabled ? styles.helpOff : ''} ${glowClass}`}
      disabled={help.disabled}
      onClick={onUse}
      aria-label={`Buddy Help: ${buddyName} gives a hint. ${help.count} ${help.count === 1 ? 'help' : 'helps'} left. ${help.line.replace(/[.!]$/, '')}. Key H.`}
    >
      <span className={styles.helpPaw} aria-hidden="true">
        <PawPrint size={22} strokeWidth={2.4} fill="currentColor" />
      </span>
      <span className={styles.helpText} aria-hidden="true">
        <b>Buddy Help</b>
        <small>
          <span className={styles.helpDots}>
            {Array.from({ length: STREAK_FOR_HELP }, (_, i) => (
              <i key={i} className={i < help.streak ? styles.helpDotOn : undefined} />
            ))}
          </span>
          {help.line}
        </small>
      </span>
      <span className={styles.helpCount} aria-hidden="true">
        {help.count}
      </span>
    </button>
  )
}
