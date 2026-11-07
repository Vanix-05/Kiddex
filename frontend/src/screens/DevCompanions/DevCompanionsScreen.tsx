import { useEffect, useState } from 'react'
import { Companion } from '../../companions/Companion'
import type { CompanionId } from '../../companions/registry'
import { EMOTIONS, type Emotion } from '../../companions/rig/emotions'
import { MOVES, playAllRigs, rigSettings } from '../../companions/rig/useSpringRig'
import { ITEMS, type AccessoryId } from '../../setup/customizeData'
import styles from './DevCompanionsScreen.module.css'

const HUMANS: CompanionId[] = ['boy', 'girl']
/** Every accessory that draws something, for checking the fit on each companion. */
const EXTRAS: AccessoryId[] = ['glasses', 'starClip', 'flowerYellow', 'scarf', 'bow', 'flowerPink']

const TRACED: CompanionId[] = ['fox', 'boy', 'girl', 'kitty', 'axolotl', 'raccoon', 'ram', 'monkey', 'otter', 'dog']

/**
 * Dev only (/dev/companions): every traced companion in a grid, to check the
 * rig. Emotion buttons set all of them at once; the move buttons play a move
 * on all of them; slow motion runs the springs at 0.35x. The Customize rows
 * recolor the boy and girl (skin, hair, shirt), hue-rotate the buddies, and put
 * accessories on everyone.
 */
export function DevCompanionsScreen() {
  const [emotion, setEmotion] = useState<Emotion>('calm')
  const [slow, setSlow] = useState(false)
  const [autoMoves, setAutoMoves] = useState(true)
  // Customize checks
  const [skin, setSkin] = useState<string>()
  const [hair, setHair] = useState<string>()
  const [shirt, setShirt] = useState<string>()
  const [hue, setHue] = useState(0)
  const [extras, setExtras] = useState<AccessoryId[]>([])
  const toggleExtra = (a: AccessoryId) => setExtras((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]))

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
        {(['skin', 'hair', 'shirt'] as const).map((key) => {
          const [value, set] = key === 'skin' ? [skin, setSkin] : key === 'hair' ? [hair, setHair] : [shirt, setShirt]
          return (
            <div key={key} className={styles.row} role="group" aria-label={key}>
              <span className={styles.rowLabel}>{key}</span>
              <button type="button" aria-pressed={!value} onClick={() => set(undefined)}>
                as drawn
              </button>
              {ITEMS[key].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.swatch}
                  style={{ background: item.swatch }}
                  aria-pressed={value === item.swatch}
                  aria-label={item.label || item.id}
                  onClick={() => set(item.swatch)}
                />
              ))}
            </div>
          )
        })}
        <div className={styles.row} role="group" aria-label="Buddy color">
          <span className={styles.rowLabel}>buddy color</span>
          {ITEMS.buddyColor.map((item) => (
            <button key={item.id} type="button" aria-pressed={hue === item.hue} onClick={() => setHue(item.hue ?? 0)}>
              {item.label} ({item.hue}°)
            </button>
          ))}
        </div>
        <div className={styles.row} role="group" aria-label="Accessories">
          <span className={styles.rowLabel}>extras</span>
          {EXTRAS.map((a) => (
            <button key={a} type="button" aria-pressed={extras.includes(a)} onClick={() => toggleExtra(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {TRACED.map((id) => (
          <figure key={id} className={styles.cell}>
            <Companion
              id={id}
              emotion={emotion}
              className={styles.companion}
              colors={HUMANS.includes(id) ? { skin, hair, shirt } : undefined}
              hue={HUMANS.includes(id) ? 0 : hue}
              extras={extras}
            />
            <figcaption>{id}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
