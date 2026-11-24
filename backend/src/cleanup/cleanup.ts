// `npm run cleanup`: removes test data from the database, safely (src/scripts/cleanup.ts).
//
// 1. makePlan() finds everything the options match and says, in plain words, what
//    would be deleted. It deletes nothing. If any filter matches nothing, or a text
//    matches more than one Teacher without --teacher, the plan has `problems` and
//    nothing at all may be deleted.
// 2. applyPlan() deletes it all in ONE transaction (all or nothing) and reports the
//    real counts.
// listOverview() prints what is in the database, grouped by Teacher.
//
// Never deletes Teachers or Admins. Never prints a code, PIN code, hash, token or the
// database address.
import type { prisma as Prisma } from "../db/prisma";
import { dueDateText } from "../sections/dueDate";
import { cleanSchoolId, showSchoolId } from "../sections/schoolId";

type Db = typeof Prisma;
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export const ZZ = "zz-test-";

export interface CleanupOptions {
  list: boolean;
  yes: boolean;
  teacher: string | null;
  lessons: string[];
  assignments: string[];
  students: string[];
  /** School IDs, or "all". */
  resetProgress: string[];
  sections: string[];
  zzTest: boolean;
}

export const NO_OPTIONS: CleanupOptions = {
  list: false,
  yes: false,
  teacher: null,
  lessons: [],
  assignments: [],
  students: [],
  resetProgress: [],
  sections: [],
  zzTest: false,
};

/** Reads the command line. Answers the options, or an error in plain words. */
export function parseArgs(argv: readonly string[]): { options: CleanupOptions } | { error: string } {
  const o: CleanupOptions = {
    ...NO_OPTIONS,
    lessons: [],
    assignments: [],
    students: [],
    resetProgress: [],
    sections: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${arg} needs a value after it.`);
      return v;
    };
    try {
      if (arg === "--list") o.list = true;
      else if (arg === "--yes") o.yes = true;
      else if (arg === "--zz-test") o.zzTest = true;
      else if (arg === "--teacher") o.teacher = value().trim().toLowerCase();
      else if (arg === "--lesson") o.lessons.push(value());
      else if (arg === "--assignment") o.assignments.push(value());
      else if (arg === "--student") o.students.push(value());
      else if (arg === "--reset-progress") o.resetProgress.push(value());
      else if (arg === "--section") o.sections.push(value());
      else return { error: `Unknown option: ${arg}` };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }
  return { options: o };
}

export const hasWork = (o: CleanupOptions) =>
  o.lessons.length + o.assignments.length + o.students.length + o.resetProgress.length + o.sections.length > 0 ||
  o.zzTest;

export interface Plan {
  /** Reasons to stop. If there are any, nothing may be deleted. */
  problems: string[];
  /** "Will delete …" lines. */
  lines: string[];
  lessonIds: string[];
  assignmentIds: string[];
  studentIds: string[];
  sectionIds: string[];
  resetStudentIds: string[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quoteList = (names: string[], max = 6) =>
  names
    .slice(0, max)
    .map((n) => `"${n}"`)
    .join(", ") + (names.length > max ? `, and ${names.length - max} more` : "");
const lessonTitle = (l: { topic: string | null; fileName: string }) => l.topic?.trim() || l.fileName;
const sectionName = (s: { grade: number; name: string }) => `Grade ${s.grade} – ${s.name}`;
const add = (list: string[], ids: string[]) => {
  for (const id of ids) if (!list.includes(id)) list.push(id);
};

/** "matches lessons of 2 Teachers (a@x, b@y). Add --teacher <email>." or null. */
function moreThanOneTeacher(emails: string[], what: string): string | null {
  const unique = [...new Set(emails)];
  return unique.length > 1
    ? `${what} of ${unique.length} Teachers (${unique.join(", ")}). Add --teacher <email> to pick one.`
    : null;
}

/** Finds what the options match. Deletes nothing. */
export async function makePlan(db: Db, o: CleanupOptions): Promise<Plan> {
  const plan: Plan = {
    problems: [],
    lines: [],
    lessonIds: [],
    assignmentIds: [],
    studentIds: [],
    sectionIds: [],
    resetStudentIds: [],
  };

  // --teacher limits everything to one Teacher.
  let teacherId: string | null = null;
  if (o.teacher) {
    const t = await db.teacher.findUnique({ where: { email: o.teacher }, select: { id: true } });
    if (!t) {
      plan.problems.push(`No Teacher has the email "${o.teacher}".`);
      return plan;
    }
    teacherId = t.id;
  }
  const own = teacherId ? { ownerId: teacherId } : {};
  const mine = teacherId ? { teacherId } : {};
  const inMySections = teacherId ? { section: { teacherId } } : {};
  const scope = teacherId ? ` (Teacher ${o.teacher})` : "";

  // --lesson
  for (const text of o.lessons) {
    const rows = await db.lesson.findMany({
      where: {
        ...own,
        OR: [{ topic: { contains: text, mode: "insensitive" } }, { fileName: { contains: text, mode: "insensitive" } }],
      },
      select: {
        id: true,
        topic: true,
        fileName: true,
        owner: { select: { email: true } },
        _count: { select: { questions: true, assignments: true, gameRounds: true } },
      },
    });
    if (!rows.length) {
      plan.problems.push(`No lesson matches "${text}"${scope}.`);
      continue;
    }
    const many = teacherId
      ? null
      : moreThanOneTeacher(
          rows.map((r) => r.owner.email),
          `"${text}" matches lessons`,
        );
    if (many) {
      plan.problems.push(many);
      continue;
    }
    const sum = (k: "questions" | "assignments" | "gameRounds") => rows.reduce((n, r) => n + r._count[k], 0);
    plan.lines.push(
      `Will delete ${plural(rows.length, "lesson")} (${quoteList(rows.map(lessonTitle))}): ${plural(sum("questions"), "question")}, ${plural(sum("assignments"), "assignment")}, ${plural(sum("gameRounds"), "game round")}.`,
    );
    add(
      plan.lessonIds,
      rows.map((r) => r.id),
    );
  }

  // --assignment
  for (const text of o.assignments) {
    const rows = await db.assignment.findMany({
      where: { ...inMySections, name: { equals: text.trim(), mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        section: { select: { grade: true, name: true, teacher: { select: { email: true } } } },
        _count: { select: { rounds: true } },
      },
    });
    if (!rows.length) {
      plan.problems.push(`No assignment is called "${text}"${scope}.`);
      continue;
    }
    const many = teacherId
      ? null
      : moreThanOneTeacher(
          rows.map((r) => r.section.teacher.email),
          `"${text}" matches assignments`,
        );
    if (many) {
      plan.problems.push(many);
      continue;
    }
    const rounds = rows.reduce((n, r) => n + r._count.rounds, 0);
    plan.lines.push(
      `Will delete ${plural(rows.length, "assignment")} "${rows[0]!.name}" (${[...new Set(rows.map((r) => sectionName(r.section)))].join(", ")}). Its ${plural(rounds, "game round")} stay, without the assignment link.`,
    );
    add(
      plan.assignmentIds,
      rows.map((r) => r.id),
    );
  }

  // --student
  for (const text of o.students) {
    const schoolId = cleanSchoolId(text);
    if (!schoolId) {
      plan.problems.push(`"${text}" is not a School ID (it needs 8 digits, like 2026-0191).`);
      continue;
    }
    const s = await db.student.findFirst({
      where: { schoolId, ...inMySections },
      select: {
        id: true,
        section: { select: { grade: true, name: true } },
        _count: { select: { gameRounds: true, topicLevels: true } },
      },
    });
    if (!s) {
      plan.problems.push(`No Student has the School ID ${showSchoolId(schoolId)}${scope}.`);
      continue;
    }
    plan.lines.push(
      `Will delete Student ${showSchoolId(schoolId)} (${sectionName(s.section)}): ${plural(s._count.gameRounds, "game round")}, ${plural(s._count.topicLevels, "topic level")}.`,
    );
    add(plan.studentIds, [s.id]);
  }

  // --reset-progress
  for (const text of o.resetProgress) {
    const all = text.trim().toLowerCase() === "all";
    const schoolId = all ? null : cleanSchoolId(text);
    if (!all && !schoolId) {
      plan.problems.push(`"${text}" is not a School ID or "all".`);
      continue;
    }
    const rows = await db.student.findMany({
      where: { ...inMySections, ...(schoolId ? { schoolId } : {}) },
      select: { id: true, schoolId: true, _count: { select: { gameRounds: true, topicLevels: true } } },
      orderBy: { schoolId: "asc" },
    });
    if (!rows.length) {
      plan.problems.push(
        all
          ? `There are no Students to reset${scope}.`
          : `No Student has the School ID ${showSchoolId(schoolId!)}${scope}.`,
      );
      continue;
    }
    const rounds = rows.reduce((n, r) => n + r._count.gameRounds, 0);
    const levels = rows.reduce((n, r) => n + r._count.topicLevels, 0);
    const who = rows.length <= 8 ? ` (${rows.map((r) => showSchoolId(r.schoolId)).join(", ")})` : "";
    plan.lines.push(
      `Will reset the progress of ${plural(rows.length, "Student")}${who}: XP, stars and streak to 0, and delete ${plural(rounds, "game round")} and ${plural(levels, "topic level")}. Their buddy, look and PIN code stay.`,
    );
    add(
      plan.resetStudentIds,
      rows.map((r) => r.id),
    );
  }

  // --section "4 Sampaguita"
  for (const text of o.sections) {
    const match = /^\s*(?:grade\s*)?(\d)\s*[–-]?\s*(.+?)\s*$/i.exec(text);
    if (!match) {
      plan.problems.push(`"${text}" is not a section. Write the grade and the name, like "4 Sampaguita".`);
      continue;
    }
    const rows = await db.section.findMany({
      where: { ...mine, grade: Number(match[1]), nameKey: match[2]!.toLowerCase() },
      select: {
        id: true,
        grade: true,
        name: true,
        teacher: { select: { email: true } },
        _count: { select: { students: true, assignments: true } },
      },
    });
    if (!rows.length) {
      plan.problems.push(`No section is called "${text}"${scope}.`);
      continue;
    }
    const many = teacherId
      ? null
      : moreThanOneTeacher(
          rows.map((r) => r.teacher.email),
          `"${text}" matches sections`,
        );
    if (many) {
      plan.problems.push(many);
      continue;
    }
    const ids = rows.map((r) => r.id);
    const rounds = await db.gameRound.count({ where: { student: { sectionId: { in: ids } } } });
    for (const r of rows) {
      plan.lines.push(
        `Will delete section ${sectionName(r)}: ${plural(r._count.students, "Student")} (with their data), ${plural(r._count.assignments, "assignment")}, ${plural(rounds, "game round")}.`,
      );
    }
    add(plan.sectionIds, ids);
  }

  // --zz-test: what the test scripts leave behind if they stop halfway.
  if (o.zzTest) {
    const starts = { startsWith: ZZ, mode: "insensitive" as const };
    const [lessons, sections, assignments, teachers] = [
      await db.lesson.findMany({
        where: { ...own, OR: [{ topic: starts }, { fileName: starts }] },
        select: { id: true, topic: true, fileName: true },
      }),
      await db.section.findMany({
        where: { ...mine, name: starts },
        select: { id: true, grade: true, name: true, _count: { select: { students: true } } },
      }),
      await db.assignment.findMany({ where: { ...inMySections, name: starts }, select: { id: true, name: true } }),
      await db.teacher.count({ where: { email: starts } }),
    ];
    if (!lessons.length && !sections.length && !assignments.length) {
      plan.problems.push(`No ${ZZ} leftovers${scope}.`);
    } else {
      const students = sections.reduce((n, s) => n + s._count.students, 0);
      plan.lines.push(
        `Will delete the ${ZZ} leftovers: ${plural(lessons.length, "lesson")}, ${plural(sections.length, "section")} (with ${plural(students, "Student")}), ${plural(assignments.length, "assignment")}.`,
      );
      add(
        plan.lessonIds,
        lessons.map((l) => l.id),
      );
      add(
        plan.sectionIds,
        sections.map((s) => s.id),
      );
      add(
        plan.assignmentIds,
        assignments.map((a) => a.id),
      );
    }
    if (teachers)
      plan.lines.push(`Note: ${plural(teachers, `${ZZ} Teacher account`)} stay (this script never deletes Teachers).`);
  }

  return plan;
}

/** Rows in every table this script can touch (before and after, for the real counts). */
async function totals(tx: Tx) {
  return {
    lessons: await tx.lesson.count(),
    questions: await tx.question.count(),
    assignments: await tx.assignment.count(),
    sections: await tx.section.count(),
    students: await tx.student.count(),
    rounds: await tx.gameRound.count(),
    answers: await tx.roundAnswer.count(),
    topicLevels: await tx.topicLevel.count(),
  };
}

/**
 * Deletes everything in the plan in ONE transaction (all or nothing). Refuses a plan
 * with problems. Answers what was deleted, with the real counts.
 */
export async function applyPlan(db: Db, plan: Plan): Promise<string[]> {
  if (plan.problems.length) throw new Error("This plan has problems: nothing was deleted.");
  return db.$transaction(
    async (tx) => {
      const before = await totals(tx);

      // Reset progress: keep the Student and their setup, remove their rounds and levels.
      let reset = 0;
      if (plan.resetStudentIds.length) {
        const ids = { in: plan.resetStudentIds };
        await tx.gameRound.deleteMany({ where: { studentId: ids } });
        await tx.topicLevel.deleteMany({ where: { studentId: ids } });
        reset = (
          await tx.student.updateMany({
            where: { id: ids },
            data: { xp: 0, stars: 0, streakDays: 0, lastPlayDay: null },
          })
        ).count;
      }
      // Students first (a section with Students can't be deleted); their rounds, answers and levels go with them.
      await tx.student.deleteMany({
        where: { OR: [{ id: { in: plan.studentIds } }, { sectionId: { in: plan.sectionIds } }] },
      });
      // A section takes its assignments with it.
      await tx.section.deleteMany({ where: { id: { in: plan.sectionIds } } });
      // An assignment's rounds stay, without the link (SetNull).
      await tx.assignment.deleteMany({ where: { id: { in: plan.assignmentIds } } });
      // A lesson takes its questions, assignments and rounds with it.
      await tx.lesson.deleteMany({ where: { id: { in: plan.lessonIds } } });

      const after = await totals(tx);
      const gone = (k: keyof typeof before) => before[k] - after[k];
      const lines = [
        `Deleted: ${plural(gone("lessons"), "lesson")}, ${plural(gone("questions"), "question")}, ${plural(gone("assignments"), "assignment")}, ${plural(gone("sections"), "section")}, ${plural(gone("students"), "Student")}, ${plural(gone("rounds"), "game round")} (${plural(gone("answers"), "answer")}), ${plural(gone("topicLevels"), "topic level")}.`,
      ];
      if (reset) lines.push(`Reset the progress of ${plural(reset, "Student")} (XP, stars and streak are 0 now).`);
      return lines;
    },
    { maxWait: 20_000, timeout: 120_000 },
  );
}

/** What is in the database, grouped by Teacher. No codes, PIN codes or hashes. */
export async function listOverview(db: Db): Promise<string[]> {
  const teachers = await db.teacher.findMany({
    orderBy: { email: "asc" },
    select: {
      email: true,
      name: true,
      lessons: {
        orderBy: { createdAt: "asc" },
        select: {
          topic: true,
          fileName: true,
          status: true,
          createdAt: true,
          _count: { select: { questions: true } },
          assignments: { select: { name: true, section: { select: { grade: true, name: true } } } },
        },
      },
      sections: {
        orderBy: [{ grade: "asc" }, { nameKey: "asc" }],
        select: {
          grade: true,
          name: true,
          _count: { select: { assignments: true } },
          students: {
            orderBy: { schoolId: "asc" },
            select: {
              schoolId: true,
              registeredAt: true,
              xp: true,
              stars: true,
              streakDays: true,
              _count: { select: { gameRounds: true } },
            },
          },
        },
      },
    },
  });

  const out: string[] = [];
  for (const t of teachers) {
    out.push("", `Teacher: ${t.email} (${t.name})`);
    out.push(`  Lessons (${t.lessons.length}):`);
    for (const l of t.lessons) {
      const where = l.assignments.length
        ? `assigned to ${l.assignments.map((a) => `${sectionName(a.section)} as "${a.name}"`).join(", ")}`
        : "not assigned";
      out.push(
        `    - "${lessonTitle(l)}" · ${l.status} · ${plural(l._count.questions, "question")} · made ${dueDateText(l.createdAt)} · ${where}`,
      );
    }
    out.push(`  Sections (${t.sections.length}):`);
    for (const s of t.sections) {
      out.push(
        `    - ${sectionName(s)} · ${plural(s.students.length, "Student")} · ${plural(s._count.assignments, "assignment")}`,
      );
      for (const st of s.students) {
        out.push(
          `        ${showSchoolId(st.schoolId)} · registered: ${st.registeredAt ? "yes" : "no"} · ${st.xp} XP · ${st.stars} stars · streak ${st.streakDays} · ${plural(st._count.gameRounds, "round")}`,
        );
      }
    }
  }

  const starts = { startsWith: ZZ, mode: "insensitive" as const };
  const zz = {
    teachers: await db.teacher.count({ where: { email: starts } }),
    lessons: await db.lesson.count({ where: { OR: [{ topic: starts }, { fileName: starts }] } }),
    sections: await db.section.count({ where: { name: starts } }),
    assignments: await db.assignment.count({ where: { name: starts } }),
  };
  const any = zz.teachers + zz.lessons + zz.sections + zz.assignments;
  out.push(
    "",
    any
      ? `Leftovers (${ZZ}): ${plural(zz.teachers, "Teacher")}, ${plural(zz.lessons, "lesson")}, ${plural(zz.sections, "section")}, ${plural(zz.assignments, "assignment")}.`
      : `Leftovers (${ZZ}): none.`,
  );
  return out;
}
