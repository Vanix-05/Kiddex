// Live classmates in the Lobby (Socket.IO). One Socket.IO "room" per SECTION:
// a Student only ever hears about their own section's classmates (Master Brief 4.14).
//
// Who can connect (the login token goes in the handshake, `auth: { token }`):
//   - a Student who finished their setup (has a kid and a buddy): they join their own
//     section's Lobby and their classmates see them walk around;
//   - a Teacher, with `auth: { token, sectionId }` for one of THEIR sections: view only.
//     They see the Students but are never shown to them, and can't send anything.
//
// Page -> server:  "move"  { x, y, seat }   (floor units; seat = chair number or null)
//                  "emote" n                (one of the 5 emote buttons, 0..4; never typed text)
// Server -> page:  "everyone" [players]     (right after connecting: who is here)
//                  "join" player, "leave" pid, "move" { pid, x, y, seat }, "emote" { pid, emote }
//                  "replaced"               (the same Student opened the Lobby in another tab)
// A player has no School ID and no database id (see LobbyPlayer).
// Never log a token or a School ID.
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { readStudentToken, readTeacherToken } from "../auth/tokens";
import { accountTables } from "../auth/accounts";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { levelFromXp } from "../games/rewards";
import { setLobbyServer, studentRoomOf } from "./lobbyKick";
import { LobbyRooms, readEmote, readSpot } from "./lobbyRooms";

/** The connect answers the page understands (Socket.IO "connect_error" message). */
export type LobbyRefusal = "LOGIN_NEEDED" | "SETUP_NEEDED" | "NO_SECTION" | "DB_UNAVAILABLE";

type Who =
  | { role: "student"; studentId: string; sectionId: string; look: Parameters<LobbyRooms["join"]>[3] }
  | { role: "teacher"; sectionId: string };

const roomOf = (sectionId: string) => `section:${sectionId}`;

const refuse = (reason: LobbyRefusal) => new Error(reason);

async function whoIs(auth: unknown): Promise<Who> {
  const { token, sectionId } = (typeof auth === "object" && auth !== null ? auth : {}) as { token?: unknown; sectionId?: unknown };
  if (typeof token !== "string" || token.length > 2000) throw refuse("LOGIN_NEEDED");

  const student = readStudentToken(token);
  if (student) {
    // A removed Student is refused like an ended login.
    const row = await prisma.student.findUnique({
      where: { id: student.accountId, removedAt: null },
      select: { id: true, tokenVersion: true, sectionId: true, avatar: true, buddy: true, buddyName: true, look: true, xp: true },
    });
    if (!row || row.tokenVersion !== student.tokenVersion) throw refuse("LOGIN_NEEDED");
    if (!row.avatar || !row.buddy) throw refuse("SETUP_NEEDED");
    return {
      role: "student",
      studentId: row.id,
      sectionId: row.sectionId,
      look: { avatar: row.avatar, buddy: row.buddy, buddyName: row.buddyName ?? "", look: row.look ?? {}, level: levelFromXp(row.xp).level },
    };
  }

  const teacher = readTeacherToken(token);
  if (teacher) {
    const account = await accountTables.teacher.findForCheck(teacher.accountId);
    if (!account || !account.active || account.tokenVersion !== teacher.tokenVersion) throw refuse("LOGIN_NEEDED");
    if (typeof sectionId !== "string" || sectionId.length > 100) throw refuse("NO_SECTION");
    const section = await prisma.section.findFirst({ where: { id: sectionId, teacherId: account.id }, select: { id: true } });
    if (!section) throw refuse("NO_SECTION");
    return { role: "teacher", sectionId: section.id };
  }

  throw refuse("LOGIN_NEEDED");
}

/** Adds the live Lobby to the API's web server. Answers the Socket.IO server (tests close it). */
export function attachLobby(httpServer: HttpServer, rooms = new LobbyRooms()): Server {
  const io = new Server(httpServer, {
    // Only the KIDDEX website may connect (the same list as the API's CORS).
    cors: { origin: env.frontendOrigins },
    // The messages are tiny: refuse anything big.
    maxHttpBufferSize: 10_000,
  });
  // So the Remove address can take a Student out right away (lobbyKick.ts).
  setLobbyServer(io);

  io.use(async (socket, next) => {
    try {
      socket.data.who = await whoIs(socket.handshake.auth);
      next();
    } catch (err) {
      const reason = err instanceof Error && /^[A-Z_]+$/.test(err.message) ? err.message : "DB_UNAVAILABLE";
      if (reason === "DB_UNAVAILABLE") console.warn("[lobby] could not check a login (database?)");
      next(refuse(reason as LobbyRefusal));
    }
  });

  io.on("connection", (socket: Socket) => {
    const who = socket.data.who as Who;
    const room = roomOf(who.sectionId);
    void socket.join(room);

    // The Teacher only looks.
    if (who.role === "teacher") {
      socket.emit("everyone", rooms.players(who.sectionId));
      return;
    }

    const { studentId, sectionId } = who;
    void socket.join(studentRoomOf(studentId));
    const { player, others, replaced } = rooms.join(sectionId, studentId, socket.id, who.look);
    if (replaced) {
      socket.to(room).except(replaced.connectionId).emit("leave", replaced.pid);
      const old = io.sockets.sockets.get(replaced.connectionId);
      old?.emit("replaced");
      old?.disconnect(true);
    }
    socket.emit("everyone", others);
    socket.to(room).emit("join", player);

    socket.on("move", (value: unknown) => {
      const spot = readSpot(value);
      if (!spot) return;
      const moved = rooms.move(sectionId, studentId, socket.id, spot);
      if (moved) socket.to(room).emit("move", { pid: moved.pid, x: moved.x, y: moved.y, seat: moved.seat });
    });

    socket.on("emote", (value: unknown) => {
      const emote = readEmote(value);
      if (emote === null) return;
      const pid = rooms.emote(sectionId, studentId, socket.id);
      if (pid) socket.to(room).emit("emote", { pid, emote });
    });

    socket.on("disconnect", () => {
      const pid = rooms.leave(sectionId, studentId, socket.id);
      if (pid) socket.to(room).emit("leave", pid);
    });
  });

  return io;
}
