// The live classroom Lobbies, kept in the server's memory (no database). One
// Lobby per SECTION (Master Brief 4.14): a Student only ever sees the classmates
// in their own section. A server restart (Render does that) empties them, and
// every Lobby page joins again by itself.
//
// Pure rules only (no Socket.IO here), so they can be tested without a server.
import { randomBytes } from "node:crypto";

/** The classroom floor, in floor units (frontend/src/screens/Lobby/game/room.ts: RW x RD). */
export const ROOM_W = 24;
export const ROOM_D = 15;
/** The chairs a kid can sit on (frontend room.ts SEATS: 6 desk groups x 2 chairs). */
export const SEAT_COUNT = 12;
/** The 5 emote buttons (frontend/src/screens/Lobby/game/emotes.ts). Kids can't type: only these. */
export const EMOTE_COUNT = 5;
/** At most this many position updates a second per Student (the page sends about 6). */
export const MAX_MOVES_PER_SECOND = 15;
/** At least this long between two emotes from the same Student. */
export const EMOTE_GAP_MS = 800;

/**
 * One Student in a Lobby, as their classmates see them. No School ID and no
 * database id: `pid` is a random id made when they come in.
 */
export interface LobbyPlayer {
  pid: string;
  avatar: string;
  buddy: string;
  buddyName: string;
  look: unknown;
  level: number;
  x: number;
  y: number;
  /** The chair they sit on (0..11, frontend SEATS order), or null. */
  seat: number | null;
}

/** Where a Student says they are. */
export interface Spot {
  x: number;
  y: number;
  seat: number | null;
}

interface Member {
  studentId: string;
  connectionId: string;
  player: LobbyPlayer;
  moveWindowStart: number;
  movesInWindow: number;
  lastEmoteAt: number;
}

const newPid = () => randomBytes(6).toString("base64url");

/** A spot from the page, or null when it isn't one (any other shape, outside the room, a wrong seat). */
export function readSpot(value: unknown): Spot | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y, seat } = value as { x?: unknown; y?: unknown; seat?: unknown };
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x <= 0 || y <= 0 || x >= ROOM_W || y >= ROOM_D) return null;
  const seatOk = seat === null || seat === undefined || (Number.isInteger(seat) && (seat as number) >= 0 && (seat as number) < SEAT_COUNT);
  if (!seatOk) return null;
  // Two decimals are plenty, and keep the messages small.
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, seat: (seat as number | null | undefined) ?? null };
}

/** An emote button number (0..4) from the page, or null. */
export function readEmote(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < EMOTE_COUNT ? (value as number) : null;
}

/** Where a Student is until their page sends its first spot (frontend room.ts START). */
export const START_SPOT: Spot = { x: 13.6, y: 6.6, seat: null };

export class LobbyRooms {
  /** sectionId -> studentId -> member */
  private rooms = new Map<string, Map<string, Member>>();

  /**
   * A Student comes into their section's Lobby. If the same Student is already
   * there (a second tab), the old connection is replaced: its id comes back in
   * `replaced`, and the classmates see them leave and come in again.
   */
  join(
    sectionId: string,
    studentId: string,
    connectionId: string,
    look: Omit<LobbyPlayer, "pid" | "x" | "y" | "seat">,
  ): { player: LobbyPlayer; others: LobbyPlayer[]; replaced: { connectionId: string; pid: string } | null } {
    let room = this.rooms.get(sectionId);
    if (!room) {
      room = new Map();
      this.rooms.set(sectionId, room);
    }
    const old = room.get(studentId);
    const replaced = old ? { connectionId: old.connectionId, pid: old.player.pid } : null;
    room.delete(studentId);
    const player: LobbyPlayer = { pid: newPid(), ...look, ...START_SPOT };
    room.set(studentId, { studentId, connectionId, player, moveWindowStart: 0, movesInWindow: 0, lastEmoteAt: 0 });
    const others = [...room.values()].filter((m) => m.studentId !== studentId).map((m) => m.player);
    return { player, others, replaced };
  }

  /** The connection closed. Answers the pid that left, or null if this connection was already replaced. */
  leave(sectionId: string, studentId: string, connectionId: string): string | null {
    const room = this.rooms.get(sectionId);
    const member = room?.get(studentId);
    if (!room || !member || member.connectionId !== connectionId) return null;
    room.delete(studentId);
    if (room.size === 0) this.rooms.delete(sectionId);
    return member.player.pid;
  }

  /** Saves a move. null = ignore it (not in the room, or too many moves this second). */
  move(sectionId: string, studentId: string, connectionId: string, spot: Spot, now = Date.now()): LobbyPlayer | null {
    const member = this.memberOf(sectionId, studentId, connectionId);
    if (!member) return null;
    if (now - member.moveWindowStart >= 1000) {
      member.moveWindowStart = now;
      member.movesInWindow = 0;
    }
    if (++member.movesInWindow > MAX_MOVES_PER_SECOND) return null;
    Object.assign(member.player, spot);
    return member.player;
  }

  /** An emote. Answers the pid to show it on, or null (not in the room, or too soon after the last one). */
  emote(sectionId: string, studentId: string, connectionId: string, now = Date.now()): string | null {
    const member = this.memberOf(sectionId, studentId, connectionId);
    if (!member || now - member.lastEmoteAt < EMOTE_GAP_MS) return null;
    member.lastEmoteAt = now;
    return member.player.pid;
  }

  /** Everyone in a section's Lobby now (for the Teacher's view-only visit). */
  players(sectionId: string): LobbyPlayer[] {
    return [...(this.rooms.get(sectionId)?.values() ?? [])].map((m) => m.player);
  }

  private memberOf(sectionId: string, studentId: string, connectionId: string): Member | null {
    const member = this.rooms.get(sectionId)?.get(studentId);
    return member && member.connectionId === connectionId ? member : null;
  }
}
