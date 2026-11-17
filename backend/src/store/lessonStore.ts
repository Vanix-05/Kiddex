// Memory only, for testing. A database replaces the inside of this file later; keep the function names.
// Keeps lessons and their questions until the server stops. At most 30 lessons; when full,
// the oldest lesson that is not "making" is removed (with its questions).
// Every function takes the owner's id: a lesson or question of another owner is "not found".
// Functions return copies, so callers change data only through these functions (like a database).
import { randomUUID } from "node:crypto";
import { TEMPLATE_FOR_TYPE, type QuestionCard, type TemplateId } from "../content/questionCard";
import type { LessonText } from "../lessons/readLessonFile";

const MAX_LESSONS = 30;
/** The order of the games in the Check list. */
const GAME_ORDER: TemplateId[] = ["quiz-show", "match-up", "fill-blank"];

export type LessonStatus = "uploaded" | "making" | "ready" | "failed" | "approved";
export type MakingStep = "writing" | "checking" | "waiting";

export interface Lesson {
  id: string;
  ownerId: string;
  topic: string | null;
  subject: string | null;
  grade: number | null;
  games: TemplateId[];
  fileName: string;
  fileType: LessonText["fileType"];
  sizeBytes: number;
  unitLabel: LessonText["unitLabel"];
  unitCount: number;
  unitCountIsEstimate: boolean;
  wordCount: number;
  tablesRead: number | null;
  picturesSkipped: number | null;
  textLevel: LessonText["textLevel"];
  units: LessonText["units"];
  textWasCut: boolean;
  status: LessonStatus;
  errorCode: string | null;
  makingStep: MakingStep | null;
  makingStartedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A question card plus its place in the Check list and how it was made. */
export type Question = QuestionCard & {
  position: number;
  flagChecked: boolean;
  madeBy: "ai" | "teacher";
};

export type NewLesson = Omit<
  Lesson,
  | "id"
  | "topic"
  | "subject"
  | "grade"
  | "games"
  | "textWasCut"
  | "status"
  | "errorCode"
  | "makingStep"
  | "makingStartedAt"
  | "approvedAt"
  | "createdAt"
  | "updatedAt"
>;

export type LessonChanges = Partial<Omit<Lesson, "id" | "ownerId" | "createdAt" | "updatedAt">>;
export type QuestionChanges = Partial<Omit<Question, "id" | "lessonId" | "type">>;

const lessons = new Map<string, Lesson>();
const questions = new Map<string, Question>();

const copy = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

function ownLesson(ownerId: string, lessonId: string): Lesson | undefined {
  const lesson = lessons.get(lessonId);
  return lesson && lesson.ownerId === ownerId ? lesson : undefined;
}

function ownQuestion(ownerId: string, questionId: string): Question | undefined {
  const question = questions.get(questionId);
  return question && ownLesson(ownerId, question.lessonId) ? question : undefined;
}

function questionsOf(lessonId: string): Question[] {
  return [...questions.values()].filter((q) => q.lessonId === lessonId).sort((a, b) => a.position - b.position);
}

/** Gives the lesson's questions positions 1, 2, 3... in the given order. */
function renumber(ordered: Question[]): void {
  ordered.forEach((question, index) => (question.position = index + 1));
}

function touch(lessonId: string): void {
  const lesson = lessons.get(lessonId);
  if (lesson) lesson.updatedAt = now();
}

// ---------- Lessons ----------

export function createLesson(data: NewLesson): Lesson {
  // Full: remove the oldest lesson that is not being made (Map keeps insertion order).
  while (lessons.size >= MAX_LESSONS) {
    const oldest = [...lessons.values()].find((lesson) => lesson.status !== "making");
    if (!oldest) break;
    removeLesson(oldest.id);
  }
  const time = now();
  const lesson: Lesson = {
    ...copy(data),
    id: randomUUID(),
    topic: null,
    subject: null,
    grade: null,
    games: [],
    textWasCut: false,
    status: "uploaded",
    errorCode: null,
    makingStep: null,
    makingStartedAt: null,
    approvedAt: null,
    createdAt: time,
    updatedAt: time,
  };
  lessons.set(lesson.id, lesson);
  return copy(lesson);
}

export function getLesson(ownerId: string, lessonId: string): Lesson | undefined {
  const lesson = ownLesson(ownerId, lessonId);
  return lesson && copy(lesson);
}

/** The owner's lessons, newest first. */
export function listLessons(ownerId: string): Lesson[] {
  return [...lessons.values()]
    .filter((lesson) => lesson.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(copy);
}

export function updateLesson(ownerId: string, lessonId: string, changes: LessonChanges): Lesson | undefined {
  const lesson = ownLesson(ownerId, lessonId);
  if (!lesson) return undefined;
  Object.assign(lesson, copy(changes), { updatedAt: now() });
  return copy(lesson);
}

/** Deletes the lesson and its questions. Returns false if it was not found. */
export function deleteLesson(ownerId: string, lessonId: string): boolean {
  if (!ownLesson(ownerId, lessonId)) return false;
  removeLesson(lessonId);
  return true;
}

function removeLesson(lessonId: string): void {
  for (const question of questionsOf(lessonId)) questions.delete(question.id);
  lessons.delete(lessonId);
}

/** How many lessons (of any owner) are being made right now. */
export function countMaking(): number {
  return [...lessons.values()].filter((lesson) => lesson.status === "making").length;
}

// ---------- Questions ----------

/** The lesson's questions in Check-list order. */
export function listQuestions(ownerId: string, lessonId: string): Question[] {
  return ownLesson(ownerId, lessonId) ? questionsOf(lessonId).map(copy) : [];
}

/** Saves the AI's cards for a lesson, in the given order (positions 1, 2, 3...). Replaces any old ones. */
export function saveQuestions(
  ownerId: string,
  lessonId: string,
  cards: QuestionCard[],
  madeBy: Question["madeBy"] = "ai",
): Question[] {
  if (!ownLesson(ownerId, lessonId)) return [];
  for (const old of questionsOf(lessonId)) questions.delete(old.id);
  cards.forEach((card, index) => {
    const question: Question = { ...copy(card), lessonId, position: index + 1, flagChecked: false, madeBy };
    questions.set(question.id, question);
  });
  touch(lessonId);
  return questionsOf(lessonId).map(copy);
}

/** Adds one question at the end of its game group, then renumbers. */
export function addQuestion(
  ownerId: string,
  lessonId: string,
  card: QuestionCard,
  madeBy: Question["madeBy"] = "teacher",
): Question | undefined {
  if (!ownLesson(ownerId, lessonId)) return undefined;
  const question: Question = { ...copy(card), id: card.id || randomUUID(), lessonId, position: 0, flagChecked: false, madeBy };

  const ordered = questionsOf(lessonId);
  const myGame = GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[question.type]);
  // After the last question whose game comes before or is the same as this one's.
  let insertAt = 0;
  ordered.forEach((q, index) => {
    if (GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[q.type]) <= myGame) insertAt = index + 1;
  });
  ordered.splice(insertAt, 0, question);
  renumber(ordered);
  questions.set(question.id, question);
  touch(lessonId);
  return copy(question);
}

export function getQuestion(ownerId: string, questionId: string): Question | undefined {
  const question = ownQuestion(ownerId, questionId);
  return question && copy(question);
}

export function updateQuestion(ownerId: string, questionId: string, changes: QuestionChanges): Question | undefined {
  const question = ownQuestion(ownerId, questionId);
  if (!question) return undefined;
  Object.assign(question, copy(changes));
  // Optional fields set to undefined are removed, like a database null.
  for (const key of Object.keys(question) as (keyof Question)[]) {
    if (question[key] === undefined) delete question[key];
  }
  touch(question.lessonId);
  return copy(question);
}

/** Deletes one question and renumbers the rest. Returns false if it was not found. */
export function deleteQuestion(ownerId: string, questionId: string): boolean {
  const question = ownQuestion(ownerId, questionId);
  if (!question) return false;
  questions.delete(questionId);
  renumber(questionsOf(question.lessonId));
  touch(question.lessonId);
  return true;
}

/** Every question of the lesson becomes "approved", and the lesson "approved" with approvedAt. */
export function approveAll(ownerId: string, lessonId: string): Lesson | undefined {
  const lesson = ownLesson(ownerId, lessonId);
  if (!lesson) return undefined;
  for (const question of questionsOf(lessonId)) question.status = "approved";
  const time = now();
  Object.assign(lesson, { status: "approved", approvedAt: time, updatedAt: time });
  return copy(lesson);
}
