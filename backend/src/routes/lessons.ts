// Lesson addresses for the Teacher screens:
//   POST   /api/lessons/extract              upload a file: reads its text and creates a lesson ("uploaded")
//   GET    /api/lessons/extract/:extractId   the same upload answer again (extractId = lessonId)
//   GET    /api/lessons                      my lessons, newest first (no lesson text)
//   GET    /api/lessons/:lessonId            one lesson with its questions (?withText=1 adds the text)
//   DELETE /api/lessons/:lessonId            delete a lesson and its questions
//   POST   /api/lessons/:lessonId/generate   start making questions (202, works in the background)
// Only counts are logged, never lesson or question text.
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { currentTeacherId } from "../auth/currentTeacher";
import type { TemplateId } from "../content/questionCard";
import { uploadLesson } from "../middleware/uploadLesson";
import { lessonErrors } from "../lessons/lessonErrors";
import { lessonDetail, lessonListItem } from "../lessons/lessonView";
import { MIN_WORDS_TO_MAKE_QUESTIONS } from "../lessons/limits";
import { startMaking } from "../lessons/makeLessonQuestions";
import { readLessonFile } from "../lessons/readLessonFile";
import { createLesson, deleteLesson, getLesson, listLessons, listQuestions, type Lesson } from "../store/lessonStore";

export const lessonsRouter = Router();

/** The upload answer (same fields as before, plus lessonId; extractId is kept with the same value). */
function uploadAnswer(lesson: Lesson) {
  return {
    lessonId: lesson.id,
    extractId: lesson.id,
    fileName: lesson.fileName,
    fileType: lesson.fileType,
    sizeBytes: lesson.sizeBytes,
    unitLabel: lesson.unitLabel,
    unitCount: lesson.unitCount,
    unitCountIsEstimate: lesson.unitCountIsEstimate,
    wordCount: lesson.wordCount,
    tablesRead: lesson.tablesRead,
    picturesSkipped: lesson.picturesSkipped,
    textLevel: lesson.textLevel,
    minWords: MIN_WORDS_TO_MAKE_QUESTIONS,
    units: lesson.units,
  };
}

lessonsRouter.post("/api/lessons/extract", uploadLesson, async (req, res) => {
  const file = req.file;
  if (!file || file.size === 0) throw lessonErrors.noFile();

  const fileName = cleanFileName(file.originalname);
  try {
    const read = await readLessonFile(file.buffer, fileName);
    // The original file is never stored: only its text and counts.
    const lesson = createLesson({
      ownerId: currentTeacherId(req),
      fileName,
      fileType: read.fileType,
      sizeBytes: file.size,
      unitLabel: read.unitLabel,
      unitCount: read.unitCount,
      unitCountIsEstimate: read.unitCountIsEstimate,
      wordCount: read.wordCount,
      tablesRead: read.tablesRead,
      picturesSkipped: read.picturesSkipped,
      textLevel: read.textLevel,
      units: read.units,
    });
    console.log(
      `[lessons] read ${lesson.fileType}: ${lesson.unitCount} ${lesson.unitLabel}(s)` +
        `${lesson.unitCountIsEstimate ? " (estimate)" : ""}, ${lesson.wordCount} words, level ${lesson.textLevel}`,
    );
    res.json(uploadAnswer(lesson));
  } finally {
    // Drop our reference to the original file as soon as we are done with it.
    file.buffer = Buffer.alloc(0);
  }
});

lessonsRouter.get("/api/lessons/extract/:extractId", (req, res) => {
  const lesson = getLesson(currentTeacherId(req), req.params.extractId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  res.json(uploadAnswer(lesson));
});

lessonsRouter.get("/api/lessons", (req, res) => {
  const ownerId = currentTeacherId(req);
  res.json(listLessons(ownerId).map((lesson) => lessonListItem(lesson, listQuestions(ownerId, lesson.id))));
});

lessonsRouter.get("/api/lessons/:lessonId", (req, res) => {
  const ownerId = currentTeacherId(req);
  const lesson = getLesson(ownerId, req.params.lessonId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  res.json(lessonDetail(lesson, listQuestions(ownerId, lesson.id), req.query.withText === "1"));
});

lessonsRouter.delete("/api/lessons/:lessonId", (req, res) => {
  const ownerId = currentTeacherId(req);
  const lesson = getLesson(ownerId, req.params.lessonId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  if (lesson.status === "making") throw lessonErrors.alreadyMaking();
  deleteLesson(ownerId, lesson.id);
  console.log("[lessons] lesson deleted");
  res.status(204).end();
});

// ---------- Making questions ----------

const GAMES = ["quiz-show", "match-up", "fill-blank"] as const satisfies readonly TemplateId[];

const text = (field: string) =>
  z
    .string({ error: `Please type a ${field}.` })
    .trim()
    .min(1, `Please type a ${field}.`)
    .max(80, `The ${field} can be at most 80 characters.`);

const GenerateSchema = z.object({
  topic: text("topic"),
  subject: text("subject"),
  grade: z
    .number({ error: "The grade must be a whole number from 3 to 6." })
    .int("The grade must be a whole number from 3 to 6.")
    .min(3, "The grade must be a whole number from 3 to 6.")
    .max(6, "The grade must be a whole number from 3 to 6."),
  games: z
    .array(z.enum(GAMES, { error: "The games can only be quiz-show, match-up or fill-blank." }), {
      error: "Please pick at least one game.",
    })
    .min(1, "Please pick at least one game.")
    .refine((games) => new Set(games).size === games.length, "Please pick two different games."),
});

lessonsRouter.post("/api/lessons/:lessonId/generate", (req, res) => {
  const body: unknown = req.body;
  const games = (body as { games?: unknown } | undefined)?.games;
  if (Array.isArray(games) && games.length > 2) throw lessonErrors.tooManyGames();

  const parsed = GenerateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    throw lessonErrors.badRequest(parsed.error.issues[0]?.message ?? "Something in the request is missing.");
  }

  const lessonId = req.params.lessonId;
  // Throws right away if it cannot start; otherwise the work goes on in the background.
  startMaking(currentTeacherId(req), lessonId, parsed.data);
  res.status(202).json({ lessonId });
});

// Keep only the name itself (never a folder path), at a sensible length.
function cleanFileName(originalName: string): string {
  return path.basename(originalName.replace(/\\/g, "/")).slice(0, 200) || "lesson";
}
