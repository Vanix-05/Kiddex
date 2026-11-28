// `npm run test-reports`: checks the Teacher's reports (step 9). First the mastery rule
// (src/games/mastery.ts) and the Philippine week (phWeekDays), which need no database.
//
// When DATABASE_URL is set (backend/.env), it also walks through the reports on the real
// database: it makes a throwaway Teacher, section, 3 registered Students (one never
// plays) + 1 not registered, an approved lesson and a review pack with 2 games (names
// start with "zz-test-"), saves rounds with the same saveRound the real address uses,
// then checks the section's progress, My Students and a Student's page. It ALWAYS
// deletes what it made at the end, even when a check fails.
// Never prints a token, a School ID or the database address.
import path from "node:path";
import type { AddressInfo } from "node:net";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { needsHelp, overallMastery, stage, topicMastery, type MasteryAnswer } from "../games/mastery";
import { phWeekDays } from "../games/streak";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const R: MasteryAnswer = { right: true, helped: false };
const H: MasteryAnswer = { right: true, helped: true };
const W: MasteryAnswer = { right: false, helped: false };
const times = (n: number, a: MasteryAnswer) => Array.from({ length: n }, () => a);

// ---------- The mastery rule ----------

function pureChecks() {
  check("topicMastery: 7 answers → not enough yet (null)", same(topicMastery(times(7, R)), { percent: null, answers: 7 }));
  check(
    "topicMastery: 8 answers, 6 right → 75",
    same(topicMastery([...times(6, R), ...times(2, W)]), { percent: 75, answers: 8 }),
  );
  check(
    "topicMastery: 20 right + 5 older wrong → 100 (only the last 20 count), 25 answers in all",
    same(topicMastery([...times(20, R), ...times(5, W)]), { percent: 100, answers: 25 }),
  );
  check(
    "topicMastery: 4 right with Buddy Help out of 8 → 25 (help counts half)",
    same(topicMastery([...times(4, H), ...times(4, W)]), { percent: 25, answers: 8 }),
  );
  check("topicMastery: 0 answers → null", same(topicMastery([]), { percent: null, answers: 0 }));
  check(
    "topicMastery: the newest answers are the ones kept (5 newer wrong + 20 older right → 75)",
    topicMastery([...times(5, W), ...times(20, R)]).percent === 75,
  );

  check("needsHelp: one topic 45 and one 90 → true", needsHelp([{ percent: 45 }, { percent: 90 }]) === true);
  check("needsHelp: one topic null and one 60 → false", needsHelp([{ percent: null }, { percent: 60 }]) === false);
  check("needsHelp: exactly 50 is not under 50", needsHelp([{ percent: 50 }]) === false);
  check("overallMastery: average of the not-null ones, rounded", overallMastery([{ percent: 45 }, { percent: 90 }, { percent: null }]) === 68);
  check("overallMastery: none → null", overallMastery([{ percent: null }]) === null && overallMastery([]) === null);
  check(
    "stage: null 0, 49 1, 50 2, 69 2, 70 3",
    same([stage(null), stage(49), stage(50), stage(69), stage(70)], [0, 1, 2, 2, 3]),
  );

  // Sunday 23:30 PH = Sunday 15:30 UTC; Monday 00:30 PH = still Sunday 16:30 UTC.
  const sundayNight = phWeekDays(new Date("2026-11-29T15:30:00Z"));
  check(
    "phWeekDays: Sunday night PH time is still the week of Nov 23–29",
    sundayNight.length === 7 && sundayNight[0] === "2026-11-23" && sundayNight[6] === "2026-11-29",
    sundayNight.join(","),
  );
  const mondayMorning = phWeekDays(new Date("2026-11-29T16:30:00Z"));
  check(
    "phWeekDays: Monday 00:30 PH time (still Sunday in UTC) starts the new week Nov 30–Dec 6",
    mondayMorning[0] === "2026-11-30" && mondayMorning[6] === "2026-12-06",
    mondayMorning.join(","),
  );
  check(
    "phWeekDays: a Wednesday gives Monday to Sunday",
    same(phWeekDays(new Date("2026-11-25T02:00:00Z")), [
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]),
  );
}

// ---------- Database walkthrough ----------

type Reply = { status: number; body: Record<string, any> };

async function databaseWalkthrough() {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP  database walkthrough (DATABASE_URL is not set)");
    return;
  }
  // Loaded only now: these need the database settings (env.ts stops without them).
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { prisma } = require("../db/prisma") as typeof import("../db/prisma");
  const { app } = require("../app") as typeof import("../app");
  const { makeTeacherToken } = require("../auth/tokens") as typeof import("../auth/tokens");
  const { saveRound } = require("../store/gameStore") as typeof import("../store/gameStore");
  const { sectionProgress } = require("../store/reportStore") as typeof import("../store/reportStore");

  const tag = `zz-test-${randomBytes(4).toString("hex")}`;
  const made: { teacherId?: string; teacher2Id?: string; sectionId?: string; section2Id?: string; lessonId?: string } =
    {};
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (url: string, token: string): Promise<Reply> => {
    const res = await fetch(base + url, { headers: { Authorization: `Bearer ${token}` } });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  };

  try {
    const teacher = await prisma.teacher.create({
      data: { email: `${tag}@kiddex.test`, name: `${tag}-teacher`, passwordHash: "not-a-hash" },
    });
    made.teacherId = teacher.id;
    const section = await prisma.section.create({
      data: { teacherId: teacher.id, grade: 4, name: tag, nameKey: tag, color: "yellow", icon: "flower" },
    });
    made.sectionId = section.id;

    // School IDs in a known order: a < b < c < d.
    const start = randomInt(0, 900_000);
    const id = (n: number) => `99${String(start + n).padStart(6, "0")}`;
    const registered = { pinHash: "zz-test-not-a-real-hash", registeredAt: new Date("2026-11-10T02:00:00Z") };
    const a = await prisma.student.create({ data: { schoolId: id(1), sectionId: section.id, buddyName: "Mochi", ...registered } });
    const b = await prisma.student.create({ data: { schoolId: id(2), sectionId: section.id, buddyName: "Bantay", ...registered } });
    const c = await prisma.student.create({ data: { schoolId: id(3), sectionId: section.id, ...registered } });
    await prisma.student.create({ data: { schoolId: id(4), sectionId: section.id } }); // not registered: never counts

    const lesson = await prisma.lesson.create({
      data: {
        ownerId: teacher.id,
        topic: `${tag}-Fractions`,
        subject: "Math",
        grade: 4,
        games: ["quiz-show", "fill-blank"],
        fileName: `${tag}-lesson.pdf`,
        fileType: "pdf",
        sizeBytes: 1,
        unitLabel: "page",
        unitCount: 1,
        unitCountIsEstimate: false,
        wordCount: 100,
        textLevel: "ok",
        units: [],
        status: "approved",
        approvedAt: new Date(),
      },
    });
    made.lessonId = lesson.id;
    const q = { lessonId: lesson.id, subject: "Math", topic: "Equivalent Fractions", grade: 4, level: "easy" as const, status: "approved" as const };
    const mcs = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        prisma.question.create({
          data: { ...q, position: i + 1, type: "multiple_choice", prompt: `Q${i}?`, choices: ["1/2", "2/4"], answer: "1/2" },
        }),
      ),
    );
    const fills = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        prisma.question.create({
          data: { ...q, position: 20 + i, type: "fill_blank", prompt: `___ ${i}`, choices: ["a", "b"], answer: "a" },
        }),
      ),
    );
    const pack = await prisma.assignment.create({
      data: {
        lessonId: lesson.id,
        sectionId: section.id,
        name: `${tag}-pack`,
        games: ["quiz-show", "fill-blank"],
        dueDate: new Date("2026-11-20T04:00:00Z"),
      },
    });

    // The week of Mon Nov 16 – Sun Nov 22; "now" is Wednesday Nov 18, 10:00 PH time.
    const now = new Date("2026-11-18T02:00:00Z");
    // The server saves each round 1 minute after it ends (or at `savedAt`). createdAt is
    // set by the database to the real time, so it is moved to that moment afterwards.
    const play = async (
      studentId: string,
      game: "quiz-show" | "fill-blank",
      ids: string[],
      right: number,
      endedAt: string,
      savedAt?: string,
    ) => {
      const end = new Date(endedAt);
      const saved = savedAt ? new Date(savedAt) : new Date(end.getTime() + 60_000);
      const clientRoundId = randomUUID();
      await saveRound(
        studentId,
        {
          clientRoundId,
          assignmentId: pack.id,
          game,
          startedAt: new Date(end.getTime() - 60_000),
          endedAt: end,
          helpsUsed: 0,
          answers: ids.map((questionId, i) => ({ questionId, right: i < right, tries: 1, ms: 1000, helped: false })),
        },
        saved,
      );
      await prisma.gameRound.update({ where: { clientRoundId }, data: { createdAt: saved } });
    };
    const mcIds = mcs.map((m) => m.id);
    const fillIds = fills.map((f) => f.id);
    // A: both games, all right, Monday and Tuesday → 11 answers, 100%, pack done, 2 days.
    await play(a.id, "quiz-show", mcIds, 8, "2026-11-16T02:00:00Z");
    await play(a.id, "fill-blank", fillIds, 3, "2026-11-17T02:00:00Z");
    // B: Quiz Show only, 3 of 8 right, Wednesday → 38%, needs help, pack not done, 1 day.
    await play(b.id, "quiz-show", mcIds, 3, "2026-11-18T01:00:00Z");
    // C never plays.

    const p = await sectionProgress(teacher.id, section.id, now);
    check("progress: only the 3 registered Students count", p.registered === 3, `${p.registered}`);
    check("progress: played today (Wed) = 1, this week = 2", p.today.played === 1 && p.week.played === 2, JSON.stringify([p.today, p.week.played]));
    check("progress: the week is Mon Nov 16 – Sun Nov 22", p.week.from === "2026-11-16" && p.week.to === "2026-11-22");
    check(
      "progress: study days 0→1, 1→1, 2→1, 3 to 5 → 0",
      same(p.week.studyDays, [0, 1, 2, 3, 4, 5].map((days) => ({ days, count: days <= 2 ? 1 : 0 }))),
      JSON.stringify(p.week.studyDays),
    );
    check("progress: average study days (2+1+0)/3 = 1", p.week.studyDaysAverage === 1, `${p.week.studyDaysAverage}`);
    check(
      "progress: days Mon 1, Tue 1, Wed 1, Thu and Fri null (future), no weekend",
      same(
        p.week.days.map((d) => [d.weekday, d.count]),
        [["Mon", 1], ["Tue", 1], ["Wed", 1], ["Thu", null], ["Fri", null]],
      ),
      JSON.stringify(p.week.days),
    );
    const topic = p.topics[0];
    check(
      "progress: topic Equivalent Fractions = average of 100 and 38 → 69, 1 needs help, 2 played",
      p.topics.length === 1 && topic?.topic === "Equivalent Fractions" && topic.percent === 69 && topic.needHelp === 1 && topic.played === 2,
      JSON.stringify(p.topics),
    );
    check("progress: topic lesson = the pack's name", topic?.lesson === `${tag}-pack`);
    check("progress: section mastery 69, 1 needs help", p.mastery === 69 && p.needHelpCount === 1, `${p.mastery} ${p.needHelpCount}`);
    check(
      "progress: needHelp = B with their weakest topic at 38",
      p.needHelp.length === 1 && p.needHelp[0]?.studentId === b.id && p.needHelp[0].percent === 38 && p.needHelp[0].buddyName === "Bantay",
      JSON.stringify(p.needHelp.map((n) => n.percent)),
    );
    const pk = p.packs[0];
    check(
      "progress: the pack: 2 playable games, due 2026-11-20, 1 done, B and C not done (School ID order)",
      p.packs.length === 1 &&
        same(pk?.games, ["quiz-show", "fill-blank"]) &&
        pk?.dueDate === "2026-11-20" &&
        pk.done === 1 &&
        same(pk.notDone.map((n) => n.studentId), [b.id, c.id]),
      JSON.stringify(pk && { ...pk, notDone: pk.notDone.length }),
    );
    check("progress: neverPlayed = C only", same(p.neverPlayed.map((n) => n.studentId), [c.id]));
    check(
      "progress: no question text in the answer",
      !JSON.stringify(p).includes("Q0?") && !JSON.stringify(p).includes("1/2"),
    );

    const token = makeTeacherToken({ id: teacher.id, tokenVersion: 0 });
    const http = await call(`/api/sections/${section.id}/progress`, token);
    check("progress address: 200 for the section's Teacher", http.status === 200 && http.body.registered === 3, `status ${http.status}`);

    // Another Teacher: 404, same as a section that doesn't exist.
    const teacher2 = await prisma.teacher.create({
      data: { email: `${tag}-2@kiddex.test`, name: `${tag}-teacher-2`, passwordHash: "not-a-hash" },
    });
    made.teacher2Id = teacher2.id;
    const token2 = makeTeacherToken({ id: teacher2.id, tokenVersion: 0 });
    const notMine = await call(`/api/sections/${section.id}/progress`, token2);
    check(
      "progress address: another Teacher → 404 SECTION_NOT_FOUND",
      notMine.status === 404 && notMine.body.error?.code === "SECTION_NOT_FOUND",
      `status ${notMine.status}`,
    );

    // My Students: mastery + needsHelp.
    const list = await call(`/api/sections/${section.id}/students`, token);
    const row = (sid: string) => (list.body as any[]).find?.((s: any) => s.id === sid);
    check(
      "My Students: A 100 not needing help, B 38 needs help, C null",
      list.status === 200 &&
        row(a.id)?.mastery === 100 &&
        row(a.id)?.needsHelp === false &&
        row(b.id)?.mastery === 38 &&
        row(b.id)?.needsHelp === true &&
        row(c.id)?.mastery === null,
      `status ${list.status}`,
    );

    // A Student's page.
    const lv = await call(`/api/students/${a.id}/levels`, token);
    const s = lv.body.student ?? {};
    check(
      "Student page: level, XP, stars, mastery 100, pack 1 of 1",
      lv.status === 200 &&
        typeof s.level === "number" &&
        s.xp > 0 &&
        s.xpGoal === 300 &&
        typeof s.stars === "number" &&
        s.mastery === 100 &&
        s.needsHelp === false &&
        s.packsDone === 1 &&
        s.packsTotal === 1 &&
        typeof s.studyDaysThisWeek === "number",
      JSON.stringify({ ...s, id: undefined, schoolId: undefined }),
    );
    check(
      "Student page: the topic's mastery is 100 from 11 answers, level path kept",
      same(lv.body.topics?.[0]?.mastery, { percent: 100, answers: 11 }) && lv.body.topics?.[0]?.rounds?.length === 2,
      JSON.stringify(lv.body.topics?.[0]?.mastery),
    );
    const lvB = await call(`/api/students/${b.id}/levels`, token);
    check(
      "Student page: B needs help, pack 0 of 1",
      lvB.body.student?.needsHelp === true && lvB.body.student?.packsDone === 0 && lvB.body.student?.packsTotal === 1,
    );
    const lvNotMine = await call(`/api/students/${a.id}/levels`, token2);
    check("Student page: another Teacher → 404", lvNotMine.status === 404, `status ${lvNotMine.status}`);

    // Near midnight: B ends a round Wed 23:59 PH (browser clock), the server saves it
    // Thu 00:01 PH. It counts for Thursday, like the streak.
    await play(b.id, "fill-blank", fillIds, 0, "2026-11-18T15:59:00Z", "2026-11-18T16:01:00Z");
    const thursday = new Date("2026-11-19T02:00:00Z");
    const p2 = await sectionProgress(teacher.id, section.id, thursday);
    check(
      "progress: a round ended 23:59 but saved 00:01 counts for the next day (server time, like the streak)",
      same(p2.week.days.map((d) => [d.weekday, d.count]), [["Mon", 1], ["Tue", 1], ["Wed", 1], ["Thu", 1], ["Fri", null]]) &&
        p2.today.played === 1,
      JSON.stringify(p2.week.days),
    );

    // New code: A's PIN code is removed (waiting to make a new one). A still counts.
    await prisma.student.update({ where: { id: a.id }, data: { pinHash: null } });
    const p3 = await sectionProgress(teacher.id, section.id, thursday);
    check(
      "progress: a Student who got a New code still counts (registered 3, pack done by A and B)",
      p3.registered === 3 && p3.packs[0]?.done === 2 && p3.week.played === 2,
      JSON.stringify([p3.registered, p3.packs[0]?.done, p3.week.played]),
    );

    // ---------- On time and late (due 2026-11-20) ----------
    // A finished Tue Nov 17, B Wed Nov 18 23:59 PH (the round saved 00:01 Thu still has
    // endedAt on Wed). C finishes both games Sat Nov 21: after the due day → late.
    await play(c.id, "quiz-show", mcIds, 8, "2026-11-21T01:00:00Z");
    await play(c.id, "fill-blank", fillIds, 3, "2026-11-21T02:00:00Z");
    const packOf = async () => (await sectionProgress(teacher.id, section.id, thursday)).packs[0]!;
    const counts = (k: Awaited<ReturnType<typeof packOf>>) =>
      JSON.stringify({ done: k.done, onTime: k.onTime, late: k.late, notDone: k.notDone.length, doneLate: k.doneLate.length });
    const late1 = await packOf();
    check(
      "late: C done after the due day → late 1 and doneLate = C; A and B on time",
      late1.done === 3 && late1.onTime === 2 && late1.late === 1 && same(late1.doneLate.map((d) => d.studentId), [c.id]) && late1.notDone.length === 0,
      counts(late1),
    );
    check("late: doneLate is shown like notDone (2026-0144 style)", /^\d{4}-\d{4}$/.test(late1.doneLate[0]?.schoolId ?? ""));

    // Changing the due date uses the existing PUT with the pack's same name and games.
    const put = async (dueDate: string | null) => {
      const res = await fetch(`${base}/api/sections/${section.id}/assignments/${lesson.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${tag}-pack`, games: ["quiz-show", "fill-blank"], dueDate }),
      });
      return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
    };

    // Due Wed Nov 18: B finished at 23:59 PH that same day → on time; A (Nov 17) on time; C late.
    const dueDay = await put("2026-11-18");
    const late2 = await packOf();
    check(
      "late: a pack done on the due day (23:59 PH) counts as on time",
      dueDay.status === 200 && late2.dueDate === "2026-11-18" && late2.onTime === 2 && late2.late === 1 && same(late2.doneLate.map((d) => d.studentId), [c.id]),
      `${dueDay.status} ${counts(late2)}`,
    );

    // Due Wed Nov 25: the same C is now on time (worked out when read, never saved).
    const later = await put("2026-11-25");
    const late3 = await packOf();
    check(
      "late: after moving the due date later, C is on time (late 0, doneLate empty)",
      later.status === 200 && later.body.assignment?.dueDate === "2026-11-25" && late3.onTime === 3 && late3.late === 0 && late3.doneLate.length === 0,
      `${later.status} ${counts(late3)}`,
    );

    // "No due date": null is saved as no due date and comes back as null; everyone is on time.
    const noDue = await put(null);
    const savedDue = (await prisma.assignment.findUnique({ where: { id: pack.id }, select: { dueDate: true } }))?.dueDate;
    const late4 = await packOf();
    check(
      "due date: null is saved as no due date and comes back as null",
      noDue.status === 200 && noDue.body.assignment?.dueDate === null && savedDue === null && late4.dueDate === null,
      `${noDue.status}`,
    );
    check("late: a pack with no due date is always on time", late4.onTime === 3 && late4.late === 0, counts(late4));
  } catch (err) {
    check("database walkthrough ran without a crash", false, err instanceof Error ? err.name : "error");
  } finally {
    // Always clean up, even when a check failed. Students first (their rounds go with them).
    try {
      if (made.sectionId) await prisma.student.deleteMany({ where: { sectionId: made.sectionId } });
      if (made.lessonId) await prisma.lesson.deleteMany({ where: { id: made.lessonId } });
      if (made.sectionId) await prisma.section.deleteMany({ where: { id: made.sectionId } });
      if (made.teacherId) await prisma.teacher.deleteMany({ where: { id: made.teacherId } });
      if (made.teacher2Id) await prisma.teacher.deleteMany({ where: { id: made.teacher2Id } });
      const left = await prisma.teacher.count({ where: { email: { startsWith: tag } } });
      check("clean-up: everything made by the test is deleted", left === 0);
    } catch {
      check("clean-up: everything made by the test is deleted", false, "look for rows starting with zz-test- in Prisma Studio");
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
