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
import { needsHelp, overallMastery, type TopicMastery } from "../games/mastery";
import { levelFromXp } from "../games/rewards";
import { phDay, shownStreak } from "../games/streak";
import { showSchoolId } from "../sections/schoolId";
import { sectionErrors } from "../sections/sectionErrors";
import { lessonTitle } from "./gameStore";
import { isPackDone, doneGames, loadRounds, sectionPacks, studyDaysThisWeek, topicsByStudent } from "./reportStore";
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
  /** Rule-based (src/games/mastery.ts): percent is null while there are fewer than 8 answers. */
  mastery: TopicMastery;
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
    level: number;
    xp: number;
    xpIntoLevel: number;
    xpGoal: number;
    stars: number;
    /** Different Philippine days this week (Mon–Sun) with a finished round: 0 to 7. */
    studyDaysThisWeek: number;
    /** Review packs of their section they finished / all with at least one playable game. */
    packsDone: number;
    packsTotal: number;
    /** Overall mastery, or null while no topic has enough answers. */
    mastery: number | null;
    needsHelp: boolean;
  };
  topics: LevelTopic[];
}

/**
 * One query for the Student, then together: their topic levels, all their rounds,
 * their rounds + answers for mastery (reportStore.loadRounds) and the section's
 * review packs.
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
        xp: true,
        stars: true,
        sectionId: true,
        section: { select: { grade: true, name: true } },
      },
    });
    if (!student) throw sectionErrors.studentNotFound();

    const [topicLevels, rounds, reportRounds, packs] = await Promise.all([
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
      loadRounds([studentId]),
      sectionPacks(student.sectionId),
    ]);

    const groups = groupByTopic(rounds);
    const answersOf = new Map(reportRounds.map((r) => [r.id, r.answers]));
    const masteryOf = new Map((topicsByStudent(reportRounds).get(studentId) ?? []).map((t) => [t.key, t.mastery]));
    const allMastery = [...masteryOf.values()];
    const done = doneGames(reportRounds);
    const levelOf = new Map(topicLevels.map((t) => [t.topicKey, t]));

    const topics: LevelTopic[] = groups.map((g) => {
      const newest = g.rounds[g.rounds.length - 1]!;
      const saved = levelOf.get(g.key);
      return {
        topic: saved?.topic ?? newest.topic.trim(),
        level: saved?.level ?? newest.endLevel,
        lesson: newest.assignment?.name ?? lessonTitle(newest.lesson.topic, newest.lesson.fileName),
        roundCount: g.rounds.length,
        mastery: masteryOf.get(g.key) ?? { percent: null, answers: 0 },
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
        ...levelFromXp(student.xp),
        xp: student.xp,
        stars: student.stars,
        studyDaysThisWeek: studyDaysThisWeek(reportRounds, studentId, now),
        packsDone: packs.filter((p) => isPackDone(p, studentId, done)).length,
        packsTotal: packs.length,
        mastery: overallMastery(allMastery),
        needsHelp: needsHelp(allMastery),
      },
      topics,
    };
  });
}
