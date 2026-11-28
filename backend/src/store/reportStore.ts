// The Teacher's reports (step 9): mastery, who needs help, review pack completion and
// study days. Only reads: rounds and answers are saved by gameStore.ts.
//   loadRounds(studentIds)                → rounds + answers for many Students (2 queries in all)
//   sectionProgress(teacherId, sectionId) → GET /api/sections/:sectionId/progress
// Mastery is rule-based (src/games/mastery.ts) and worked out from the saved answers
// each time; nothing extra is saved.
// Never sends question text or choices. Never logs ids, School IDs or answers.
import type { TemplateId } from "../content/questionCard";
import { prisma } from "../db/prisma";
import { topicKeyOf } from "../games/levelPath";
import { needsHelp, overallMastery, topicMastery, HELP_BELOW, type TopicMastery } from "../games/mastery";
import { cardCounts, packDone, playableGames } from "../games/packs";
import { phDay, phWeekDays } from "../games/streak";
import { dueDateText } from "../sections/dueDate";
import { showSchoolId } from "../sections/schoolId";
import { sectionErrors } from "../sections/sectionErrors";
import { lessonTitle } from "./gameStore";
import { db } from "./sectionStore";

// ---------- Loading rounds and answers ----------

export interface ReportRound {
  id: string;
  studentId: string;
  topic: string;
  endedAt: Date;
  createdAt: Date;
  assignmentId: string | null;
  lessonId: string;
  game: string;
  countsForMission: boolean;
  /** The assignment's name, else the lesson title. */
  lesson: string;
  /** Right / helped only, highest position first. */
  answers: { position: number; right: boolean; helped: boolean }[];
}

/** Newest first: by endedAt, then by when it was saved. */
const newestFirst = (a: ReportRound, b: ReportRound) =>
  b.endedAt.getTime() - a.endedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime();

/**
 * All rounds of these Students, newest first, each with its answers. Two queries in
 * all, run together: never one per Student or per round.
 */
export async function loadRounds(studentIds: readonly string[]): Promise<ReportRound[]> {
  if (studentIds.length === 0) return [];
  const ids = [...studentIds];
  const [rounds, answers] = await Promise.all([
    prisma.gameRound.findMany({
      where: { studentId: { in: ids } },
      select: {
        id: true,
        studentId: true,
        topic: true,
        endedAt: true,
        createdAt: true,
        assignmentId: true,
        lessonId: true,
        game: true,
        countsForMission: true,
        assignment: { select: { name: true } },
        lesson: { select: { topic: true, fileName: true } },
      },
    }),
    prisma.roundAnswer.findMany({
      where: { round: { studentId: { in: ids } } },
      select: { roundId: true, position: true, right: true, helped: true },
    }),
  ]);
  const answersOf = new Map<string, ReportRound["answers"]>();
  for (const { roundId, ...a } of answers) {
    const list = answersOf.get(roundId) ?? [];
    list.push(a);
    answersOf.set(roundId, list);
  }
  return rounds
    .map(({ assignment, lesson, ...r }) => ({
      ...r,
      lesson: assignment?.name ?? lessonTitle(lesson.topic, lesson.fileName),
      answers: (answersOf.get(r.id) ?? []).sort((a, b) => b.position - a.position),
    }))
    .sort(newestFirst);
}

// ---------- Per Student, per topic (no database) ----------

export interface StudentTopic {
  key: string;
  /** As written in the newest round. */
  topic: string;
  /** The newest round's assignment name, else the lesson title. */
  lesson: string;
  /** When the newest round of this topic ended. */
  newestAt: Date;
  mastery: TopicMastery;
}

/**
 * Each Student's topics with their mastery. `rounds` must be newest first (as
 * loadRounds gives them), so each topic's answers are newest first too.
 */
export function topicsByStudent(rounds: readonly ReportRound[]): Map<string, StudentTopic[]> {
  const grouped = new Map<string, Map<string, { first: ReportRound; answers: ReportRound["answers"] }>>();
  for (const r of rounds) {
    const topics = grouped.get(r.studentId) ?? new Map();
    grouped.set(r.studentId, topics);
    const key = topicKeyOf(r.topic);
    const entry = topics.get(key) ?? { first: r, answers: [] };
    entry.answers.push(...r.answers);
    topics.set(key, entry);
  }
  const result = new Map<string, StudentTopic[]>();
  for (const [studentId, topics] of grouped) {
    result.set(
      studentId,
      [...topics].map(([key, { first, answers }]) => ({
        key,
        topic: first.topic.trim(),
        lesson: first.lesson,
        newestAt: first.endedAt,
        mastery: topicMastery(answers),
      })),
    );
  }
  return result;
}

/** "studentId|assignmentId|game" for every game a Student has done (countsForMission). */
const doneKey = (studentId: string, assignmentId: string, game: string) => `${studentId}|${assignmentId}|${game}`;

export function doneGames(rounds: readonly ReportRound[]): Set<string> {
  const done = new Set<string>();
  for (const r of rounds) if (r.countsForMission && r.assignmentId) done.add(doneKey(r.studentId, r.assignmentId, r.game));
  return done;
}

/**
 * The Philippine day a round counts for in the reports: when the server saved it
 * (createdAt), like the streak, so a round near midnight lands on the same day in
 * both. "Last played" stays on endedAt.
 */
export const roundDay = (r: { createdAt: Date }) => phDay(r.createdAt);

/** How many different Philippine days this week the Student finished a round. */
export function studyDaysThisWeek(rounds: readonly ReportRound[], studentId: string, now: Date): number {
  const week = new Set(phWeekDays(now));
  return new Set(rounds.filter((r) => r.studentId === studentId).map(roundDay).filter((d) => week.has(d)))
    .size;
}

// ---------- Review packs ----------

export interface ReportPack {
  assignmentId: string;
  name: string;
  lessonTitle: string;
  /** The playable games, in the usual order. */
  games: TemplateId[];
  dueDate: Date | null;
  createdAt: Date;
}

/**
 * The section's review packs with at least one playable game (same rule as the
 * Student's games, src/games/packs.ts): due soonest first, no due date last, then newest.
 */
export async function sectionPacks(sectionId: string): Promise<ReportPack[]> {
  const rows = await prisma.assignment.findMany({
    where: { sectionId, lesson: { status: "approved" } },
    select: {
      id: true,
      name: true,
      games: true,
      dueDate: true,
      createdAt: true,
      lesson: {
        select: { topic: true, fileName: true, questions: { where: { status: "approved" }, select: { type: true } } },
      },
    },
  });
  const due = (p: ReportPack) => p.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
  return rows
    .map((a) => ({
      assignmentId: a.id,
      name: a.name,
      lessonTitle: lessonTitle(a.lesson.topic, a.lesson.fileName),
      games: playableGames(a.games, cardCounts(a.lesson.questions)),
      dueDate: a.dueDate,
      createdAt: a.createdAt,
    }))
    .filter((p) => p.games.length > 0)
    .sort((a, b) => due(a) - due(b) || b.createdAt.getTime() - a.createdAt.getTime() || a.assignmentId.localeCompare(b.assignmentId));
}

export const isPackDone = (pack: ReportPack, studentId: string, done: ReadonlySet<string>) =>
  packDone(pack.games, (g) => done.has(doneKey(studentId, pack.assignmentId, g)));

// ---------- GET /api/sections/:sectionId/progress ----------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface SectionProgress {
  registered: number;
  today: { played: number };
  week: {
    from: string;
    to: string;
    played: number;
    studyDaysAverage: number | null;
    studyDays: { days: number; count: number }[];
    days: { day: string; weekday: string; count: number | null }[];
  };
  mastery: number | null;
  needHelpCount: number;
  topics: { topic: string; lesson: string; percent: number | null; needHelp: number; played: number }[];
  needHelp: {
    studentId: string;
    schoolId: string;
    buddy: string | null;
    buddyName: string | null;
    topic: string;
    percent: number;
  }[];
  packs: {
    assignmentId: string;
    name: string;
    lessonTitle: string;
    games: TemplateId[];
    dueDate: string | null;
    done: number;
    notDone: { studentId: string; schoolId: string }[];
  }[];
  neverPlayed: { studentId: string; schoolId: string; registeredAt: string | null }[];
}

const average = (list: readonly number[]) => (list.length ? list.reduce((s, n) => s + n, 0) / list.length : null);

/**
 * A section's progress for its Teacher. Only registered Students (made a PIN code
 * at least once, or have a saved round) count. Another Teacher's section → 404 SECTION_NOT_FOUND.
 *
 * Queries: the section with its registered Students, then together the review packs
 * (assignments + lessons + approved question types) and all the Students' rounds +
 * answers. Fine for an MVP; if it gets slow later, the next step is a saved
 * mastery table.
 */
export function sectionProgress(teacherId: string, sectionId: string, now = new Date()): Promise<SectionProgress> {
  return db(async () => {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, teacherId },
      select: {
        id: true,
        students: {
          // Registered = made a PIN code at least once, or has a saved round. A Student
          // waiting to make a new PIN code after "New code" still counts. Removed Students never count.
          where: { removedAt: null, OR: [{ registeredAt: { not: null } }, { gameRounds: { some: {} } }] },
          orderBy: { schoolId: "asc" },
          select: { id: true, schoolId: true, buddy: true, buddyName: true, registeredAt: true },
        },
      },
    });
    if (!section) throw sectionErrors.sectionNotFound();
    const students = section.students;
    const [packs, rounds] = await Promise.all([sectionPacks(sectionId), loadRounds(students.map((s) => s.id))]);

    const today = phDay(now);
    const week = phWeekDays(now);
    const weekSet = new Set(week);

    // Which Philippine days each Student finished a round.
    const playDays = new Map<string, Set<string>>();
    for (const r of rounds) {
      const days = playDays.get(r.studentId) ?? new Set<string>();
      days.add(roundDay(r));
      playDays.set(r.studentId, days);
    }
    const daysOf = (id: string) => playDays.get(id) ?? new Set<string>();
    const studyDays = students.map((s) => [...daysOf(s.id)].filter((d) => weekSet.has(d)).length);

    const maxDays = Math.max(5, ...studyDays);
    const histogram = Array.from({ length: maxDays + 1 }, (_, days) => ({
      days,
      count: studyDays.filter((n) => n === days).length,
    }));
    const avg = average(studyDays);

    const days = week
      .map((day, i) => ({
        day,
        weekday: WEEKDAYS[i]!,
        count: day > today ? null : students.filter((s) => daysOf(s.id).has(day)).length,
      }))
      .filter((d, i) => i < 5 || (d.count ?? 0) > 0);

    // Mastery per Student per topic.
    const topicsOf = topicsByStudent(rounds);
    const overall = students.map((s) => overallMastery((topicsOf.get(s.id) ?? []).map((t) => t.mastery)));

    // Per topic across the section: shown as written in the newest round of anyone.
    const byTopic = new Map<string, { newest: StudentTopic; percents: number[]; played: number }>();
    for (const s of students) {
      for (const t of topicsOf.get(s.id) ?? []) {
        const entry = byTopic.get(t.key) ?? { newest: t, percents: [], played: 0 };
        if (t.newestAt > entry.newest.newestAt) entry.newest = t;
        if (t.mastery.percent !== null) entry.percents.push(t.mastery.percent);
        entry.played++;
        byTopic.set(t.key, entry);
      }
    }
    const topics = [...byTopic.values()]
      .map(({ newest, percents, played }) => {
        const avgPercent = average(percents);
        return {
          topic: newest.topic,
          lesson: newest.lesson,
          percent: avgPercent === null ? null : Math.round(avgPercent),
          needHelp: percents.filter((p) => p < HELP_BELOW).length,
          played,
        };
      })
      .sort((a, b) => {
        if (a.percent === null || b.percent === null) {
          if (a.percent !== b.percent) return a.percent === null ? 1 : -1;
          return a.topic.localeCompare(b.topic);
        }
        return a.percent - b.percent || a.topic.localeCompare(b.topic);
      });

    // Who needs help, with their weakest topic.
    const needHelp = students
      .filter((s) => needsHelp((topicsOf.get(s.id) ?? []).map((t) => t.mastery)))
      .map((s) => {
        const weakest = (topicsOf.get(s.id) ?? [])
          .filter((t) => t.mastery.percent !== null)
          .sort((a, b) => a.mastery.percent! - b.mastery.percent! || a.topic.localeCompare(b.topic))[0]!;
        return {
          studentId: s.id,
          schoolId: showSchoolId(s.schoolId),
          buddy: s.buddy,
          buddyName: s.buddyName,
          topic: weakest.topic,
          percent: weakest.mastery.percent!,
          sortId: s.schoolId,
        };
      })
      .sort((a, b) => a.percent - b.percent || a.sortId.localeCompare(b.sortId))
      .map(({ sortId: _, ...rest }) => rest);

    const done = doneGames(rounds);
    const masteries = overall.filter((m): m is number => m !== null);
    const masteryAvg = average(masteries);

    return {
      registered: students.length,
      today: { played: students.filter((s) => daysOf(s.id).has(today)).length },
      week: {
        from: week[0]!,
        to: week[6]!,
        played: studyDays.filter((n) => n > 0).length,
        studyDaysAverage: avg === null ? null : Math.round(avg * 10) / 10,
        studyDays: histogram,
        days,
      },
      mastery: masteryAvg === null ? null : Math.round(masteryAvg),
      needHelpCount: needHelp.length,
      topics,
      needHelp,
      packs: packs.map((p) => {
        const notDone = students.filter((s) => !isPackDone(p, s.id, done));
        return {
          assignmentId: p.assignmentId,
          name: p.name,
          lessonTitle: p.lessonTitle,
          games: p.games,
          dueDate: p.dueDate ? dueDateText(p.dueDate) : null,
          done: students.length - notDone.length,
          notDone: notDone.map((s) => ({ studentId: s.id, schoolId: showSchoolId(s.schoolId) })),
        };
      }),
      neverPlayed: students
        .filter((s) => daysOf(s.id).size === 0)
        .map((s) => ({ studentId: s.id, schoolId: showSchoolId(s.schoolId), registeredAt: s.registeredAt?.toISOString() ?? null })),
    };
  });
}
