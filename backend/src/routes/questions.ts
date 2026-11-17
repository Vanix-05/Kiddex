// Question addresses for the Check screen:
//   POST   /api/lessons/:lessonId/questions    the Teacher adds their own question
//   PATCH  /api/questions/:questionId          edit prompt, choices, answer, level, explanation
//   POST   /api/questions/:questionId/keep     "Yes, keep it" for a marked question
//   DELETE /api/questions/:questionId          delete one question
//   POST   /api/lessons/:lessonId/approve-all  approve every question of the lesson
// Every card is checked with the card format (src/content/questionCard.ts).
// "Scroll to the end before Approve all" is a screen rule; the server can only check the marked questions.
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { currentTeacherId } from "../auth/currentTeacher";
import { QuestionCardSchema, TEMPLATE_FOR_TYPE, type QuestionCard } from "../content/questionCard";
import { lessonErrors } from "../lessons/lessonErrors";
import { lessonDetail } from "../lessons/lessonView";
import {
  addQuestion,
  approveAll,
  deleteQuestion,
  getLesson,
  getQuestion,
  listQuestions,
  updateLesson,
  updateQuestion,
  type Lesson,
} from "../store/lessonStore";

export const questionsRouter = Router();

const FIELD_NAMES: Record<string, string> = {
  type: "question type",
  prompt: "question",
  choices: "choices",
  answer: "answer",
  level: "level",
  explanation: "explanation",
};

/** Checks a whole card with the card format; a failure becomes a short BAD_REQUEST. */
function checkCard(card: unknown): QuestionCard {
  const parsed = QuestionCardSchema.safeParse(card);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const field = FIELD_NAMES[String(issue?.path[0])] ?? "question";
  throw lessonErrors.badRequest(`Please check the ${field}: ${issue?.message ?? "it is not valid"}.`);
}

/** Body checks: types only. The card rules are checked afterwards on the whole card. */
const level = z.enum(["easy", "medium", "hard"], { error: "The level must be easy, medium or hard." });
const textField = (name: string) => z.string({ error: `The ${name} must be text.` });
const choices = z.array(textField("choices"), { error: "The choices must be a list." });

const EditSchema = z.object({
  prompt: textField("question").optional(),
  choices: choices.optional(),
  answer: textField("answer").optional(),
  level: level.optional(),
  explanation: textField("explanation").optional(),
});

const NewSchema = z.object({
  type: z.enum(["multiple_choice", "matching_pair", "fill_blank"], {
    error: "The question type must be multiple_choice, matching_pair or fill_blank.",
  }),
  prompt: textField("question"),
  choices: choices.default([]),
  answer: textField("answer"),
  level,
  explanation: textField("explanation").optional(),
});

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) throw lessonErrors.badRequest(parsed.error.issues[0]?.message ?? "Something in the request is wrong.");
  return parsed.data;
}

/** An approved lesson that gets a new or changed draft card goes back to "ready". */
function backToReady(ownerId: string, lesson: Lesson): void {
  if (lesson.status === "approved" || lesson.status === "failed") {
    updateLesson(ownerId, lesson.id, { status: "ready", approvedAt: null, errorCode: null });
  }
}

questionsRouter.post("/api/lessons/:lessonId/questions", (req, res) => {
  const ownerId = currentTeacherId(req);
  const lesson = getLesson(ownerId, req.params.lessonId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  if (lesson.status === "making") throw lessonErrors.alreadyMaking();
  if (!lesson.topic || !lesson.subject || !lesson.grade) {
    throw lessonErrors.badRequest("Please make the questions for this lesson first.");
  }

  const body = parseBody(NewSchema, req.body);
  if (lesson.games.length && !lesson.games.includes(TEMPLATE_FOR_TYPE[body.type])) {
    throw lessonErrors.badRequest("This lesson does not use that game.");
  }
  const card = checkCard({
    id: randomUUID(),
    lessonId: lesson.id,
    type: body.type,
    prompt: body.prompt,
    choices: body.type === "matching_pair" ? [] : body.choices,
    answer: body.answer,
    subject: lesson.subject,
    topic: lesson.topic,
    grade: lesson.grade,
    level: body.level,
    explanation: body.explanation?.trim() || undefined,
    status: "draft",
  });

  const question = addQuestion(ownerId, lesson.id, card, "teacher");
  backToReady(ownerId, lesson);
  console.log(`[questions] Teacher added a ${card.type} question`);
  res.status(201).json(question);
});

questionsRouter.patch("/api/questions/:questionId", (req, res) => {
  const ownerId = currentTeacherId(req);
  const question = getQuestion(ownerId, req.params.questionId);
  if (!question) throw lessonErrors.questionNotFound();
  const lesson = getLesson(ownerId, question.lessonId);
  if (!lesson) throw lessonErrors.questionNotFound();

  const edit = parseBody(EditSchema, req.body);
  const { position: _p, flagChecked: _f, madeBy: _m, ...card } = question;
  const checked = checkCard({
    ...card,
    ...edit,
    ...(edit.explanation !== undefined ? { explanation: edit.explanation.trim() || undefined } : {}),
    status: "draft",
  });

  const updated = updateQuestion(ownerId, question.id, {
    prompt: checked.prompt,
    choices: checked.choices,
    answer: checked.answer,
    level: checked.level,
    explanation: checked.explanation,
    status: "draft",
    // Saving a marked card counts as checking it.
    ...(question.flag ? { flagChecked: true } : {}),
  });
  if (question.status === "approved") backToReady(ownerId, lesson);
  res.json(updated);
});

questionsRouter.post("/api/questions/:questionId/keep", (req, res) => {
  const ownerId = currentTeacherId(req);
  const question = getQuestion(ownerId, req.params.questionId);
  if (!question) throw lessonErrors.questionNotFound();
  res.json(updateQuestion(ownerId, question.id, { flagChecked: true }));
});

questionsRouter.delete("/api/questions/:questionId", (req, res) => {
  const ownerId = currentTeacherId(req);
  if (!deleteQuestion(ownerId, req.params.questionId)) throw lessonErrors.questionNotFound();
  res.status(204).end();
});

questionsRouter.post("/api/lessons/:lessonId/approve-all", (req, res) => {
  const ownerId = currentTeacherId(req);
  const lesson = getLesson(ownerId, req.params.lessonId);
  if (!lesson) throw lessonErrors.lessonNotFound();
  if (lesson.status === "making") throw lessonErrors.alreadyMaking();

  const questions = listQuestions(ownerId, lesson.id);
  if (!questions.length) throw lessonErrors.noQuestions();
  if (questions.some((q) => q.flag && !q.flagChecked)) throw lessonErrors.markedNotChecked();

  const approved = approveAll(ownerId, lesson.id)!;
  console.log(`[questions] approved all ${questions.length} questions of a lesson`);
  res.json(lessonDetail(approved, listQuestions(ownerId, lesson.id), false));
});
