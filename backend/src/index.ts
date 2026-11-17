// Starts the KIDDEX API server. The app itself is built in src/app.ts.
import { env } from "./config/env";
import { app } from "./app";

app.listen(env.port, () => {
  console.log(`KIDDEX API running at http://localhost:${env.port}`);
  // Only say whether each key is set. Never print a key.
  console.log(`Gemini key: ${env.geminiApiKey ? "set" : "MISSING"}`);
  console.log(`Groq key: ${env.groqApiKey ? "set" : "MISSING"}`);
});
