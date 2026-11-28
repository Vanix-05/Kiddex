// Lessons and their questions, saved in the database (Neon, tables Lesson and Question).
// Every function takes the owner's id: a lesson or question of another Teacher is "not found".
// Functions return plain objects with dates as ISO text, so the answers look exactly as before.
// If the database can't be reached, functions throw 503 DB_UNAVAILABLE (lessonErrors.dbUnavailable).
// Never log lesson or question text here, only counts.
import { TEMPLATE_FOR_TYPE, type QuestionCard, type TemplateId } from "../content/questionCard";
import { dbProblem, isDbUnreachable } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import type { Prisma, Lesson as LessonRow, Question as QuestionRow } from "../generated/prisma/client";
import { lessonErrors } from "../lessons/lessonErrors";
import type { LessonText } from "../lessons/readLessonFile";

/** The order of the games in the Check list. */
const GAME_ORDER: TemplateId[] = ["quiz-show", "match-up", "fill-blank"];

/** A lesson still "making" this long after it started was cut off by a server restart (a job never runs over 3 minutes). */
const STALE_MAKING_MS = 5 * 60 * 1000;

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
  /** Set by Archive (hidden from Students and the Teacher's lists); null = active. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A lesson without its text, for the list (the text can be long). */
export type LessonSummary = Omit<Lesson, "units">;

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
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export type LessonChanges = Partial<Omit<Lesson, "id" | "ownerId" | "createdAt" | "updatedAt">>;
export type QuestionChanges = Partial<Omit<Question, "id" | "lessonId" | "type">>;

// ---------- Database helpers ----------

/**
 * Runs database work. "Can't reach the database" becomes 503 DB_UNAVAILABLE; the
 * server log gets only the short safe reason. Other errors (a bug) pass on as they are.
 */
async function db<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (err) {
    if (!isDbUnreachable(err)) throw err;
    console.warn(`[db] lessons: ${dbProblem(err)}`);
    throw lessonErrors.dbUnavailable();
  }
}

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);
const toDate = (text: string | null | undefined): Date | null | undefined =>
  text === undefined ? undefined : text === null ? null : new Date(text);

function toSummary(row: Omit<LessonRow, "units">): LessonSummary {
  return {
    id: row.id,
    ownerId: row.ownerId,
    topic: row.topic,
    subject: row.subject,
    grade: row.grade,
    games: row.games as TemplateId[],
    fileName: row.fileName,
    fileType: row.fileType as Lesson["fileType"],
    sizeBytes: row.sizeBytes,
    unitLabel: row.unitLabel as Lesson["unitLabel"],
    unitCount: row.unitCount,
    unitCountIsEstimate: row.unitCountIsEstimate,
    wordCount: row.wordCount,
    tablesRead: row.tablesRead,
    picturesSkipped: row.picturesSkipped,
    textLevel: row.textLevel as Lesson["textLevel"],
    textWasCut: row.textWasCut,
    status: row.status,
    errorCode: row.errorCode,
    makingStep: row.makingStep as MakingStep | null,
    makingStartedAt: iso(row.makingStartedAt),
    approvedAt: iso(row.approvedAt),
    archivedAt: iso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLesson(row: LessonRow): Lesson {
  const { units, ...rest } = row;
  return { ...toSummary(rest), units: units as unknown as Lesson["units"] };
}

/** A saved question as the screens know it: optional card fields that are empty are left out (not null). */
function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    lessonId: row.lessonId,
    type: row.type,
    prompt: row.prompt,
    choices: row.choices,
    answer: row.answer,
    subject: row.subject,
    topic: row.topic,
    grade: row.grade,
    level: row.level,
    ...(row.explanation !== null ? { explanation: row.explanation } : {}),
    ...(row.sourcePage !== null ? { sourcePage: row.sourcePage } : {}),
    ...(row.sourceQuote !== null ? { sourceQuote: row.sourceQuote } : {}),
    ...(row.flag !== null ? { flag: row.flag } : {}),
    status: row.status,
    position: row.position,
    flagChecked: row.flagChecked,
    madeBy: row.madeBy as Question["madeBy"],
  };
}

/** Lesson changes as database data (ISO text -> dates, the text as JSON). */
function lessonData(changes: LessonChanges): Prisma.LessonUpdateManyMutationInput {
  const { makingStartedAt, approvedAt, archivedAt, units, ...rest } = changes;
  return {
    ...rest,
    ...(makingStartedAt !== undefined ? { makingStartedAt: toDate(makingStartedAt) } : {}),
    ...(approvedAt !== undefined ? { approvedAt: toDate(approvedAt) } : {}),
    ...(archivedAt !== undefined ? { archivedAt: toDate(archivedAt) } : {}),
    ...(units !== undefined ? { units: units as unknown as Prisma.InputJsonValue } : {}),
  };
}

/** A card as a new database row. */
function questionRow(card: QuestionCard, lessonId: string, position: number, madeBy: Question["madeBy"]) {
  return {
    id: card.id,
    lessonId,
    position,
    type: card.type,
    prompt: card.prompt,
    choices: card.choices,
    answer: card.answer,
    subject: card.subject,
    topic: card.topic,
    grade: card.grade,
    level: card.level,
    explanation: card.explanation ?? null,
    sourcePage: card.sourcePage ?? null,
    sourceQuote: card.sourceQuote ?? null,
    flag: card.flag ?? null,
    flagChecked: false,
    madeBy,
    status: card.status,
  } satisfies Prisma.QuestionCreateManyInput;
}

/** Only the owner's lesson. */
const ownLessonWhere = (ownerId: string, lessonId: string) => ({ id: lessonId, ownerId });
/** Only a question of one of the owner's lessons. */
const ownQuestionWhere = (ownerId: string, questionId: string) => ({ id: questionId, lesson: { ownerId } });

/** Marks the lesson as changed (a question changed). */
const touch = (tx: Prisma.TransactionClient, lessonId: string) =>
  tx.lesson.update({ where: { id: lessonId }, data: { updatedAt: new Date() } });

// ---------- Lessons ----------

export function createLesson(data: NewLesson): Promise<Lesson> {
  return db(async () => {
    const row = await prisma.lesson.create({
      data: { ...data, units: data.units as unknown as Prisma.InputJsonValue },
    });
    return toLesson(row);
  });
}

export function getLesson(ownerId: string, lessonId: string): Promise<Lesson | undefined> {
  return db(async () => {
    const row = await prisma.lesson.findFirst({ where: ownLessonWhere(ownerId, lessonId) });
    return row ? toLesson(row) : undefined;
  });
}

export interface LessonListRow {
  lesson: LessonSummary;
  questions: Question[];
  /** How many different Students have at least one round on this lesson (removed Students too: their rounds are still there). */
  playedBy: number;
}

/**
 * playedBy for every lesson of the owner that is active (archived = false) or archived
 * (archived = true): one groupBy over (lesson, Student) pairs, counted per lesson.
 */
async function playedByCounts(ownerId: string, archived: boolean): Promise<Map<string, number>> {
  const pairs = await prisma.gameRound.groupBy({
    by: ["lessonId", "studentId"],
    where: { lesson: { ownerId, archivedAt: archived ? { not: null } : null } },
  });
  const counts = new Map<string, number>();
  for (const { lessonId } of pairs) counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
  return counts;
}

/**
 * The owner's active lessons (not archived), newest first, each with its questions (for
 * the counts) and playedBy. No lesson text. Two queries, run together.
 */
export function listLessons(ownerId: string): Promise<LessonListRow[]> {
  return db(async () => {
    const [rows, played] = await Promise.all([
      prisma.lesson.findMany({
        where: { ownerId, archivedAt: null },
        orderBy: { createdAt: "desc" },
        omit: { units: true },
        include: { questions: { orderBy: { position: "asc" } } },
      }),
      playedByCounts(ownerId, false),
    ]);
    return rows.map(({ questions, ...lesson }) => ({
      lesson: toSummary(lesson),
      questions: questions.map(toQuestion),
      playedBy: played.get(lesson.id) ?? 0,
    }));
  });
}

/** The owner's archived lessons, newest archived first, like listLessons. Two queries, run together. */
export function listArchivedLessons(ownerId: string): Promise<LessonListRow[]> {
  return db(async () => {
    const [rows, played] = await Promise.all([
      prisma.lesson.findMany({
        where: { ownerId, archivedAt: { not: null } },
        orderBy: [{ archivedAt: "desc" }, { id: "desc" }],
        omit: { units: true },
        include: { questions: { orderBy: { position: "asc" } } },
      }),
      playedByCounts(ownerId, true),
    ]);
    return rows.map(({ questions, ...lesson }) => ({
      lesson: toSummary(lesson),
      questions: questions.map(toQuestion),
      playedBy: played.get(lesson.id) ?? 0,
    }));
  });
}

/**
 * Archive: sets archivedAt to now. Nothing else changes (questions, review packs,
 * rounds and due dates all stay). Archiving an archived lesson keeps its first
 * archivedAt. Returns false if the lesson was not changed because it is "making"
 * (the caller checked "not found" first).
 */
export function archiveLesson(ownerId: string, lessonId: string, now = new Date()): Promise<boolean> {
  return db(async () => {
    const { count } = await prisma.lesson.updateMany({
      where: { ...ownLessonWhere(ownerId, lessonId), status: { not: "making" }, archivedAt: null },
      data: { archivedAt: now },
    });
    if (count) return true;
    // Not changed: already archived is fine, "making" is not.
    const row = await prisma.lesson.findFirst({ where: ownLessonWhere(ownerId, lessonId), select: { archivedAt: true } });
    return Boolean(row?.archivedAt);
  });
}

/** Restore: archivedAt back to null. The lesson and its review packs come back exactly as they were. */
export function restoreLesson(ownerId: string, lessonId: string): Promise<boolean> {
  return db(async () => {
    const { count } = await prisma.lesson.updateMany({
      where: ownLessonWhere(ownerId, lessonId),
      data: { archivedAt: null },
    });
    return count > 0;
  });
}

export type DeleteResult = "deleted" | "not_found" | "making" | "archive_first" | "confirm_needed";

/**
 * Deletes the lesson; the database deletes its questions, review packs, rounds and
 * round answers with it. Student xp, stars and TopicLevel are never touched.
 * - No rounds: deleted (the upload's "choose another file" step uses this).
 * - Has rounds, not archived: "archive_first".
 * - Has rounds, archived: needs `confirmed`, else "confirm_needed".
 * - "making": never deleted.
 * The delete itself repeats the rules in its WHERE, so a round saved in between
 * can't be deleted by surprise: that answers "archive_first".
 */
export function deleteLesson(ownerId: string, lessonId: string, confirmed = false): Promise<DeleteResult> {
  return db(async () => {
    const lesson = await prisma.lesson.findFirst({
      where: ownLessonWhere(ownerId, lessonId),
      select: { status: true, archivedAt: true, _count: { select: { gameRounds: true } } },
    });
    if (!lesson) return "not_found";
    if (lesson.status === "making") return "making";
    const played = lesson._count.gameRounds > 0;
    if (played && !lesson.archivedAt) return "archive_first";
    if (played && !confirmed) return "confirm_needed";

    const { count } = await prisma.lesson.deleteMany({
      where: {
        ...ownLessonWhere(ownerId, lessonId),
        status: { not: "making" },
        ...(played ? { archivedAt: { not: null } } : { gameRounds: { none: {} } }),
      },
    });
    return count > 0 ? "deleted" : "archive_first";
  });
}

export function updateLesson(ownerId: string, lessonId: string, changes: LessonChanges): Promise<Lesson | undefined> {
  return db(async () => {
    const { count } = await prisma.lesson.updateMany({ where: ownLessonWhere(ownerId, lessonId), data: lessonData(changes) });
    if (!count) return undefined;
    const row = await prisma.lesson.findUnique({ where: { id: lessonId } });
    return row ? toLesson(row) : undefined;
  });
}

/**
 * Marks the lesson "making" with `changes`, but only if it is not making already
 * (two clicks at once can't both start). Returns undefined if it was not changed.
 */
export function startMakingLesson(ownerId: string, lessonId: string, changes: LessonChanges): Promise<Lesson | undefined> {
  return db(async () => {
    const { count } = await prisma.lesson.updateMany({
      where: { ...ownLessonWhere(ownerId, lessonId), status: { not: "making" } },
      data: lessonData({ ...changes, status: "making" }),
    });
    if (!count) return undefined;
    const row = await prisma.lesson.findUnique({ where: { id: lessonId } });
    return row ? toLesson(row) : undefined;
  });
}

/** How many lessons (of any owner) are being made right now. */
export function countMaking(): Promise<number> {
  return db(() => prisma.lesson.count({ where: { status: "making" } }));
}

/**
 * Lessons still "making" more than 5 minutes after they started were cut off
 * (the server restarted or slept): they become "failed" with SERVER_RESTARTED.
 * Returns how many were changed.
 */
export function failStaleMaking(): Promise<number> {
  return db(async () => {
    const { count } = await prisma.lesson.updateMany({
      where: { status: "making", makingStartedAt: { lt: new Date(Date.now() - STALE_MAKING_MS) } },
      data: { status: "failed", makingStep: null, errorCode: lessonErrors.serverRestarted().code },
    });
    return count;
  });
}

// ---------- Questions ----------

/** The lesson's questions in Check-list order. */
export function listQuestions(ownerId: string, lessonId: string): Promise<Question[]> {
  return db(async () => {
    const rows = await prisma.question.findMany({
      where: { lessonId, lesson: { ownerId } },
      orderBy: { position: "asc" },
    });
    return rows.map(toQuestion);
  });
}

/** Saves the AI's cards for a lesson, in the given order (positions 1, 2, 3...). Replaces any old ones. One transaction. */
export function saveQuestions(
  ownerId: string,
  lessonId: string,
  cards: QuestionCard[],
  madeBy: Question["madeBy"] = "ai",
): Promise<Question[]> {
  return db(() =>
    prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findFirst({ where: ownLessonWhere(ownerId, lessonId), select: { id: true } });
      if (!lesson) return [];
      await tx.question.deleteMany({ where: { lessonId } });
      await tx.question.createMany({ data: cards.map((card, index) => questionRow(card, lessonId, index + 1, madeBy)) });
      await touch(tx, lessonId);
      const rows = await tx.question.findMany({ where: { lessonId }, orderBy: { position: "asc" } });
      return rows.map(toQuestion);
    }),
  );
}

/** Adds one question at the end of its game group; the ones after it move down by one. One transaction. */
export function addQuestion(
  ownerId: string,
  lessonId: string,
  card: QuestionCard,
  madeBy: Question["madeBy"] = "teacher",
): Promise<Question | undefined> {
  return db(() =>
    prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findFirst({ where: ownLessonWhere(ownerId, lessonId), select: { id: true } });
      if (!lesson) return undefined;

      const ordered = await tx.question.findMany({ where: { lessonId }, orderBy: { position: "asc" }, select: { type: true } });
      const myGame = GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[card.type]);
      // After the last question whose game comes before or is the same as this one's.
      let insertAt = 0;
      ordered.forEach((q, index) => {
        if (GAME_ORDER.indexOf(TEMPLATE_FOR_TYPE[q.type]) <= myGame) insertAt = index + 1;
      });
      const position = insertAt + 1;

      await tx.question.updateMany({ where: { lessonId, position: { gte: position } }, data: { position: { increment: 1 } } });
      const row = await tx.question.create({ data: questionRow(card, lessonId, position, madeBy) });
      await touch(tx, lessonId);
      return toQuestion(row);
    }),
  );
}

export function getQuestion(ownerId: string, questionId: string): Promise<Question | undefined> {
  return db(async () => {
    const row = await prisma.question.findFirst({ where: ownQuestionWhere(ownerId, questionId) });
    return row ? toQuestion(row) : undefined;
  });
}

export function updateQuestion(ownerId: string, questionId: string, changes: QuestionChanges): Promise<Question | undefined> {
  return db(() =>
    prisma.$transaction(async (tx) => {
      const found = await tx.question.findFirst({ where: ownQuestionWhere(ownerId, questionId), select: { lessonId: true } });
      if (!found) return undefined;
      // An optional card field set to undefined is removed (saved as null), as before.
      const data: Prisma.QuestionUpdateInput = {};
      for (const [key, value] of Object.entries(changes) as [keyof QuestionChanges, unknown][]) {
        (data as Record<string, unknown>)[key] = value === undefined ? null : value;
      }
      const row = await tx.question.update({ where: { id: questionId }, data });
      await touch(tx, found.lessonId);
      return toQuestion(row);
    }),
  );
}

/** Deletes one question; the ones after it move up by one. One transaction. Returns false if it was not found. */
export function deleteQuestion(ownerId: string, questionId: string): Promise<boolean> {
  return db(() =>
    prisma.$transaction(async (tx) => {
      const found = await tx.question.findFirst({
        where: ownQuestionWhere(ownerId, questionId),
        select: { lessonId: true, position: true },
      });
      if (!found) return false;
      await tx.question.delete({ where: { id: questionId } });
      await tx.question.updateMany({
        where: { lessonId: found.lessonId, position: { gt: found.position } },
        data: { position: { decrement: 1 } },
      });
      await touch(tx, found.lessonId);
      return true;
    }),
  );
}

/** Every question of the lesson becomes "approved", and the lesson "approved" with approvedAt. One transaction. */
export function approveAll(ownerId: string, lessonId: string): Promise<Lesson | undefined> {
  return db(() =>
    prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findFirst({ where: ownLessonWhere(ownerId, lessonId), select: { id: true } });
      if (!lesson) return undefined;
      await tx.question.updateMany({ where: { lessonId }, data: { status: "approved" } });
      const row = await tx.lesson.update({ where: { id: lessonId }, data: { status: "approved", approvedAt: new Date() } });
      return toLesson(row);
    }),
  );
}
