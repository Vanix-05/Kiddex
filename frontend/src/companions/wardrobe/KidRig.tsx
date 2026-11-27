import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TracedRig, type Emotion, type RigFace, type RigLook, type RigParts } from '../TracedRig'
import { recolorOne } from '../rig/recolor'
import { kidParts } from './buildKidParts'
import { wardrobeColorKeys } from './colorKeys'
import { kidPivots } from './kidPivots'
import { loadedPiece, loadKidPieces, lookFiles, type EyeStyle, type Kid, type KidLook } from './items'

/** The girl's face (face-girl and face-boy share the eyes and blush); each kid's own mouth. */
const kidFace = (kid: Kid): RigFace => ({
  eyes: {
    left: { cx: 2000, cy: 1792, rx: 154, ry: 314 },
    right: { cx: 3000, cy: 1791, rx: 155, ry: 315 },
  },
  mouth: kid === 'girl' ? { x: 2500, y: 2277, w: 136, h: 42 } : { x: 2500, y: 2314, w: 85, h: 22 },
  cheeks: { left: [1995, 2190], right: [3005, 2190] },
  // The lid is the bald base's skin (recolored with it below).
  colors: { lid: '#FEF0E9', outline: '#7B5062', blush: '#FF828D' },
})
const FACES: Record<Kid, RigFace> = { girl: kidFace('girl'), boy: kidFace('boy') }

const piecesReady = (files: readonly string[]) => files.every((f) => loadedPiece(f))

/**
 * A kid drawn from wardrobe pieces (hair, top, bottom, shoes and every color),
 * animated by TracedRig like the old GirlRig / BoyRig. Until all its pieces are
 * downloaded it draws `fallback` (nothing by default); while a new piece loads
 * it keeps the last look. A change of pieces or eye style starts a new rig, so
 * the springs find the new parts (colors alone just repaint).
 */
export function KidRig({
  kid,
  look,
  className,
  label = kid === 'girl' ? 'Girl' : 'Boy',
  emotion,
  extras,
  still,
  eyeStyle,
  fallback = null,
}: {
  kid: Kid
  look: KidLook
  className?: string
  label?: string
  emotion?: Emotion
  /** Default: the look's own (round). */
  eyeStyle?: EyeStyle
  /** Drawn until the pieces are loaded (e.g. the old rig, so nothing flashes). */
  fallback?: ReactNode
} & Pick<RigLook, 'extras' | 'still'>) {
  const files = useMemo(() => lookFiles(kid, look), [kid, look])
  // Re-render once a download lands (the pieces themselves live in items.ts's cache).
  const [, setLoadedKey] = useState('')
  const ready = piecesReady(files)
  useEffect(() => {
    if (piecesReady(lookFiles(kid, look))) return
    let live = true
    loadKidPieces(kid, look).then(
      () => live && setLoadedKey(lookFiles(kid, look).join(' ')),
      (e: unknown) => console.error(e),
    )
    return () => {
      live = false
    }
  }, [kid, look])

  // The last look that was fully loaded, shown while the next one downloads.
  const [shown, setShown] = useState<{ kid: Kid; look: KidLook } | null>(null)
  if (ready && (shown?.kid !== kid || shown.look !== look)) setShown({ kid, look })
  const current = ready ? { kid, look } : shown

  const parts = useMemo<RigParts | null>(
    () => (current ? kidParts(current.kid, current.look, loadedPiece) : null),
    [current?.kid, current?.look], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const skin = current?.look.skin
  const face = useMemo(() => {
    const f = FACES[current?.kid ?? kid]
    const lid = recolorOne(f.colors.lid, { skin: wardrobeColorKeys.skin }, { skin })
    return lid === f.colors.lid ? f : { ...f, colors: { ...f.colors, lid } }
  }, [current?.kid, kid, skin])

  if (!parts || !current) return <>{fallback}</>
  const eyes = eyeStyle ?? current.look.eyes ?? 'round'
  return (
    <TracedRig
      key={lookFiles(current.kid, current.look).join(' ') + ' ' + eyes}
      eyeStyle={eyes}
      parts={parts}
      pivots={kidPivots}
      face={face}
      emotion={emotion}
      avatarEyes
      // Only for the eye rim on dark skins: the shapes are already colored, so no colorKeys.
      colors={{ skin }}
      extras={extras}
      still={still}
      label={label}
      className={className}
      // Every bottom: the pants' top half is in the body part, so legs in front would draw the
      // base legs' outline and skin over the thighs (and behind also hides the hip seam on a step).
      legsBehindBody
    />
  )
}
