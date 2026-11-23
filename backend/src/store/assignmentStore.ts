// Assignments (review packs): a Teacher gives an approved lesson to one of their
// sections. Every function takes the Teacher's id: another Teacher's section or
// lesson is "not found". If the database can't be reached: 503 DB_UNAVAILABLE.
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type TemplateId } from "../content/questionCard";
import { dbProblem, isDbUnreachable } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import type { Assignment as AssignmentRow } from "../generated/prisma/client";
import { lessonErrors } from "../lessons/lessonErrors";
import { AppError } from "../middleware/AppError";
import { dueDateText } from "../sections/dueDate";
import { sectionErrors } from "../sections/sectionErrors";

export interface AssignmentView {
  id: string;
  lessonId: string;
  name: string;
  games: TemplateId[];
  /** "2026-11-27", or null. */
  dueDate: string | null;
  createdAt: string;
}

const GAME_NAMES: Record<TemplateId, string> = {
  "quiz-show": "Quiz Show",
  "match-up": "Match Up",
  "fill-blank": "Fill the Blank",
};

export const assignmentErrors = {
  lessonNotReady: () => new AppError(409, "LESSON_NOT_READY", "Check and approve the questions first."),
  gameNotReady: (game: TemplateId) =>
    new AppError(
      409,
      "GAME_NOT_READY",
      `${GAME_NAMES[game]} needs at least ${MIN_CARDS[game]} approved questions. Switch it off or add questions first.`,
    ),
};

const view = (a: AssignmentRow): AssignmentView => ({
  id: a.id,
  lessonId: a.lessonId,
  name: a.name,
  games: a.games as TemplateId[],
  dueDate: a.dueDate ? dueDateText(a.dueDate) : null,
  createdAt: a.createdAt.toISOString(),
});

async function db<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (isDbUnreachable(err)) {
      console.warn(`[assignments] database problem: ${dbProblem(err)}`);
      throw sectionErrors.dbUnavailable();
    }
    throw err;
  }
}

async function ownSection(teacherId: string, sectionId: string) {
  const section = await prisma.section.findFirst({ where: { id: sectionId, teacherId }, select: { id: true } });
  if (!section) throw sectionErrors.sectionNotFound();
}

/** The section's assignments, newest first. */
export function listAssignments(teacherId: string, sectionId: string): Promise<AssignmentView[]> {
  return db(async () => {
    await ownSection(teacherId, sectionId);
    const rows = await prisma.assignment.findMany({
      where: { sectionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map(view);
  });
}

/**
 * Gives the lesson to the section, or updates the pack if it was given before.
 * The lesson must be approved (409 LESSON_NOT_READY) and every game must have
 * enough approved questions (409 GAME_NOT_READY). A section with no Students yet
 * can still get it.
 */
export function saveAssignment(
  teacherId: string,
  sectionId: string,
  lessonId: string,
  pack: { name: string; games: TemplateId[]; dueDate: Date | null },
): Promise<AssignmentView> {
  return db(async () => {
    await ownSection(teacherId, sectionId);
    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, ownerId: teacherId }, select: { status: true } });
    if (!lesson) throw lessonErrors.lessonNotFound();
    if (lesson.status !== "approved") throw assignmentErrors.lessonNotReady();

    const counts = await prisma.question.groupBy({
      by: ["type"],
      where: { lessonId, status: "approved" },
      _count: { _all: true },
    });
    const approved: Record<TemplateId, number> = { "quiz-show": 0, "match-up": 0, "fill-blank": 0 };
    for (const c of counts) approved[TEMPLATE_FOR_TYPE[c.type]] += c._count._all;
    const short = pack.games.find((g) => approved[g] < MIN_CARDS[g]);
    if (short) throw assignmentErrors.gameNotReady(short);

    const row = await prisma.assignment.upsert({
      where: { lessonId_sectionId: { lessonId, sectionId } },
      create: { lessonId, sectionId, ...pack },
      update: pack,
    });
    return view(row);
  });
}
