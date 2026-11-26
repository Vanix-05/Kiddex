import { useEffect, useState } from 'react'
import type { Emotion } from '../../companions/rig/emotions'
import { playAllRigs, rigSettings } from '../../companions/rig/useSpringRig'
import { KidRig } from '../../companions/wardrobe/KidRig'
import {
  CLOTH_COLORS,
  DEFAULT_LOOK,
  EYE_COLORS,
  HAIR_COLORS,
  KIDS,
  WARDROBE,
  type Kid,
  type KidLook,
} from '../../companions/wardrobe/items'
import { ITEMS } from '../../setup/customizeData'
import styles from './DevWardrobeScreen.module.css'

const label = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Chips for one choice (a piece or a color). */
function Chips<T extends string | undefined>({
  name,
  value,
  options,
  onPick,
}: {
  name: string
  value: T
  options: readonly { id: T; label?: string; color?: string }[]
  onPick: (id: T) => void
}) {
  return (
    <div className={styles.row} role="group" aria-label={name}>
      <span className={styles.rowLabel}>{name}</span>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          className={o.color ? styles.swatch : undefined}
          style={o.color ? { background: o.color } : undefined}
          aria-pressed={value === o.id}
          aria-label={o.label ?? o.color}
          title={o.color}
          onClick={() => onPick(o.id)}
        >
          {o.color ? null : o.label}
        </button>
      ))}
    </div>
  )
}

const colorChips = (colors: readonly string[]) => colors.map((c) => ({ id: c, color: c }))

/** Still figures of one kid wearing each piece once (the rest of the look is the kid's default). */
function PieceGrid({ kid }: { kid: Kid }) {
  const base = DEFAULT_LOOK[kid]
  const w = WARDROBE[kid]
  const cells: { key: string; caption: string; look: KidLook }[] = [
    ...w.hair.map((h) => ({ key: `hair-${h.id}`, caption: `Hair: ${h.label}`, look: { ...base, hair: h.id } })),
    ...w.tops.map((t) => ({ key: `top-${t.id}`, caption: `Top: ${t.label}`, look: { ...base, top: t.id } })),
    ...w.bottoms.map((b) => ({ key: `bottom-${b.id}`, caption: `Bottom: ${b.label}`, look: { ...base, bottom: b.id } })),
    ...w.shoes.map((s) => ({ key: `shoes-${s.id}`, caption: `Shoes: ${s.label}`, look: { ...base, shoes: s.id } })),
  ]
  return (
    <section>
      <h2 className={styles.gridTitle}>{label(kid)}: each piece once</h2>
      <div className={styles.grid}>
        {cells.map((c) => (
          <figure key={c.key} className={styles.cell}>
            <KidRig kid={kid} look={c.look} still className={styles.small} />
            <figcaption>{c.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/**
 * Dev only (/dev/wardrobe): the kids drawn from wardrobe pieces (KidRig).
 * Two big animated kids with move and emotion buttons (do the sleeves follow
 * the arms, the shoes the legs, does the hair bounce and the skirt stay
 * still?), chips to dress either of them, and a grid of every piece.
 */
export function DevWardrobeScreen() {
  const [looks, setLooks] = useState<Record<Kid, KidLook>>(DEFAULT_LOOK)
  const [editing, setEditing] = useState<Kid>('girl')
  const [emotion, setEmotion] = useState<Emotion>('calm')
  const [slow, setSlow] = useState(false)
  const [autoMoves, setAutoMoves] = useState(false)

  useEffect(() => {
    rigSettings.timeScale = slow ? 0.35 : 1
  }, [slow])
  useEffect(() => {
    rigSettings.autoMoves = autoMoves
  }, [autoMoves])
  useEffect(
    () => () => {
      rigSettings.timeScale = 1
      rigSettings.autoMoves = true
    },
    [],
  )

  const look = looks[editing]
  const set = (patch: Partial<KidLook>) => setLooks((l) => ({ ...l, [editing]: { ...l[editing], ...patch } }))
  const w = WARDROBE[editing]

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        {KIDS.map((kid) => (
          <figure key={kid} className={styles.bigCell}>
            <KidRig kid={kid} look={looks[kid]} emotion={emotion} className={styles.big} />
            <figcaption>{label(kid)}</figcaption>
          </figure>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.row}>
          <button type="button" onClick={() => playAllRigs('wave')}>
            Wave
          </button>
          <button type="button" onClick={() => playAllRigs('jump')}>
            Jump
          </button>
          <button type="button" onClick={() => playAllRigs('dance')}>
            Dance
          </button>
          {(['calm', 'happy', 'sad'] as const).map((e) => (
            <button key={e} type="button" aria-pressed={emotion === e} onClick={() => setEmotion(e)}>
              {label(e)}
            </button>
          ))}
          <label>
            <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow motion
          </label>
          <label>
            <input type="checkbox" checked={autoMoves} onChange={(e) => setAutoMoves(e.target.checked)} /> Random moves
          </label>
        </div>

        <Chips name="Dressing" value={editing} options={KIDS.map((k) => ({ id: k, label: label(k) }))} onPick={setEditing} />
        <Chips name="Hair" value={look.hair} options={w.hair} onPick={(hair) => set({ hair })} />
        <Chips name="Top" value={look.top} options={w.tops} onPick={(top) => set({ top })} />
        <Chips name="Bottom" value={look.bottom} options={w.bottoms} onPick={(bottom) => set({ bottom })} />
        <Chips name="Shoes" value={look.shoes} options={w.shoes} onPick={(shoes) => set({ shoes })} />
        <Chips name="Hair color" value={look.hairColor} options={colorChips(HAIR_COLORS)} onPick={(hairColor) => set({ hairColor })} />
        <Chips name="Top color" value={look.topColor} options={colorChips(CLOTH_COLORS)} onPick={(topColor) => set({ topColor })} />
        <Chips
          name="Bottom color"
          value={look.bottomColor}
          options={colorChips(CLOTH_COLORS)}
          onPick={(bottomColor) => set({ bottomColor })}
        />
        <Chips
          name="Shoes color"
          value={look.shoesColor}
          options={colorChips(CLOTH_COLORS)}
          onPick={(shoesColor) => set({ shoesColor })}
        />
        <Chips
          name="Skin"
          value={look.skin}
          options={[{ id: undefined, label: 'As drawn' }, ...colorChips(ITEMS.skin.map((s) => s.swatch!))]}
          onPick={(skin) => set({ skin })}
        />
        <Chips
          name="Eyes"
          value={look.eyeColor}
          options={[{ id: undefined, label: 'As drawn' }, ...colorChips(EYE_COLORS)]}
          onPick={(eyeColor) => set({ eyeColor })}
        />
        <div className={styles.row}>
          <button type="button" onClick={() => set(DEFAULT_LOOK[editing])}>
            Reset {editing}
          </button>
        </div>
      </div>

      {KIDS.map((kid) => (
        <PieceGrid key={kid} kid={kid} />
      ))}
    </main>
  )
}
