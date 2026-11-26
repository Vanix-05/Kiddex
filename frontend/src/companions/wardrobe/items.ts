import type { RigParts } from '../TracedRig'

/**
 * The kids' wardrobe: every hairstyle, top, bottom and pair of shoes, and the
 * look each kid starts with. Hand-written data: edit freely.
 *
 * Each piece's shapes are traced by `npm run rig:wardrobe` into
 * generated/<file>.generated.ts and loaded only when a kid wears it.
 */

export type Kid = 'girl' | 'boy'
export const KIDS: readonly Kid[] = ['girl', 'boy']

/** A traced piece: the name of its generated file (e.g. "top-hoodie"). */
export type PieceFile = string

export interface HairItem {
  id: string
  label: string
  kid: Kid
  /** In front of the face (none for Bald). */
  front?: PieceFile
  /** Behind the head. */
  back?: PieceFile
}

export interface ClothItem {
  id: string
  label: string
  /** None: the bald body's own shorts. */
  file?: PieceFile
}

export const HAIR: readonly HairItem[] = [
  { id: 'bob', label: 'Bob', kid: 'girl', front: 'hair-girl-bob-front' },
  { id: 'soft', label: 'Soft', kid: 'girl', front: 'hair-girl-soft-front', back: 'hair-girl-soft-back' },
  { id: 'bangs', label: 'Bangs', kid: 'girl', front: 'hair-girl-bangs-front', back: 'hair-girl-bangs-back' },
  { id: 'pigtails', label: 'Pigtails', kid: 'girl', front: 'hair-girl-pigtails-front', back: 'hair-girl-pigtails-back' },
  { id: 'bald', label: 'Bald', kid: 'boy' },
  { id: 'classic', label: 'Classic', kid: 'boy', front: 'hair-boy-classic-front' },
  { id: 'sideswept', label: 'Side-swept', kid: 'boy', front: 'hair-boy-sideswept-front' },
  { id: 'curly', label: 'Curly', kid: 'boy', front: 'hair-boy-curly-front' },
  { id: 'curtain', label: 'Curtain', kid: 'boy', front: 'hair-boy-curtain-front' },
]

export const TOPS: readonly ClothItem[] = [
  { id: 'polo', label: 'Polo', file: 'top-polo' },
  { id: 'blouse', label: 'Blouse', file: 'top-blouse' },
  { id: 'layered', label: 'Layered', file: 'top-layered' },
  { id: 'hoodie', label: 'Hoodie', file: 'top-hoodie' },
]

export const BOTTOMS: readonly ClothItem[] = [
  { id: 'skirt', label: 'Skirt', file: 'bottom-skirt' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'pants', label: 'Pants', file: 'bottom-pants' },
  { id: 'cargo', label: 'Cargo', file: 'bottom-cargo' },
]

export const SHOES: readonly ClothItem[] = [
  { id: 'maryjanes', label: 'Mary Janes', file: 'shoes-maryjanes' },
  { id: 'school', label: 'School', file: 'shoes-school' },
  { id: 'sneakers', label: 'Sneakers', file: 'shoes-sneakers' },
  { id: 'sandals', label: 'Sandals', file: 'shoes-sandals' },
]

/** What each kid can pick, in the order the tray shows them. */
export const WARDROBE: Record<Kid, { hair: readonly HairItem[]; tops: readonly ClothItem[]; bottoms: readonly ClothItem[]; shoes: readonly ClothItem[] }> = {
  girl: {
    hair: HAIR.filter((h) => h.kid === 'girl'),
    tops: TOPS,
    bottoms: ['skirt', 'shorts', 'pants'].map((id) => BOTTOMS.find((b) => b.id === id)!),
    shoes: SHOES,
  },
  boy: {
    hair: HAIR.filter((h) => h.kid === 'boy'),
    tops: TOPS,
    bottoms: ['pants', 'shorts', 'cargo'].map((id) => BOTTOMS.find((b) => b.id === id)!),
    shoes: SHOES,
  },
}

/** Everything a kid wears, and every color. Colors are hex; skin and eyes undefined = as drawn. */
export interface KidLook {
  hair: string
  hairColor: string
  top: string
  topColor: string
  bottom: string
  bottomColor: string
  shoes: string
  shoesColor: string
  skin?: string
  eyeColor?: string
}

/** The colors the Customize Bridge offers (from the approved mockups). */
export const HAIR_COLORS: readonly string[] = [
  '#9D756D', '#3D3034', '#D7834E', '#EDE3CB', '#9C86CF',
  '#5E4232', '#A04A35', '#E3C07A', '#F2A7BD', '#7D9BE0',
]
export const CLOTH_COLORS: readonly string[] = [
  '#FFDBA3', '#F4877C', '#F0A6BE', '#A9D2F5', '#8ED0CB', '#A8D49A', '#C9C9C9',
  '#FFC9A0', '#FFC4CF', '#D6C5F2', '#6F86C0', '#B9EAD2', '#FEFAEE', '#5A5466',
]
export const EYE_COLORS: readonly string[] = ['#50322C', '#2E4A7A', '#6B5020', '#4A3570', '#2A2230', '#2F5E45', '#4A5566']

const LILAC = '#D6C5F2'
const DARK = '#5A5466'

/** Each kid's first look: together these look like today's kids. */
export const DEFAULT_LOOK: Record<Kid, KidLook> = {
  girl: {
    hair: 'bob',
    hairColor: '#9D756D',
    top: 'blouse',
    topColor: '#FFDBA3',
    bottom: 'skirt',
    bottomColor: LILAC,
    shoes: 'maryjanes',
    shoesColor: DARK,
  },
  boy: {
    hair: 'classic',
    hairColor: '#5F4B69',
    top: 'polo',
    topColor: '#FEFAEE',
    bottom: 'pants',
    bottomColor: LILAC,
    shoes: 'school',
    shoesColor: DARK,
  },
}

export const findHair = (id: string) => HAIR.find((h) => h.id === id)
export const findTop = (id: string) => TOPS.find((t) => t.id === id)
export const findBottom = (id: string) => BOTTOMS.find((b) => b.id === id)
export const findShoes = (id: string) => SHOES.find((s) => s.id === id)

// ---- Loading the traced pieces -------------------------------------------------------

type PieceModule = { default: Partial<RigParts> }
const loaders = import.meta.glob<PieceModule>('./generated/*.generated.ts')
const fileOf = (path: string) => path.replace(/^.*\/(.+)\.generated\.ts$/, '$1')
const LOADERS = new Map(Object.entries(loaders).map(([path, load]) => [fileOf(path), load]))

const loaded = new Map<PieceFile, Partial<RigParts>>()
const pending = new Map<PieceFile, Promise<Partial<RigParts>>>()

/** A piece's traced parts if it's already downloaded. */
export const loadedPiece = (file: PieceFile) => loaded.get(file)

/** Downloads one piece (once; later calls share it). */
export function loadPiece(file: PieceFile): Promise<Partial<RigParts>> {
  const done = loaded.get(file)
  if (done) return Promise.resolve(done)
  let p = pending.get(file)
  if (!p) {
    const load = LOADERS.get(file)
    if (!load) return Promise.reject(new Error(`No traced wardrobe piece "${file}" (npm run rig:wardrobe)`))
    p = load().then((m) => {
      loaded.set(file, m.default)
      pending.delete(file)
      return m.default
    })
    pending.set(file, p)
  }
  return p
}

/** Every piece file a kid wearing `look` needs: the base body, the kid's face, then the clothes. */
export function lookFiles(kid: Kid, look: KidLook): PieceFile[] {
  const hair = findHair(look.hair)
  return [
    'base',
    `face-${kid}`,
    hair?.back,
    hair?.front,
    findBottom(look.bottom)?.file,
    findTop(look.top)?.file,
    findShoes(look.shoes)?.file,
  ].filter((f): f is PieceFile => !!f)
}
