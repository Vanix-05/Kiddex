import { describe, expect, it } from 'vitest'
import { EMOTES } from '../game/emotes'
import { SEATS } from '../game/room'
import { classmateOf, spotOf, type LivePlayer } from './liveLobby'

const player = (extra: Partial<LivePlayer> = {}): LivePlayer => ({
  pid: 'p1',
  avatar: 'girl',
  buddy: 'kitty',
  buddyName: 'Bubbles',
  look: { hair: 'black', shirt: 'blue' },
  level: 3,
  x: 5,
  y: 6,
  seat: null,
  ...extra,
})

describe('live Lobby', () => {
  it('turns a player into a classmate named after their buddy', () => {
    expect(classmateOf(player())).toEqual({
      id: 'p1',
      name: 'Bubbles',
      avatar: 'girl',
      look: { hair: 'black', shirt: 'blue' },
      buddy: 'kitty',
      buddyName: 'Bubbles',
      level: 3,
    })
  })

  it("uses the buddy's own name when they didn't name it", () => {
    expect(classmateOf(player({ buddyName: '' }))?.name).toBe('Kitty')
  })

  it('drops unknown kids, buddies and look items', () => {
    expect(classmateOf(player({ avatar: 'robot' }))).toBeNull()
    expect(classmateOf(player({ buddy: 'dragon' }))).toBeNull()
    expect(classmateOf(player({ look: { hair: 'rainbow', shirt: 'blue' } }))?.look).toEqual({ shirt: 'blue' })
  })

  it('treats an unknown chair as standing', () => {
    expect(spotOf({ x: 1, y: 2, seat: 3 })).toEqual({ x: 1, y: 2, seat: 3 })
    expect(spotOf({ x: 1, y: 2, seat: SEATS.length })).toEqual({ x: 1, y: 2, seat: null })
  })

  // backend/src/lobby/lobbyRooms.ts keeps copies of these numbers: change both together.
  it('matches the backend copies (SEAT_COUNT 12, EMOTE_COUNT 5)', () => {
    expect(SEATS.length).toBe(12)
    expect(EMOTES.length).toBe(5)
  })
})
