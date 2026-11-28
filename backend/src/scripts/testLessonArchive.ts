// `npm run test-lesson-archive`: checks Archive, Restore and Delete for lessons (la-1).
// First the on-time rule (src/games/packs.ts doneOnTime), which needs no database.
//
// When DATABASE_URL is set (backend/.env), it also walks through the addresses on the real
// database with throwaway Teachers, a section, 2 Students and lessons (names start with
// "zz-test-", School IDs start with 97): Delete of a lesson nobody played, ARCHIVE_FIRST,
// Archive (hidden from the lists, the Student's games, round saving and the Review packs,
// while mastery and levels stay), Restore, Delete forever with { confirm: true }, another
// Teacher's 404s and playedBy. It ALWAYS deletes what it made at the end, even when a
// check fails. Never prints a token, a School ID or an id.
import path from "node:path";
import type { AddressInfo } from "node:net";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { doneOnTime } from "../games/packs";
import { dueDateFromText } from "../sections/dueDate";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------- On time (no database) ----------

function pureChecks() {
  const due = dueDateFromText("2026-11-20")!;
  check("on time: done the day before the due day", doneOnTime(new Date("2026-11-19T02:00:00Z"), due));
  // 15:59 UTC is 23:59 in the Philippines: still the due day.
  check("on time: done 23:59 PH on the due day", doneOnTime(new Date("2026-11-20T15:59:00Z"), due));
  // 16:01 UTC is 00:01 the next day in the Philippines.
  check("late: done 00:01 PH the day after", !doneOnTime(new Date("2026-11-20T16:01:00Z"), due));
  check("on time: no due date is always on time", doneOnTime(new Date("2030-01-01T00:00:00Z"), null));
}

// ---------- On the database ----------

type Reply = { status: number; body: Record<string, any> };

async function databaseWalkthrough() {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP  archive walkthrough (DATABASE_URL is not set)");
    return;
  }
  // Loaded only now: these need the database settings (env.ts stops without them).
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { prisma } = require("../db/prisma") as typeof import("../db/prisma");
  const { app } = require("../app") as typeof import("../app");
  const { makeTeacherToken } = require("../auth/tokens") as typeof import("../auth/tokens");
  const { saveRound, studentGames } = require("../store/gameStore") as typeof import("../store/gameStore");
  const { sectionProgress } = require("../store/reportStore") as typeof import("../store/reportStore");

  const tag = `zz-test-${randomBytes(4).toString("hex")}`;
  const made: { teacherIds: string[]; sectionId?: string } = { teacherIds: [] };
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, url: string, token: string, body?: unknown): Promise<Reply> => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  };
  const codeOf = (r: Reply): string => r.body?.error?.code ?? "";
  const errorOf = (r: Reply) => `${r.status} ${codeOf(r)}`.trim();

  try {
    const teacher = await prisma.teacher.create({
      data: { email: `${tag}@kiddex.test`, name: `${tag}-teacher`, passwordHash: "not-a-hash" },
    });
    made.teacherIds.push(teacher.id);
    const other = await prisma.teacher.create({
      data: { email: `${tag}-2@kiddex.test`, name: `${tag}-teacher-2`, passwordHash: "not-a-hash" },
    });
    made.teacherIds.push(other.id);
    const token = makeTeacherToken(teacher);
    const otherToken = makeTeacherToken(other);
    const section = await prisma.section.create({
      data: { teacherId: teacher.id, grade: 4, name: tag, nameKey: tag, color: "yellow", icon: "flower" },
    });
    made.sectionId = section.id;

    const start = randomInt(0, 900_000);
    const sid = (n: number) => `97${String((start + n) % 1_000_000).padStart(6, "0")}`;
    const registered = { pinHash: "zz-test-not-a-real-hash", registeredAt: new Date() };
    const s1 = await prisma.student.create({ data: { schoolId: sid(0), sectionId: section.id, ...registered } });
    const s2 = await prisma.student.create({ data: { schoolId: sid(1), sectionId: section.id, ...registered } });

    // An approved lesson with 3 Quiz Show questions and a review pack.
    const makeLesson = async (name: string, status: "approved" | "making" = "approved") => {
      const lesson = await prisma.lesson.create({
        data: {
          ownerId: teacher.id,
          topic: `${tag}-${name}`,
          subject: "Math",
          grade: 4,
          games: ["quiz-show"],
          fileName: `${tag}-${name}.pdf`,
          fileType: "pdf",
          sizeBytes: 1,
          unitLabel: "page",
          unitCount: 1,
          unitCountIsEstimate: false,
          wordCount: 100,
          textLevel: "ok",
          units: [],
          status,
          approvedAt: status === "approved" ? new Date() : null,
          makingStartedAt: status === "making" ? new Date() : null,
        },
      });
      const questions = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          prisma.question.create({
            data: {
              lessonId: lesson.id,
              position: i + 1,
              type: "multiple_choice",
              prompt: `Q${i}?`,
              choices: ["1/2", "2/4"],
              answer: "1/2",
              subject: "Math",
              topic: `${tag}-${name} topic`,
              grade: 4,
              level: "easy",
              status: "approved",
            },
          }),
        ),
      );
      const pack = await prisma.assignment.create({
        data: { lessonId: lesson.id, sectionId: section.id, name: `${tag}-${name}-pack`, games: ["quiz-show"], dueDate: dueDateFromText("2026-12-04") },
      });
      return { lesson, questions, pack };
    };
    const play = (studentId: string, assignmentId: string, questionIds: string[], right: number) => {
      const end = new Date(Date.now() - 60_000);
      return saveRound(studentId, {
        clientRoundId: randomUUID(),
        assignmentId,
        game: "quiz-show",
        startedAt: new Date(end.getTime() - 60_000),
        endedAt: end,
        helpsUsed: 0,
        answers: questionIds.map((questionId, i) => ({ questionId, right: i < right, tries: 1, ms: 1000, helped: false })),
      });
    };

    // ---------- A lesson nobody played: Delete works ----------
    const fresh = await makeLesson("fresh");
    const listed = await call("GET", "/api/lessons", token);
    const freshRow = (listed.body as unknown as any[]).find?.((l) => l.id === fresh.lesson.id);
    check("list: a lesson nobody played has playedBy 0", freshRow?.playedBy === 0, JSON.stringify(freshRow?.playedBy));
    const delFresh = await call("DELETE", `/api/lessons/${fresh.lesson.id}`, token); // no body, like "choose another file"
    const [freshLessons, freshQuestions, freshPacks] = await Promise.all([
      prisma.lesson.count({ where: { id: fresh.lesson.id } }),
      prisma.question.count({ where: { lessonId: fresh.lesson.id } }),
      prisma.assignment.count({ where: { lessonId: fresh.lesson.id } }),
    ]);
    check(
      "delete: a lesson with no rounds is deleted (204), with its questions and packs",
      delFresh.status === 204 && freshLessons === 0 && freshQuestions === 0 && freshPacks === 0,
      `${errorOf(delFresh)} ${JSON.stringify([freshLessons, freshQuestions, freshPacks])}`,
    );

    // ---------- A played lesson ----------
    const { lesson, questions, pack } = await makeLesson("played");
    const qIds = questions.map((q) => q.id);
    // S1 plays twice, S2 once: playedBy counts different Students, not rounds.
    await play(s1.id, pack.id, qIds, 3);
    await play(s1.id, pack.id, qIds, 2);
    await play(s2.id, pack.id, qIds, 1);
    const roundIds = (await prisma.gameRound.findMany({ where: { lessonId: lesson.id }, select: { id: true } })).map((r) => r.id);
    const answerCount = await prisma.roundAnswer.count({ where: { roundId: { in: roundIds } } });
    check("setup: 3 rounds with answers were saved", roundIds.length === 3 && answerCount === 9, `${roundIds.length} ${answerCount}`);

    const row = async (url: string) =>
      ((await call("GET", url, token)).body as unknown as any[]).find?.((l) => l.id === lesson.id);
    check("list: playedBy counts different Students, not rounds (2, not 3)", (await row("/api/lessons"))?.playedBy === 2);

    const delPlayed = await call("DELETE", `/api/lessons/${lesson.id}`, token);
    check(
      "delete: a played lesson that isn't archived → 409 ARCHIVE_FIRST with the message",
      delPlayed.status === 409 && codeOf(delPlayed) === "ARCHIVE_FIRST" && delPlayed.body.error?.message === "Students played this lesson. Archive it instead.",
      errorOf(delPlayed),
    );
    check("delete: after ARCHIVE_FIRST the lesson is still there", (await prisma.lesson.count({ where: { id: lesson.id } })) === 1);

    // Another Teacher: 404 LESSON_NOT_FOUND on all of it.
    for (const [what, method, url, body] of [
      ["archive", "POST", `/api/lessons/${lesson.id}/archive`, undefined],
      ["restore", "POST", `/api/lessons/${lesson.id}/restore`, undefined],
      ["delete", "DELETE", `/api/lessons/${lesson.id}`, { confirm: true }],
    ] as const) {
      const r = await call(method, url, otherToken, body);
      check(`another Teacher: ${what} → 404 LESSON_NOT_FOUND`, r.status === 404 && codeOf(r) === "LESSON_NOT_FOUND", errorOf(r));
    }
    check("another Teacher: the lesson is untouched", !(await prisma.lesson.findUnique({ where: { id: lesson.id } }))?.archivedAt);

    // "making": no Archive, no Delete.
    const making = await makeLesson("making", "making");
    const archMaking = await call("POST", `/api/lessons/${making.lesson.id}/archive`, token);
    check("archive: a lesson being made → 409 ALREADY_MAKING", archMaking.status === 409 && codeOf(archMaking) === "ALREADY_MAKING", errorOf(archMaking));
    const delMaking = await call("DELETE", `/api/lessons/${making.lesson.id}`, token);
    check("delete: a lesson being made → 409 ALREADY_MAKING", delMaking.status === 409 && codeOf(delMaking) === "ALREADY_MAKING", errorOf(delMaking));

    // What should stay the same through Archive, Restore and Delete forever.
    const topicKey = `${tag}-played topic`.toLowerCase();
    const studentState = async () => {
      const [student, levelRow, levels, progress] = await Promise.all([
        prisma.student.findUnique({ where: { id: s1.id }, select: { xp: true, stars: true } }),
        prisma.topicLevel.findUnique({ where: { studentId_topicKey: { studentId: s1.id, topicKey } }, select: { level: true } }),
        call("GET", `/api/students/${s1.id}/levels`, token),
        sectionProgress(teacher.id, section.id),
      ]);
      const topic = (levels.body.topics as any[] | undefined)?.find((t) => t.topic.toLowerCase() === topicKey);
      return {
        xp: student?.xp,
        stars: student?.stars,
        level: levelRow?.level,
        topicLevel: topic?.level,
        topicMastery: topic?.mastery,
        topicRounds: topic?.roundCount,
        studentMastery: levels.body.student?.mastery,
        sectionTopics: progress.topics.map((t) => [t.topic, t.percent, t.played]),
        progress,
      };
    };
    const before = await studentState();
    check("setup: the Student has XP, stars and a level for the topic", (before.xp ?? 0) > 0 && before.level !== undefined && before.topicRounds === 2);
    check("setup: the pack is in the Review packs", before.progress.packs.some((p) => p.assignmentId === pack.id));

    // ---------- Archive ----------
    const archived = await call("POST", `/api/lessons/${lesson.id}/archive`, token);
    check("archive: → 200 { ok: true }", archived.status === 200 && archived.body.ok === true, errorOf(archived));
    const firstArchivedAt = (await prisma.lesson.findUnique({ where: { id: lesson.id } }))?.archivedAt;
    const again = await call("POST", `/api/lessons/${lesson.id}/archive`, token);
    const secondArchivedAt = (await prisma.lesson.findUnique({ where: { id: lesson.id } }))?.archivedAt;
    check(
      "archive: archiving again answers OK and keeps the first archivedAt",
      again.status === 200 && again.body.ok === true && !!firstArchivedAt && firstArchivedAt.getTime() === secondArchivedAt?.getTime(),
      errorOf(again),
    );
    check("archive: not in GET /api/lessons", (await row("/api/lessons")) === undefined);
    const inArchived = await row("/api/lessons/archived");
    check(
      "archive: in GET /api/lessons/archived with archivedAt and playedBy 2",
      !!inArchived && typeof inArchived.archivedAt === "string" && inArchived.playedBy === 2 && inArchived.counts?.total === 3,
      JSON.stringify(inArchived && { archivedAt: typeof inArchived.archivedAt, playedBy: inArchived.playedBy }),
    );
    const otherArchived = await call("GET", "/api/lessons/archived", otherToken);
    check("archive: another Teacher's archived list doesn't have it", Array.isArray(otherArchived.body) && otherArchived.body.length === 0);

    const games = await studentGames(s1.id);
    check(
      "archive: the Student's games and Today's Mission don't show it",
      !games.lessons.some((l) => l.assignmentId === pack.id) && games.mission?.assignmentId !== pack.id,
    );
    const blocked = await play(s1.id, pack.id, qIds, 3).then(
      () => "saved",
      (err: { code?: string }) => err.code ?? "error",
    );
    check("archive: saving a round on it → GAME_NOT_FOUND", blocked === "GAME_NOT_FOUND", blocked);

    const archivedState = await studentState();
    check("archive: gone from the Review packs in Progress", !archivedState.progress.packs.some((p) => p.assignmentId === pack.id));
    const packsList = await call("GET", `/api/sections/${section.id}/assignments`, token);
    check(
      "archive: gone from GET /api/sections/:id/assignments",
      packsList.status === 200 && !(packsList.body as unknown as any[]).some((a) => a.id === pack.id),
      errorOf(packsList),
    );
    const putArchived = await call("PUT", `/api/sections/${section.id}/assignments/${lesson.id}`, token, {
      name: pack.name,
      games: ["quiz-show"],
      dueDate: "2026-12-10",
    });
    check("archive: changing its pack → 404 LESSON_NOT_FOUND", putArchived.status === 404 && codeOf(putArchived) === "LESSON_NOT_FOUND", errorOf(putArchived));
    const keep = (s: typeof before) => ({ ...s, progress: undefined });
    check(
      "archive: the Student's mastery, level, XP and stars for its topic are unchanged",
      same(keep(archivedState), keep(before)),
      JSON.stringify([keep(archivedState), keep(before)]),
    );
    check(
      "archive: questions, pack (same due date) and rounds are all kept",
      (await prisma.question.count({ where: { lessonId: lesson.id } })) === 3 &&
        (await prisma.assignment.findUnique({ where: { id: pack.id } }))?.dueDate?.getTime() === pack.dueDate?.getTime() &&
        (await prisma.gameRound.count({ where: { lessonId: lesson.id } })) === 3,
    );

    // ---------- Restore ----------
    const restored = await call("POST", `/api/lessons/${lesson.id}/restore`, token);
    check("restore: → 200 { ok: true }", restored.status === 200 && restored.body.ok === true, errorOf(restored));
    check("restore: back in GET /api/lessons with playedBy 2", (await row("/api/lessons"))?.playedBy === 2);
    check("restore: gone from /archived", (await row("/api/lessons/archived")) === undefined);
    const packBack = ((await call("GET", `/api/sections/${section.id}/assignments`, token)).body as unknown as any[]).find?.(
      (a) => a.id === pack.id,
    );
    check(
      "restore: the pack is back with the same name, games and due date",
      packBack?.name === pack.name && same(packBack?.games, ["quiz-show"]) && packBack?.dueDate === "2026-12-04",
      JSON.stringify(packBack && { games: packBack.games, dueDate: packBack.dueDate }),
    );
    check("restore: the Student's games show it again", (await studentGames(s1.id)).lessons.some((l) => l.assignmentId === pack.id));
    const restoredState = await studentState();
    check("restore: back in the Review packs", restoredState.progress.packs.some((p) => p.assignmentId === pack.id));

    // ---------- Delete forever ----------
    await call("POST", `/api/lessons/${lesson.id}/archive`, token);
    const noConfirm = await call("DELETE", `/api/lessons/${lesson.id}`, token);
    check(
      "delete forever: without confirm → 400 CONFIRM_NEEDED with the message",
      noConfirm.status === 400 && codeOf(noConfirm) === "CONFIRM_NEEDED" && noConfirm.body.error?.message === "Please tick the box to confirm.",
      errorOf(noConfirm),
    );
    const falseConfirm = await call("DELETE", `/api/lessons/${lesson.id}`, token, { confirm: false });
    check("delete forever: { confirm: false } → 400 CONFIRM_NEEDED", falseConfirm.status === 400 && codeOf(falseConfirm) === "CONFIRM_NEEDED", errorOf(falseConfirm));
    const xpBefore = await prisma.student.findMany({ where: { id: { in: [s1.id, s2.id] } }, select: { id: true, xp: true, stars: true }, orderBy: { id: "asc" } });
    const levelsBefore = await prisma.topicLevel.findMany({ where: { studentId: { in: [s1.id, s2.id] } }, select: { studentId: true, topicKey: true, level: true }, orderBy: [{ studentId: "asc" }, { topicKey: "asc" }] });
    const confirmed = await call("DELETE", `/api/lessons/${lesson.id}`, token, { confirm: true });
    const [lessonsLeft, questionsLeft, packsLeft, roundsLeft, answersLeft] = await Promise.all([
      prisma.lesson.count({ where: { id: lesson.id } }),
      prisma.question.count({ where: { lessonId: lesson.id } }),
      prisma.assignment.count({ where: { lessonId: lesson.id } }),
      prisma.gameRound.count({ where: { lessonId: lesson.id } }),
      prisma.roundAnswer.count({ where: { roundId: { in: roundIds } } }),
    ]);
    check(
      "delete forever: with confirm → 204, no Lesson, Question, Assignment, GameRound or RoundAnswer left",
      confirmed.status === 204 && lessonsLeft + questionsLeft + packsLeft + roundsLeft + answersLeft === 0,
      `${errorOf(confirmed)} ${JSON.stringify([lessonsLeft, questionsLeft, packsLeft, roundsLeft, answersLeft])}`,
    );
    const xpAfter = await prisma.student.findMany({ where: { id: { in: [s1.id, s2.id] } }, select: { id: true, xp: true, stars: true }, orderBy: { id: "asc" } });
    const levelsAfter = await prisma.topicLevel.findMany({ where: { studentId: { in: [s1.id, s2.id] } }, select: { studentId: true, topicKey: true, level: true }, orderBy: [{ studentId: "asc" }, { topicKey: "asc" }] });
    check("delete forever: the Students' xp and stars are unchanged", same(xpAfter, xpBefore) && xpAfter.length === 2);
    check("delete forever: TopicLevel is kept", same(levelsAfter, levelsBefore) && levelsAfter.length === 2);
    const gone = await call("POST", `/api/lessons/${lesson.id}/restore`, token);
    check("delete forever: the deleted lesson is not found any more → 404", gone.status === 404, errorOf(gone));
  } catch (err) {
    check("archive walkthrough ran without a crash", false, err instanceof Error ? err.name : "error");
  } finally {
    // Always clean up, even when a check failed. Students first (their rounds go with them).
    try {
      if (made.sectionId) await prisma.student.deleteMany({ where: { sectionId: made.sectionId } });
      if (made.teacherIds.length) await prisma.lesson.deleteMany({ where: { ownerId: { in: made.teacherIds } } });
      if (made.sectionId) await prisma.section.deleteMany({ where: { id: made.sectionId } });
      if (made.teacherIds.length) await prisma.teacher.deleteMany({ where: { id: { in: made.teacherIds } } });
      const left = await prisma.teacher.count({ where: { email: { startsWith: tag } } });
      check("clean-up: everything made by the walkthrough is deleted", left === 0);
    } catch {
      check("clean-up: everything made by the walkthrough is deleted", false, "look for rows starting with zz-test- in Prisma Studio");
    }
    server.close();
    await prisma.$disconnect();
  }
}

async function main() {
  pureChecks();
  await databaseWalkthrough();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
