// Sections and their Students, saved in the database (tables Section and Student).
// Every function takes the Teacher's id: another Teacher's section is "not found".
// Answers never hold a PIN hash. If the database can't be reached, functions throw
// 503 DB_UNAVAILABLE. Never log School IDs, codes or hashes here, only counts.
import { dbProblem, isDbUnreachable } from "../db/dbProblem";
import { prisma } from "../db/prisma";
import type { Prisma } from "../generated/prisma/client";
import { phDay, shownStreak } from "../games/streak";
import { AppError } from "../middleware/AppError";
import { newCodeChanges } from "../sections/newCode";
import { makeUniqueCodes, showOneTimeCode } from "../sections/oneTimeCode";
import { planAdd, type Skipped } from "../sections/planAdd";
import { cleanSchoolId, showSchoolId } from "../sections/schoolId";
import { sectionErrors } from "../sections/sectionErrors";

/** New sections take the next tab look, in this order, then again. */
const SECTION_LOOKS = [
  { color: "yellow", icon: "flower" },
  { color: "pink", icon: "tulip" },
  { color: "coral", icon: "rose" },
] as const;

export interface SectionView {
  id: string;
  grade: number;
  name: string;
  color: string;
  icon: string;
  studentCount: number;
  registeredCount: number;
}

export interface StudentView {
  id: string;
  /** "2026-0144" */
  schoolId: string;
  /** Has made their PIN code. */
  registered: boolean;
  /** "482-915", only while not registered (else null). */
  oneTimeCode: string | null;
  buddy: string | null;
  buddyName: string | null;
  lastLoginAt: string | null;
  registeredAt: string | null;
  /** The endedAt of their newest saved round, or null (never played). */
  lastPlayedAt: string | null;
  /** The play streak as the screens show it: 0 once it stopped (Philippine days). */
  streakDays: number;
}

const STUDENT_COLUMNS = {
  id: true,
  schoolId: true,
  oneTimeCode: true,
  pinHash: true, // read only to say "registered"; never sent
  buddy: true,
  buddyName: true,
  lastLoginAt: true,
  registeredAt: true,
  streakDays: true,
  lastPlayDay: true,
} satisfies Prisma.StudentSelect;

type StudentRow = Prisma.StudentGetPayload<{ select: typeof STUDENT_COLUMNS }>;

function studentView(s: StudentRow, lastPlayedAt: Date | null = null, now = new Date()): StudentView {
  const registered = s.pinHash !== null;
  return {
    id: s.id,
    schoolId: showSchoolId(s.schoolId),
    registered,
    oneTimeCode: !registered && s.oneTimeCode ? showOneTimeCode(s.oneTimeCode) : null,
    buddy: s.buddy,
    buddyName: s.buddyName,
    lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
    registeredAt: s.registeredAt?.toISOString() ?? null,
    lastPlayedAt: lastPlayedAt?.toISOString() ?? null,
    streakDays: shownStreak(s.lastPlayDay, s.streakDays, phDay(now)),
  };
}

/** The database's unique rule said no (same School ID, code or section name saved at the same moment). */
const isUniqueClash = (err: unknown) => (err as { code?: unknown })?.code === "P2002";

/** Runs database work; "can't reach the database" becomes 503 DB_UNAVAILABLE. */
export async function db<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof AppError || isUniqueClash(err)) throw err;
    if (isDbUnreachable(err)) {
      console.warn(`[sections] database problem: ${dbProblem(err)}`);
      throw sectionErrors.dbUnavailable();
    }
    throw err;
  }
}

export function listSections(teacherId: string): Promise<SectionView[]> {
  return db(async () => {
    const [sections, registered] = await Promise.all([
      prisma.section.findMany({
        where: { teacherId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { _count: { select: { students: true } } },
      }),
      prisma.student.groupBy({
        by: ["sectionId"],
        where: { section: { teacherId }, pinHash: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const registeredBySection = new Map(registered.map((r) => [r.sectionId, r._count._all]));
    return sections.map((s) => ({
      id: s.id,
      grade: s.grade,
      name: s.name,
      color: s.color,
      icon: s.icon,
      studentCount: s._count.students,
      registeredCount: registeredBySection.get(s.id) ?? 0,
    }));
  });
}

/** Makes a section with the next tab look. Same grade + name (any capitals) → 409 SECTION_TAKEN. */
export async function createSection(teacherId: string, grade: number, name: string): Promise<SectionView> {
  const nameKey = name.toLowerCase();
  try {
    return await db(async () => {
      const taken = await prisma.section.findFirst({ where: { teacherId, grade, nameKey }, select: { name: true } });
      if (taken) throw sectionErrors.sectionTaken(grade, taken.name);
      const count = await prisma.section.count({ where: { teacherId } });
      const look = SECTION_LOOKS[count % SECTION_LOOKS.length];
      const s = await prisma.section.create({ data: { teacherId, grade, name, nameKey, ...look } });
      return { id: s.id, grade, name, color: s.color, icon: s.icon, studentCount: 0, registeredCount: 0 };
    });
  } catch (err) {
    // Two quick clicks: the database's unique rule catches the second one.
    if (isUniqueClash(err)) throw sectionErrors.sectionTaken(grade, name);
    throw err;
  }
}

/** The section's Students, in School ID order, with when each last played (one query for all). */
export function listStudents(teacherId: string, sectionId: string): Promise<StudentView[]> {
  return db(async () => {
    const section = await prisma.section.findFirst({ where: { id: sectionId, teacherId }, select: { id: true } });
    if (!section) throw sectionErrors.sectionNotFound();
    const [rows, lastRounds] = await Promise.all([
      prisma.student.findMany({
        where: { sectionId },
        orderBy: { schoolId: "asc" },
        select: STUDENT_COLUMNS,
      }),
      prisma.gameRound.groupBy({
        by: ["studentId"],
        where: { student: { sectionId } },
        _max: { endedAt: true },
      }),
    ]);
    const lastPlayed = new Map(lastRounds.map((r) => [r.studentId, r._max.endedAt]));
    const now = new Date();
    return rows.map((s) => studentView(s, lastPlayed.get(s.id) ?? null, now));
  });
}

export interface AddAnswer {
  added: StudentView[];
  skipped: Skipped[];
}

/** Tries in all when another request saved the same School ID or code at the same moment. */
const CLASH_TRIES = 3;

/**
 * Adds the good School IDs to the section, each with a new one-time code, all in
 * ONE transaction: every good one is added, or none. The section row is locked
 * first, so two quick clicks can't go over the 45 limit together.
 * Too many for the places left → 409 SECTION_FULL and nothing is added.
 */
export async function addStudents(teacherId: string, sectionId: string, schoolIds: string[]): Promise<AddAnswer> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db(() => addOnce(teacherId, sectionId, schoolIds));
    } catch (err) {
      // A clash: try again; the new try sees the other request's Students.
      if (isUniqueClash(err) && attempt < CLASH_TRIES) continue;
      if (isUniqueClash(err)) throw sectionErrors.dbUnavailable();
      throw err;
    }
  }
}

/**
 * A new one-time code for one of my Students (lost card or forgotten PIN code).
 * The PIN code is removed and any open Student login ends; registeredAt, the
 * buddy, the setup and all progress are kept (see newCodeChanges).
 * Another Teacher's Student → 404 STUDENT_NOT_FOUND.
 */
export async function makeNewCode(teacherId: string, studentId: string): Promise<StudentView> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db(async () => {
        const own = await prisma.student.findFirst({
          where: { id: studentId, section: { teacherId } },
          select: { id: true },
        });
        if (!own) throw sectionErrors.studentNotFound();
        // The Student's own old code counts as taken too, so the new one is always different.
        const [code] = await makeUniqueCodes(1, async (candidates) => {
          const used = await prisma.student.findMany({
            where: { oneTimeCode: { in: candidates } },
            select: { oneTimeCode: true },
          });
          return new Set(used.map((s) => s.oneTimeCode ?? ""));
        });
        const row = await prisma.student.update({
          where: { id: own.id },
          data: newCodeChanges(code, new Date()),
          select: STUDENT_COLUMNS,
        });
        // Their progress is kept, so Last played stays too.
        const last = await prisma.gameRound.findFirst({
          where: { studentId: own.id },
          orderBy: { endedAt: "desc" },
          select: { endedAt: true },
        });
        return studentView(row, last?.endedAt ?? null);
      });
    } catch (err) {
      // Another request took the same code at the same moment: make another.
      if (isUniqueClash(err) && attempt < CLASH_TRIES) continue;
      if (isUniqueClash(err)) throw sectionErrors.dbUnavailable();
      throw err;
    }
  }
}

function addOnce(teacherId: string, sectionId: string, schoolIds: string[]): Promise<AddAnswer> {
  return prisma.$transaction(
    async (tx) => {
      // Lock this section's row until the transaction ends (for the 45 check below).
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Section" WHERE "id" = ${sectionId} AND "teacherId" = ${teacherId} FOR UPDATE`;
      if (locked.length === 0) throw sectionErrors.sectionNotFound();

      const studentCount = await tx.student.count({ where: { sectionId } });
      const cleanIds = [...new Set(schoolIds.map(cleanSchoolId).filter((id): id is string => id !== null))];
      const existing = cleanIds.length
        ? await tx.student.findMany({ where: { schoolId: { in: cleanIds } }, select: { schoolId: true, sectionId: true } })
        : [];
      const owners = new Map(existing.map((s) => [s.schoolId, s.sectionId]));
      const plan = planAdd(schoolIds, studentCount, owners, sectionId);
      if (plan.full) throw sectionErrors.sectionFull(plan.placesLeft);
      if (plan.good.length === 0) return { added: [], skipped: plan.skipped };

      const codes = await makeUniqueCodes(plan.good.length, async (candidates) => {
        const used = await tx.student.findMany({
          where: { oneTimeCode: { in: candidates } },
          select: { oneTimeCode: true },
        });
        return new Set(used.map((s) => s.oneTimeCode ?? ""));
      });
      const now = new Date();
      await tx.student.createMany({
        data: plan.good.map((schoolId, i) => ({ schoolId, sectionId, oneTimeCode: codes[i], codeMadeAt: now })),
      });
      const added = await tx.student.findMany({
        where: { sectionId, schoolId: { in: plan.good } },
        orderBy: { schoolId: "asc" },
        select: STUDENT_COLUMNS,
      });
      return { added: added.map((s) => studentView(s)), skipped: plan.skipped };
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
