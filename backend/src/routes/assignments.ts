// Assignments (review packs) for the Teacher screens (both need requireTeacher):
//   GET /api/sections/:sectionId/assignments             this section's assignments, newest first
//   PUT /api/sections/:sectionId/assignments/:lessonId   { name, games, dueDate } → { assignment } (creates or updates)
// Only the Teacher's own sections and lessons: anything else is 404.
// What Students see from an assignment comes later (roadmap step 7).
import { Router } from "express";
import { z } from "zod";
import { currentTeacherId } from "../auth/currentTeacher";
import type { TemplateId } from "../content/questionCard";
import { dueDateFromText } from "../sections/dueDate";
import { sectionErrors } from "../sections/sectionErrors";
import { listAssignments, saveAssignment } from "../store/assignmentStore";

export const assignmentsRouter = Router();

const GAMES = ["quiz-show", "match-up", "fill-blank"] as const satisfies readonly TemplateId[];

const AssignBody = z.object({
  name: z
    .string({ error: "Please type a pack name." })
    .trim()
    .min(1, "Please type a pack name.")
    .max(60, "The pack name can be at most 60 characters."),
  games: z
    .array(z.enum(GAMES, { error: "The games can only be quiz-show, match-up or fill-blank." }), {
      error: "Please pick at least one game.",
    })
    .min(1, "Please pick at least one game.")
    .max(3, "A pack has at most 3 games.")
    .refine((games) => new Set(games).size === games.length, "Each game can be in the pack only once."),
  dueDate: z
    .string({ error: "The due date must look like 2026-11-27." })
    .nullable()
    .refine((text) => text === null || dueDateFromText(text) !== null, "The due date must look like 2026-11-27."),
});

assignmentsRouter.get("/api/sections/:sectionId/assignments", async (req, res) => {
  res.json(await listAssignments(currentTeacherId(req), req.params.sectionId));
});

assignmentsRouter.put("/api/sections/:sectionId/assignments/:lessonId", async (req, res) => {
  const parsed = AssignBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw sectionErrors.badRequest(parsed.error.issues[0]?.message ?? "Something in the request is missing.");
  }
  const { name, games, dueDate } = parsed.data;
  const assignment = await saveAssignment(currentTeacherId(req), req.params.sectionId, req.params.lessonId, {
    name,
    // Kept in the games' usual order.
    games: GAMES.filter((g) => games.includes(g)),
    dueDate: dueDate === null ? null : dueDateFromText(dueDate),
  });
  console.log(`[assignments] review pack saved (${assignment.games.length} game(s))`);
  res.json({ assignment });
});
