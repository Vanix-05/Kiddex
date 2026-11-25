// Starts the KIDDEX API server. The app itself is built in src/app.ts.
import { env } from "./config/env";
import { createServer } from "node:http";
import { app } from "./app";
import { attachLobby } from "./lobby/lobbySocket";
import { failStaleMaking } from "./store/lessonStore";

/** How often to look for lessons cut off while "making". */
const STALE_CHECK_MS = 60 * 1000;

// A lesson still "making" more than 5 minutes after it started was cut off by a
// restart or sleep (Render's free server does both): mark it failed (SERVER_RESTARTED)
// so the Teacher can try again. Checked on start, then every minute.
async function failCutOffLessons(): Promise<void> {
  try {
    const count = await failStaleMaking();
    if (count) console.warn(`[lessons] ${count} lesson(s) were cut off while making questions: marked failed (SERVER_RESTARTED)`);
  } catch {
    // The database is not reachable right now (already logged); the next check tries again.
  }
}

// One web server for both: the API (Express) and the live Lobby (Socket.IO, /socket.io/).
const server = createServer(app);
attachLobby(server);

// All addresses (0.0.0.0), on the port Render gives in PORT (3000 on this computer).
server.listen(env.port, "0.0.0.0", () => {
  console.log(
    env.isProduction
      ? `KIDDEX API running on port ${env.port} (production)`
      : `KIDDEX API running at http://localhost:${env.port}`,
  );
  // Only say whether each key is set. Never print a key.
  console.log(`Gemini key: ${env.geminiApiKey ? "set" : "MISSING"}`);
  console.log(`Groq key: ${env.groqApiKey ? "set" : "MISSING"}`);
  console.log(`Websites allowed (FRONTEND_URL): ${env.frontendOrigins.join(", ")}`);

  void failCutOffLessons();
  setInterval(() => void failCutOffLessons(), STALE_CHECK_MS).unref();
});
