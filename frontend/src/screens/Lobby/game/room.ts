/**
 * The classroom as data: its size, where every prop stands, what blocks
 * walking, the Quiz Stage height, the seats and the game corners. All in floor
 * tiles. drawRoom.ts draws from the same numbers, so the picture and the
 * collision can't drift apart.
 */

/** Room size in tiles. */
export const RW = 22
export const RD = 14
/** A character's radius in tiles. */
export const RADIUS = 0.3
/** How close a character's centre can get to the walls and the railing. */
const EDGE = 0.35

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}
const rect = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 })

// ---------- Layout ----------

export const TEACHER_DESK = rect(1.6, 1.8, 4.0, 2.8)
/** Ollie stands behind the Teacher's Desk. */
export const OLLIE_AT = { x: 2.55, y: 1.25 }
export const BOOKSHELF = rect(0, 8.0, 0.75, 11.0)
export const CUBBIES = rect(0, 4.0, 0.55, 6.8)
export const PODIUM = rect(15.2, 0.7, 16.1, 1.3)
export const MATCH_TABLE = { x: 17.4, y: 10.2, r: 1.0, solid: rect(16.7, 9.5, 18.1, 10.9) }
export const DOOR_MAT = rect(19.5, 0.2, 21, 1.2)

/** The Quiz Stage: raised and walkable. `h` is its height in px. */
export const STAGE = { x0: 12.8, y0: 0, x1: 18.6, y1: 3.0, h: 14 }

/** Top-left corner of each group of 4 desks: 3 rows of 2. */
export const DESK_GROUPS: readonly { x: number; y: number }[] = [3.7, 7.5, 11.1].flatMap((y) =>
  [5.6, 9.4].map((x) => ({ x, y })),
)
/** A group's 2 chairs sit at these x offsets, behind and in front of the desks. */
export const CHAIR_DX = [0.3, 1.35] as const
export const CHAIR_BACK_DY = -0.55
export const CHAIR_FRONT_DY = 1.52
export const CHAIR_SIZE = 0.42

export const BEAN_BAGS: readonly { x: number; y: number; color: number }[] = [
  { x: 2.0, y: 9.3, color: 0xffd36b },
  { x: 3.6, y: 11.4, color: 0xff9f8f },
  { x: 1.9, y: 11.7, color: 0x9fd0f0 },
]

export const PLANTS: readonly { x: number; y: number; big: boolean }[] = [
  { x: 0.25, y: 0.3, big: true },
  { x: 21.3, y: 0.3, big: false },
  { x: 0.3, y: 13.2, big: true },
  { x: 21.2, y: 13.2, big: true },
  { x: 12.0, y: 0.25, big: false },
  { x: 11.3, y: 13.25, big: false },
  { x: 21.25, y: 5.5, big: false },
]
export const PLANT_SIZE = 0.5

/**
 * The Star Students cork board on the left wall: it hangs from y0 to y1,
 * between z0 and z1 px up. The left wall only stands in the diagonal view.
 */
export const STAR_BOARD = { y0: 4.0, y1: 7.0, z0: 64, z1: 142, spot: { x: 1.2, y: 5.4 } }

// ---------- Collision ----------

/** Everything on the floor that blocks walking. The walls and railing are the room's edge. */
export const SOLIDS: readonly Rect[] = [
  TEACHER_DESK,
  BOOKSHELF,
  CUBBIES,
  PODIUM,
  MATCH_TABLE.solid,
  ...BEAN_BAGS.map((b) => rect(b.x - 0.4, b.y - 0.4, b.x + 0.4, b.y + 0.4)),
  ...DESK_GROUPS.map((g) => rect(g.x - 0.05, g.y - 0.6, g.x + 2.1, g.y + 2.0)),
  ...PLANTS.map((p) => rect(p.x, p.y, p.x + PLANT_SIZE, p.y + PLANT_SIZE)),
]

/** Can a character stand with its centre here? */
export function isFree(x: number, y: number): boolean {
  if (x < EDGE || y < EDGE || x > RW - EDGE || y > RD - EDGE) return false
  for (const s of SOLIDS) {
    if (x > s.x0 - RADIUS && x < s.x1 + RADIUS && y > s.y0 - RADIUS && y < s.y1 + RADIUS) return false
  }
  return true
}

export const insideRoom = (x: number, y: number) => x > 0 && y > 0 && x < RW && y < RD

/** Floor height in px: the Quiz Stage lifts whoever walks onto it. */
export const floorHeight = (x: number, y: number) =>
  x > STAGE.x0 && x < STAGE.x1 && y > STAGE.y0 && y < STAGE.y1 ? STAGE.h : 0

export const onDoorMat = (x: number, y: number) =>
  x > DOOR_MAT.x0 && x < DOOR_MAT.x1 && y > DOOR_MAT.y0 && y < DOOR_MAT.y1

// ---------- Seats ----------

export interface Seat {
  kind: 'chair' | 'bag'
  /** Where the sitter is drawn, and how high (px). */
  x: number
  y: number
  z: number
  /** Where they walk to before sitting, and stand up to. */
  ax: number
  ay: number
}

/** The chairs behind each desk group, and the Word Nook bean bags. */
export const SEATS: readonly Seat[] = [
  ...DESK_GROUPS.flatMap((g) =>
    CHAIR_DX.map((dx): Seat => {
      const x = g.x + dx + CHAIR_SIZE / 2
      return { kind: 'chair', x, y: g.y + CHAIR_BACK_DY + 0.43, z: 15, ax: x, ay: g.y - 1.0 }
    }),
  ),
  ...BEAN_BAGS.map((b): Seat => ({ kind: 'bag', x: b.x, y: b.y + 0.42, z: 11, ax: b.x, ay: b.y + 0.8 })),
]

// ---------- Game corners ----------

export type ZoneId = 'ollie' | 'nook' | 'stage' | 'match' | 'door'
export const ZONE_IDS: readonly ZoneId[] = ['ollie', 'nook', 'stage', 'match', 'door']

export interface Zone {
  /** Where the Student walks to. */
  spot: { x: number; y: number }
  /** Where its floating label hangs: tile x, y and height in px. */
  label: { x: number; y: number; z: number }
}

export const ZONES: Record<ZoneId, Zone> = {
  ollie: { spot: { x: 3.3, y: 3.55 }, label: { x: OLLIE_AT.x, y: OLLIE_AT.y, z: 150 } },
  nook: { spot: { x: 2.9, y: 9.0 }, label: { x: 1.6, y: 9.9, z: 128 } },
  stage: { spot: { x: 15.6, y: 4.1 }, label: { x: 15.6, y: 1.6, z: 150 } },
  match: { spot: { x: 17.4, y: 8.4 }, label: { x: 18.4, y: 11.2, z: 80 } },
  door: { spot: { x: 20.25, y: 0.75 }, label: { x: 20.25, y: 0, z: 175 } },
}

/** Things the Student can do when standing close: within `r` tiles of (x, y). */
export type SpotId = 'ollie' | 'board' | 'stars' | 'stage' | 'match' | 'door'
export const ACTION_SPOTS: readonly { id: SpotId; x: number; y: number; r: number }[] = [
  { id: 'ollie', x: 3.3, y: 3.5, r: 1.4 },
  { id: 'board', x: 7.6, y: 1.7, r: 1.6 },
  { id: 'stars', x: STAR_BOARD.spot.x, y: STAR_BOARD.spot.y, r: 1.4 },
  { id: 'stage', x: 15.6, y: 2.0, r: 2.1 },
  { id: 'match', x: 17.4, y: 8.4, r: 1.6 },
  { id: 'door', x: 20.25, y: 0.9, r: 1.3 },
]

/** Where the Student starts. */
export const START = { x: 12.9, y: 6.3 }

/** Open spots a classmate wanders between. */
export const WANDER_SPOTS: readonly { x: number; y: number }[] = [
  { x: 12.3, y: 5.8 },
  { x: 8.4, y: 6.6 },
  { x: 12.6, y: 9.6 },
  { x: 14.5, y: 12.8 },
  { x: 19.6, y: 6.5 },
  { x: 14.0, y: 4.8 },
  { x: 16.5, y: 2.0 },
  { x: 4.2, y: 6.2 },
]
