// Lets the API take a Student out of the live Lobby right away (Teacher → Remove).
// attachLobby gives its Socket.IO server to setLobbyServer; every Student connection
// also joins a private room for that Student (studentRoomOf), so kickStudent can find it.
// When the Lobby isn't running (the test scripts), kickStudent does nothing.
// Never log the Student's id.
import type { Server } from "socket.io";

let lobby: Server | null = null;

/** One private room per Student: only their own connection(s) are in it. */
export const studentRoomOf = (studentId: string) => `student:${studentId}`;

/** Called by attachLobby (null to forget it, e.g. when a test closes it). */
export function setLobbyServer(io: Server | null): void {
  lobby = io;
}

/**
 * Sends "replaced" to the Student's open Lobby connection (the Student app already
 * handles it) and closes it. Their classmates then get "leave" as usual.
 */
export function kickStudent(studentId: string): void {
  if (!lobby) return;
  const room = studentRoomOf(studentId);
  lobby.to(room).emit("replaced");
  lobby.in(room).disconnectSockets(true);
}
