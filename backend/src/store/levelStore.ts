// A Student's levels per topic for their Teacher (step 8: show the adaptive engine).
//   studentLevels(teacherId, studentId) → GET /api/students/:studentId/levels
// Only reads: rounds, answers and levels are saved by gameStore.ts, never here.
// The engine is rule-based, not AI: the checks during a round are worked out again
// from the saved answers (src/games/levelPath.ts).
// Never sends the questions or the choices: only right / helped per answer.
// Never logs ids, School IDs or answers.
import { prisma } from "../db/prisma";
import type { Level } from "../games/difficulty";
import { countChanges, groupByTopic, roundChecks, shownRounds, type LevelCheck, type PathAnswer } from "../games/levelPath";
import { phDay, shownStreak } from "../games/streak";
import { showSchoolId } from "../sections/schoolId";
import { sectionErrors } from "../sections/sectionErrors";
import { lessonTitle } from "./gameStore";
import { db } from "./sectionStore";

export interface LevelRound {
  id: string;
  game: string;
  startedAt: string;
  endedAt: string;
  startLevel: Level;
  endLevel: Level;
  change: string;
  reason: string;
  right: number;
  total: number;
  helpsUsed: number;
  /** Every answer in the order played: right / helped only (Match Up shows these, it has no checks). */
  answers: PathAnswer[];
  checks: LevelCheck[];
}

export interface LevelTopic {
  topic: string;
  /** Where the NEXT round starts (TopicLevel.level). */
  level: Level;
  /** The newest round's assignment name, or the lesson title. */
  lesson: string;
  roundCount: number;
  ups: number;
  downs: number;
  /** The newest 6, oldest first. */
  rounds: LevelRound[];
}

export interface StudentLevels {
  student: {
    id: string;
    schoolId: string;
    buddy: string | null;
    buddyName: string | null;
    /** "Grade 4 – Sampaguita" */
    sectionName: string;
    lastPlayedAt: string | null;
    streakDays: number;
  };
  topics: LevelTopic[];
}

/**
 * Three queries for the Student, their topic levels and all their rounds (no
 * answers), then one for the answers of the rounds shown only.
 * A Student who isn't in one of this Teacher's sections → 404 STUDENT_NOT_FOUND.
 */
export function studentLevels(teacherId: string, studentId: string, now = new Date()): Promise<StudentLevels> {
  return db(async () => {
    const student = await prisma.student.findFirst({
      where: { id: studentId, section: { teacherId } },
      select: {
        id: true,
        schoolId: true,
        buddy: true,
        buddyName: true,
        streakDays: true,
        lastPlayDay: true,
        section: { select: { grade: true, name: true } },
      },
    });
    if (!student) throw sectionErrors.studentNotFound();

    const [topicLevels, rounds] = await Promise.all([
      prisma.topicLevel.findMany({ where: { studentId }, select: { topicKey: true, topic: true, level: true } }),
      prisma.gameRound.findMany({
        where: { studentId },
        orderBy: [{ endedAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          game: true,
          topic: true,
          startLevel: true,
          endLevel: true,
          change: true,
          reason: true,
          right: true,
          total: true,
          helpsUsed: true,
          startedAt: true,
          endedAt: true,
          assignment: { select: { name: true } },
          lesson: { select: { topic: true, fileName: true } },
        },
      }),
    ]);

    const groups = groupByTopic(rounds);
    const shownIds = groups.flatMap((g) => shownRounds(g.rounds).map((r) => r.id));
    const answers = shownIds.length
      ? await prisma.roundAnswer.findMany({
          where: { roundId: { in: shownIds } },
          select: { roundId: true, position: true, right: true, helped: true },
        })
      : [];
    const answersOf = new Map<string, typeof answers>();
    for (const a of answers) answersOf.set(a.roundId, [...(answersOf.get(a.roundId) ?? []), a]);
    const levelOf = new Map(topicLevels.map((t) => [t.topicKey, t]));

    const topics: LevelTopic[] = groups.map((g) => {
      const newest = g.rounds[g.rounds.length - 1]!;
      const saved = levelOf.get(g.key);
      return {
        topic: saved?.topic ?? newest.topic.trim(),
        level: saved?.level ?? newest.endLevel,
        lesson: newest.assignment?.name ?? lessonTitle(newest.lesson.topic, newest.lesson.fileName),
        roundCount: g.rounds.length,
        ...countChanges(g.rounds),
        rounds: shownRounds(g.rounds).map((r) => ({
          id: r.id,
          game: r.game,
          startedAt: r.startedAt.toISOString(),
          endedAt: r.endedAt.toISOString(),
          startLevel: r.startLevel,
          endLevel: r.endLevel,
          change: r.change,
          reason: r.reason,
          right: r.right,
          total: r.total,
          helpsUsed: r.helpsUsed,
          answers: [...(answersOf.get(r.id) ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((a) => ({ right: a.right, helped: a.helped })),
          checks: roundChecks(r.game, r.startLevel, answersOf.get(r.id) ?? []),
        })),
      };
    });

    const last = rounds[rounds.length - 1];
    return {
      student: {
        id: student.id,
        schoolId: showSchoolId(student.schoolId),
        buddy: student.buddy,
        buddyName: student.buddyName,
        sectionName: `Grade ${student.section.grade} – ${student.section.name}`,
        lastPlayedAt: last ? last.endedAt.toISOString() : null,
        streakDays: shownStreak(student.lastPlayDay, student.streakDays, phDay(now)),
      },
      topics,
    };
  });
}
