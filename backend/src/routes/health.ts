// Simple routes that show the API is running: the welcome message and the health check.
import { Router } from "express";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ message: "Welcome to the KIDDEX API!" });
});

// `ai.gemini` / `ai.groq` only say whether a key is set, not whether it works.
// Use `npm run check-keys` to really test the keys.
healthRouter.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "KIDDEX",
    ai: {
      gemini: Boolean(env.geminiApiKey),
      groq: Boolean(env.groqApiKey),
    },
  });
});
