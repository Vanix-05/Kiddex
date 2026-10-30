import { useEffect, useState } from 'react'
import { Companion } from '../../companions/Companion'
import type { CompanionId } from '../../companions/registry'
import { EMOTIONS, type Emotion } from '../../companions/rig/emotions'
import { MOVES, playAllRigs, rigSettings } from '../../companions/rig/useSpringRig'
import styles from './DevCompanionsScreen.module.css'

const TRACED: CompanionId[] = ['fox', 'boy', 'girl', 'kitty', 'axolotl', 'raccoon', 'ram', 'monkey', 'otter', 'dog']

/**
 * Dev only (/dev/companions): every traced companion in a grid, to check the
 * rig. Emotion buttons set all of them at once; the move buttons play a move
 * on all of them; slow motion runs the springs at 0.35x.
 */
export function DevCompanionsScreen() {
  const [emotion, setEmotion] = useState<Emotion>('calm')
  const [slow, setSlow] = useState(false)
  const [autoMoves, setAutoMoves] = useState(true)

  useEffect(() => {
    rigSettings.timeScale = slow ? 0.35 : 1
  }, [slow])
  useEffect(() => {
    rigSettings.autoMoves = autoMoves
  }, [autoMoves])
  // Back to normal when leaving the page.
  useEffect(
    () => () => {
      rigSettings.timeScale = 1
      rigSettings.autoMoves = true
    },
    [],
  )

  return (
    <main className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.row} role="group" aria-label="Emotion">
          {EMOTIONS.map((e) => (
            <button key={e} type="button" aria-pressed={emotion === e} data-emotion={e} onClick={() => setEmotion(e)}>
              {e}
            </button>
          ))}
        </div>
        <div className={styles.row} role="group" aria-label="Moves">
          {MOVES.map((m) => (
            <button key={m} type="button" data-move={m} onClick={() => playAllRigs(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <label>
            <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow motion
          </label>
          <label>
            <input type="checkbox" checked={autoMoves} onChange={(e) => setAutoMoves(e.target.checked)} /> Random moves
          </label>
        </div>
      </div>
      <div className={styles.grid}>
        {TRACED.map((id) => (
          <figure key={id} className={styles.cell}>
            <Companion id={id} emotion={emotion} className={styles.companion} />
            <figcaption>{id}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
