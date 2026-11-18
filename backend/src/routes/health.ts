// Simple routes that show the API is running: the welcome message and the health check.
import { Router } from "express";
import { env } from "../config/env";
import { databaseAnswers } from "../db/prisma";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ message: "Welcome to the KIDDEX API!" });
});

// `ai.gemini` / `ai.groq` only say whether a key is set, not whether it works.
// Use `npm run check-keys` to really test the keys.
// `db` is a tiny SELECT 1 (at most 3 seconds). If the database is down the
// answer is still 200 with db: false, and no error text or address is shown.
healthRouter.get("/api/health", async (_req, res) => {
  const db = await databaseAnswers(3000);
  res.json({
    status: "ok",
    application: "KIDDEX",
    ai: {
      gemini: Boolean(env.geminiApiKey),
      groq: Boolean(env.groqApiKey),
    },
    db,
  });
});
