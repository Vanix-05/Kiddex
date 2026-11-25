// `npm run test-lobby`: the live Lobby's rules (src/lobby/lobbyRooms.ts), with no server
// and no database. Prints PASS or FAIL for each rule.
import fs from "node:fs";
import path from "node:path";
import { EMOTE_GAP_MS, LobbyRooms, MAX_MOVES_PER_SECOND, ROOM_D, ROOM_W, START_SPOT, readEmote, readSpot } from "../lobby/lobbyRooms";

let failed = 0;
function check(name: string, ok: boolean) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}

const look = { avatar: "girl", buddy: "fox", buddyName: "Mochi", look: {}, level: 2 };

// ---------- Spots and emotes from the page ----------
check("spot: a normal spot is kept (2 decimals)", JSON.stringify(readSpot({ x: 5.123, y: 6.789, seat: null })) === JSON.stringify({ x: 5.12, y: 6.79, seat: null }));
check("spot: no seat counts as standing", readSpot({ x: 5, y: 6 })?.seat === null);
check("spot: a chair number is kept", readSpot({ x: 5, y: 6, seat: 11 })?.seat === 11);
check("spot: chair 12 does not exist", readSpot({ x: 5, y: 6, seat: 12 }) === null);
check("spot: outside the room is refused", readSpot({ x: -1, y: 6 }) === null && readSpot({ x: ROOM_W + 1, y: 6 }) === null && readSpot({ x: 3, y: ROOM_D }) === null);
check("spot: text or NaN is refused", readSpot({ x: "5", y: 6 }) === null && readSpot({ x: NaN, y: 6 }) === null && readSpot("hi") === null && readSpot(null) === null);
check("emote: 0..4 only", readEmote(0) === 0 && readEmote(4) === 4 && readEmote(5) === null && readEmote(1.5) === null && readEmote("Good job!") === null);

// ---------- Rooms are per section ----------
{
  const rooms = new LobbyRooms();
  const a = rooms.join("sec-1", "stu-a", "conn-a", look);
  check("join: the first Student sees nobody", a.others.length === 0 && a.replaced === null);
  check("join: starts at START until the page sends a spot", a.player.x === START_SPOT.x && a.player.y === START_SPOT.y);
  check("join: the player has no database id", !JSON.stringify(a.player).includes("stu-a"));
  const b = rooms.join("sec-1", "stu-b", "conn-b", { ...look, buddy: "otter" });
  check("join: the second Student sees the first", b.others.length === 1 && b.others[0]!.pid === a.player.pid);
  const c = rooms.join("sec-2", "stu-c", "conn-c", look);
  check("join: another section sees nobody from sec-1", c.others.length === 0);
  check("players: per section", rooms.players("sec-1").length === 2 && rooms.players("sec-2").length === 1);

  // The same Student in a second tab replaces the first.
  const a2 = rooms.join("sec-1", "stu-a", "conn-a2", look);
  check("second tab: the old connection is replaced", a2.replaced?.connectionId === "conn-a" && a2.replaced.pid === a.player.pid);
  check("second tab: still 2 Students in sec-1", rooms.players("sec-1").length === 2);
  check("second tab: the old connection closing removes nobody", rooms.leave("sec-1", "stu-a", "conn-a") === null && rooms.players("sec-1").length === 2);
  check("second tab: the old connection can't move", rooms.move("sec-1", "stu-a", "conn-a", { x: 3, y: 3, seat: null }) === null);

  // Moves.
  const moved = rooms.move("sec-1", "stu-b", "conn-b", { x: 3, y: 4, seat: 2 }, 10_000);
  check("move: saved", moved?.x === 3 && moved.y === 4 && moved.seat === 2);
  let kept = 0;
  for (let i = 0; i < MAX_MOVES_PER_SECOND + 10; i++) if (rooms.move("sec-1", "stu-b", "conn-b", { x: 3, y: 4, seat: null }, 20_000 + i)) kept++;
  check(`move: at most ${MAX_MOVES_PER_SECOND} a second`, kept === MAX_MOVES_PER_SECOND);
  check("move: allowed again the next second", rooms.move("sec-1", "stu-b", "conn-b", { x: 3, y: 4, seat: null }, 21_100) !== null);

  // Emotes.
  check("emote: shown", rooms.emote("sec-1", "stu-b", "conn-b", 50_000) !== null);
  check("emote: not again right away", rooms.emote("sec-1", "stu-b", "conn-b", 50_000 + EMOTE_GAP_MS - 1) === null);
  check("emote: fine after the gap", rooms.emote("sec-1", "stu-b", "conn-b", 50_000 + EMOTE_GAP_MS) !== null);

  // Leaving.
  check("leave: answers the pid", rooms.leave("sec-1", "stu-b", "conn-b") === b.player.pid);
  check("leave: gone from the section", rooms.players("sec-1").length === 1);
}

// ---------- The copies match the frontend ----------
const roomFile = path.resolve(__dirname, "../../../frontend/src/screens/Lobby/game/room.ts");
if (!fs.existsSync(roomFile)) {
  console.log("SKIP  room size vs frontend (no frontend folder next to the backend)");
} else {
  const room = fs.readFileSync(roomFile, "utf8");
  check("same as frontend: room width", new RegExp(`RW = ${ROOM_W}\\b`).test(room));
  check("same as frontend: room depth", new RegExp(`RD = ${ROOM_D}\\b`).test(room));
  check("same as frontend: START", room.includes(`START = { x: ${START_SPOT.x}, y: ${START_SPOT.y} }`));
  // SEAT_COUNT and EMOTE_COUNT are checked on the frontend side (liveLobby.test.ts).
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll lobby checks passed.");
process.exit(failed ? 1 : 0);
