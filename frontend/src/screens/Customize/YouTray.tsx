import { useState, type CSSProperties, type ReactNode } from 'react'
import { ClothThumb, EyeThumb, HairThumb, type ClothSlot } from '../../companions/wardrobe/thumbs'
import type { EyeStyle } from '../../companions/wardrobe/items'
import type { Avatar } from '../../setup/avatar'
import { itemsFor, kidLook, pickFor, type CustomizeItem, type Look, type LookKey, type WardrobeKey } from '../../setup/customizeData'
import styles from './CustomizeScreen.module.css'

/** The You side's Skin, Hair, Eyes and Clothes trays (Extra uses the plain tiles in CustomizeScreen). */
export type YouTab = 'skin' | 'hair' | 'eyes' | 'clothes'

const SLOTS: { slot: ClothSlot; label: string; style: WardrobeKey; color: WardrobeKey }[] = [
  { slot: 'top', label: 'Top', style: 'top', color: 'shirt' },
  { slot: 'bottom', label: 'Bottom', style: 'bottom', color: 'bottomColor' },
  { slot: 'shoes', label: 'Shoes', style: 'shoes', color: 'shoesColor' },
]

/**
 * The tray for one of the You tabs, like the approved mockups: the style tiles
 * (each piece drawn small in the Student's color for it), a divider, then the
 * color swatches in two rows. Picking anything calls onPick (save + happy bounce).
 */
export function YouTray({
  tab,
  avatar,
  look,
  skinPicked,
  onPick,
}: {
  tab: YouTab
  avatar: Avatar
  look: Look
  /** The skin swatch to ring: the saved one, or the nearest to the art. */
  skinPicked: string | undefined
  onPick: (key: LookKey, id: string) => void
}) {
  const [slot, setSlot] = useState<ClothSlot>('top')
  const kl = kidLook(look, avatar)
  const pick = (key: WardrobeKey) => pickFor(look, key, avatar)

  if (tab === 'skin') return <Swatches name="Skin" lookKey="skin" items={itemsFor('skin', avatar)} picked={skinPicked} onPick={onPick} title={false} />

  if (tab === 'hair') {
    const styleId = pick('hairStyle')
    return (
      <>
        <Tiles
          lookKey="hairStyle"
          items={itemsFor('hairStyle', avatar)}
          picked={styleId}
          onPick={onPick}
          picture={(item) => (
            <HairThumb className={styles.thumbHead} kid={avatar} id={item.id} hairColor={kl.hairColor} skin={kl.skin} />
          )}
        />
        {/* Bald: no hair, so no hair color. */}
        {styleId !== 'bald' && (
          <Swatches name="Hair color" lookKey="hair" items={itemsFor('hair', avatar)} picked={pick('hair')} onPick={onPick} />
        )}
      </>
    )
  }

  if (tab === 'eyes') {
    return (
      <>
        <Tiles
          lookKey="eyes"
          items={itemsFor('eyes', avatar)}
          picked={pick('eyes')}
          onPick={onPick}
          picture={(item) => <EyeThumb className={styles.thumbEye} kid={avatar} style={item.id as EyeStyle} color={kl.eyeColor ?? ''} />}
        />
        <Swatches name="Eye color" lookKey="eyeColor" items={itemsFor('eyeColor', avatar)} picked={pick('eyeColor')} onPick={onPick} />
      </>
    )
  }

  // Clothes: Top / Bottom / Shoes, then that part's styles and colors.
  const s = SLOTS.find((x) => x.slot === slot)!
  const color = slot === 'top' ? kl.topColor : slot === 'bottom' ? kl.bottomColor : kl.shoesColor
  return (
    <>
      <div className={styles.slots} role="group" aria-label="Which clothes">
        {SLOTS.map((x) => (
          <button key={x.slot} type="button" aria-pressed={x.slot === slot} onClick={() => setSlot(x.slot)}>
            {x.label}
          </button>
        ))}
      </div>
      <Tiles
        lookKey={s.style}
        items={itemsFor(s.style, avatar)}
        picked={pick(s.style)}
        onPick={onPick}
        picture={(item) => <ClothThumb className={styles.thumb} slot={slot} id={item.id} color={color} />}
      />
      <Swatches name={`${s.label} color`} lookKey={s.color} items={itemsFor(s.color, avatar)} picked={pick(s.color)} onPick={onPick} />
    </>
  )
}

/** Style tiles: a picture with its name underneath; the picked one has the orange ring and ✓. */
function Tiles({
  lookKey,
  items,
  picked,
  onPick,
  picture,
}: {
  lookKey: LookKey
  items: CustomizeItem[]
  picked: string
  onPick: (key: LookKey, id: string) => void
  picture: (item: CustomizeItem) => ReactNode
}) {
  return (
    <ul className={styles.tiles}>
      {items.map((item) => {
        const on = item.id === picked
        return (
          <li key={`${lookKey}-${item.id}`}>
            <button
              type="button"
              className={on ? `${styles.tile} ${styles.tileOn}` : styles.tile}
              aria-pressed={on}
              aria-label={item.label}
              onClick={() => onPick(lookKey, item.id)}
            >
              <span className={styles.tilePic}>{picture(item)}</span>
              <span className={styles.tileLabel}>{item.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** "Hair color · 10 colors" and the round swatches, in two rows when there are more than 7. */
function Swatches({
  name,
  lookKey,
  items,
  picked,
  onPick,
  title = true,
}: {
  name: string
  lookKey: LookKey
  items: CustomizeItem[]
  picked: string | undefined
  onPick: (key: LookKey, id: string) => void
  /** The heading (Skin has none: the tab says it). */
  title?: boolean
}) {
  const cols = items.length > 7 ? Math.ceil(items.length / 2) : items.length
  return (
    <div className={title ? `${styles.colors} ${styles.colorsSplit}` : styles.colors}>
      {title && (
        <p className={styles.colorsTitle}>
          {name} · <span>{items.length} colors</span>
        </p>
      )}
      <ul className={styles.swatches} style={{ '--cols': cols } as CSSProperties} aria-label={name}>
        {items.map((item, i) => {
          const on = item.id === picked
          return (
            <li key={`${lookKey}-${item.id}`}>
              <button
                type="button"
                className={on ? `${styles.dot} ${styles.dotOn}` : styles.dot}
                style={{ background: item.swatch }}
                aria-pressed={on}
                aria-label={item.label || `${name} ${i + 1}`}
                onClick={() => onPick(lookKey, item.id)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
