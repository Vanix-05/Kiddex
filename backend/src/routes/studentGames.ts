// The Student's games (gp-1). Both need a Student token (requireStudent), and a
// Student only ever sees their own section's assignments and their own rounds.
//   GET  /api/student/games   → { progress, levels, lessons, mission }
//   POST /api/student/rounds  one finished round → { round, progress }
// The backend decides XP, stars, the streak and the level (src/games/, rule-based,
// not AI). Only right / tries / ms / helped of each answer come from the browser.
// The Teacher Preview never calls these, so it never saves anything.
// Log only "[rounds] saved (game, N answers)": never ids or answers.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { tooManyTries } from "../auth/authErrors";
import { currentStudentId, requireStudent } from "../auth/requireStudent";
import { gameErrors, GAMES, saveRound, studentGames } from "../store/gameStore";

export const studentGamesRouter = Router();

const MAX_MS = 30 * 60 * 1000;

const RoundBody = z
  .object({
    clientRoundId: z.string().uuid(),
    assignmentId: z.string().min(1).max(100),
    game: z.enum(GAMES),
    startedAt: z.iso.datetime({ offset: true }),
    endedAt: z.iso.datetime({ offset: true }),
    helpsUsed: z.number().int().min(0),
    answers: z
      .array(
        z
          .object({
            questionId: z.string().min(1).max(100),
            right: z.boolean(),
            tries: z.number().int().min(1).max(20),
            // Capped, not refused: a Student who left the tab open still saves.
            ms: z
              .number()
              .finite()
              .transform((ms) => Math.min(MAX_MS, Math.max(0, Math.round(ms)))),
            helped: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

// 60 rounds per 15 minutes per Student (not per computer: a class shares one address).
const roundLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => currentStudentId(req),
  handler: (_req, _res, next) => next(tooManyTries()),
});

studentGamesRouter.get("/api/student/games", requireStudent, async (req, res) => {
  res.json(await studentGames(currentStudentId(req)));
});

studentGamesRouter.post("/api/student/rounds", requireStudent, roundLimit, async (req, res) => {
  const parsed = RoundBody.safeParse(req.body ?? {});
  if (!parsed.success) throw gameErrors.badRound();
  const body = parsed.data;
  const answer = await saveRound(currentStudentId(req), {
    ...body,
    startedAt: new Date(body.startedAt),
    endedAt: new Date(body.endedAt),
  });
  console.log(`[rounds] saved (${body.game}, ${body.answers.length} answers)`);
  res.json(answer);
});
