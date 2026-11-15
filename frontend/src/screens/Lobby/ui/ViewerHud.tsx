import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Zoom } from '../game/LobbyGame'
import { LobbyIcon } from './icons'
import { IS_TOUCH } from './touch'
import styles from './ui.module.css'

/**
 * The screen UI for the Teacher's view-only visit: Back to planner (top
 * left), which section this is (top middle), who is in the room (top right),
 * and Zoom and Settings (bottom right). Nothing a Student does here (no
 * mission, emotes, My Room or All games).
 */
export function ViewerHud({
  section,
  studentsHere,
  zoom,
  showHint,
  onBack,
  onZoom,
  onSettings,
  children,
}: {
  /** e.g. "Grade 4 – Sampaguita" */
  section: string
  studentsHere: number
  zoom: Zoom
  /** "WASD or click to move", until the first move. */
  showHint: boolean
  onBack: () => void
  onZoom: () => void
  onSettings: () => void
  /** The toast. */
  children?: ReactNode
}) {
  return (
    <div className={styles.hud}>
      <button type="button" className={`${styles.pill} ${styles.back}`} onClick={onBack}>
        <span className={styles.pillIcon}>
          <ArrowLeft size={24} strokeWidth={2.6} aria-hidden="true" />
        </span>
        Back to planner
      </button>

      <p className={styles.viewing}>
        Viewing <b>{section}</b> · view only
      </p>

      <div className={`${styles.hint} ${styles.hintLow} ${showHint ? '' : styles.hintGone}`} aria-hidden={!showHint}>
        {IS_TOUCH ? (
          'Tap the floor to move Ollie'
        ) : (
          <>
            <span className={styles.keys}>
              {['W', 'A', 'S', 'D'].map((k) => (
                <kbd key={k} className={styles.key}>
                  {k}
                </kbd>
              ))}
            </span>
            or click to move Ollie
          </>
        )}
      </div>

      <div className={styles.topRight}>
        <div className={styles.online} role="status">
          {studentsHere === 0 ? (
            'No students are in the classroom right now.'
          ) : (
            <>
              <span className={styles.dot} aria-hidden="true" />
              {studentsHere} {studentsHere === 1 ? 'student' : 'students'} here
            </>
          )}
        </div>
      </div>

      <div className={styles.bottomRight}>
        <button type="button" className={styles.round} onClick={onZoom} aria-label={zoom === 'close' ? 'Zoom out' : 'Zoom in'}>
          <LobbyIcon name={zoom === 'close' ? 'zoomOut' : 'zoomIn'} size={28} />
        </button>
        <button type="button" className={styles.round} onClick={onSettings} aria-label="Settings">
          <LobbyIcon name="gear" size={28} />
        </button>
      </div>

      {children}
    </div>
  )
}
