/**
 * The live Lobby's messages (Socket.IO, backend/src/lobby/lobbySocket.ts) and
 * how they become Classmates. Pure, so it can be tested without a server.
 */
import { companionRegistry } from '../../../companions/registry'
import { isAvatar } from '../../../setup/avatar'
import { cleanLook } from '../../../setup/customizeData'
import { isBuddyId } from '../../../setup/quizData'
import type { FloorSpot } from '../game/LobbyGame'
import { SEATS } from '../game/room'
import type { Classmate } from '../lobbyData'

/** One classmate as the server sends them. No School ID and no database id: `pid` is made when they come in. */
export interface LivePlayer {
  pid: string
  avatar: string
  buddy: string
  /** '' = the buddy's own name. */
  buddyName: string
  look: unknown
  level: number
  x: number
  y: number
  seat: number | null
}

/** Who connects: a Student (into their own section's Lobby), or a Teacher looking at one of their sections. */
export type LiveWho = { role: 'student' } | { role: 'teacher'; sectionId: string }

/** connecting: not yet (or Render's free server is waking up). live: classmates come and go. offline: the
 * login ended, or no internet. elsewhere: the same Student opened the Lobby in another tab. */
export type LiveStatus = 'connecting' | 'live' | 'offline' | 'elsewhere'

/** Refusals that will not get better by trying again (backend LobbyRefusal). */
export const FINAL_REFUSALS: readonly string[] = ['LOGIN_NEEDED', 'SETUP_NEEDED', 'NO_SECTION']

/** A player from the server as a Classmate, or null if anything in it is unknown here. */
export function classmateOf(p: LivePlayer): Classmate | null {
  if (!p || typeof p.pid !== 'string' || !isAvatar(p.avatar) || !isBuddyId(p.buddy)) return null
  const name = typeof p.buddyName === 'string' && p.buddyName.trim() ? p.buddyName.trim() : companionRegistry[p.buddy].name
  return {
    id: p.pid,
    name,
    avatar: p.avatar,
    look: cleanLook(p.look),
    buddy: p.buddy,
    buddyName: name,
    level: Number.isInteger(p.level) && p.level > 0 ? p.level : 1,
  }
}

/** Where a player is, as the game needs it (an unknown chair = standing). */
export function spotOf(p: { x: number; y: number; seat: number | null }): FloorSpot {
  const seat = Number.isInteger(p.seat) && (p.seat as number) >= 0 && (p.seat as number) < SEATS.length ? p.seat : null
  return { x: p.x, y: p.y, seat }
}
