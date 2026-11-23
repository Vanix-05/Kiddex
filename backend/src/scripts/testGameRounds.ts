// `npm run test-game-rounds`: checks the game rules in src/games/ (difficulty copy,
// XP, stars, levels, streak in Philippine time, mission choice, chalkboard) and prints
// PASS or FAIL for each. These need no database.
//
// When DATABASE_URL is set (backend/.env), it also walks through the two Student
// addresses on the real app: it makes a throwaway Teacher, section, 2 Students, an
// approved lesson with questions and an assignment (names start with "zz-test-"), and
// ALWAYS deletes them at the end, even when a check fails.
// Never prints a token, a School ID or the database address.
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { makeBoard, type BoardQuestion } from "../games/board";
import { decideAfterRound, stepLevel, type Answer, type Level } from "../games/difficulty";
import { pickMission, type MissionCandidate } from "../games/mission";
import { levelFromXp, missionMaxXp, ROUND_SIZE, starsEarned, starsFor, xpFor } from "../games/rewards";
import { nextStreak, phDay } from "../games/streak";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const R = true;
const W = false;
const ok = { right: true, helped: false };
const helped = { right: true, helped: true };
const miss = { right: false, helped: false };

// ---------- Difficulty (copy of the frontend's end-of-round rule) ----------

const DIFFICULTY_CASES: { name: string; answers: Answer[]; start: Level; want: object }[] = [
  {
    name: "8/8 from easy → medium, up",
    answers: [R, R, R, R, R, R, R, R],
    start: "easy",
    want: { level: "medium", change: "up", reason: "8 of 8 right (100%)" },
  },
  {
    name: "6/8 from easy → keep (75%)",
    answers: [R, R, R, R, R, R, W, W],
    start: "easy",
    want: { level: "easy", change: "keep", reason: "6 of 8 right (75%)" },
  },
  {
    name: "3/8 from medium → easy, down",
    answers: [R, R, R, W, W, W, W, W],
    start: "medium",
    want: { level: "easy", change: "down", reason: "3 of 8 right (38%)" },
  },
  {
    name: "7/8 with 2 helped counts as 5/8 → keep",
    answers: [ok, ok, ok, ok, ok, helped, helped, miss],
    start: "easy",
    want: { level: "easy", change: "keep", reason: "5 of 8 right (63%)" },
  },
  {
    name: "8 right with 2 helped = 6/8 → keep (the frontend's own test)",
    answers: [ok, ok, ok, ok, ok, ok, helped, helped],
    start: "easy",
    want: { level: "easy", change: "keep", reason: "6 of 8 right (75%)" },
  },
  {
    name: "never below easy",
    answers: [W, W, W, W, W, W, W, W],
    start: "easy",
    want: { level: "easy", change: "keep", reason: "0 of 8 right (0%), already the easiest level" },
  },
  {
    name: "never above hard",
    answers: [R, R, R, R, R, R, R, R],
    start: "hard",
    want: { level: "hard", change: "keep", reason: "8 of 8 right (100%), already the hardest level" },
  },
];

function difficultyChecks() {
  for (const c of DIFFICULTY_CASES) {
    const got = decideAfterRound(c.answers, c.start);
    check(`difficulty: ${c.name}`, same(got, c.want), JSON.stringify(got));
  }
  check(
    "difficulty: stepLevel stays inside easy..hard",
    stepLevel("easy", "down") === "easy" && stepLevel("hard", "up") === "hard",
  );

  // The same answers through the frontend's own file, when it is next to the backend.
  const frontendFile = path.resolve(__dirname, "../../../frontend/src/games/difficulty.ts");
  if (!fs.existsSync(frontendFile)) {
    console.log("SKIP  difficulty vs frontend (no frontend folder next to the backend)");
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const frontend = require(frontendFile) as { decideAfterRound: typeof decideAfterRound };
    const differ = DIFFICULTY_CASES.filter(
      (c) => !same(frontend.decideAfterRound(c.answers, c.start), decideAfterRound(c.answers, c.start)),
    );
    check(
      "difficulty: same decisions as frontend/src/games/difficulty.ts",
      differ.length === 0,
      differ.map((c) => c.name).join("; "),
    );
  } catch {
    console.log("SKIP  difficulty vs frontend (could not load the frontend file)");
  }
}

// ---------- XP, stars, levels ----------

function rewardChecks() {
  check("xp: 8 right → 50", xpFor(8) === 50 && xpFor(8, 0) === 50);
  // "7 right with 1 helped" = 7 on their own + 1 helped = 8 right, 1 of them helped: 35 + 2 + 10.
  check("xp: 7 right + 1 helped right → 47", xpFor(8, 1) === 47);
  check("xp: 7 right, 1 of them helped → 42", xpFor(7, 1) === 42);
  check("stars: perfect 3, 75% 2, else 1", starsFor(8, 8) === 3 && starsFor(6, 8) === 2 && starsFor(5, 8) === 1);

  let best = 0;
  const earned = [2, 2, 3].map((stars) => {
    const e = starsEarned(stars, best);
    best = Math.max(best, stars);
    return e;
  });
  check("stars rule: 2★ then 2★ then 3★ earns +2, +0, +1", same(earned, [2, 0, 1]), earned.join());
  check("stars rule: a worse round earns 0, never minus", starsEarned(1, 3) === 0);

  check("level: 0 XP is level 1", same(levelFromXp(0), { level: 1, xpIntoLevel: 0, xpGoal: 300 }));
  check("level: 340 XP is level 2, 40 into it", same(levelFromXp(340), { level: 2, xpIntoLevel: 40, xpGoal: 300 }));
  check(
    "mission max XP: Quiz Show (12 cards) + Match Up (4 pairs) = 50 + 30",
    missionMaxXp([
      { game: "quiz-show", cards: 12 },
      { game: "match-up", cards: 4 },
    ]) === 80,
  );

  // ROUND_SIZE must match GAMES in frontend/src/games/session.ts.
  const sessionFile = path.resolve(__dirname, "../../../frontend/src/games/session.ts");
  if (!fs.existsSync(sessionFile)) {
    console.log("SKIP  ROUND_SIZE vs frontend (no frontend folder next to the backend)");
    return;
  }
  const session = fs.readFileSync(sessionFile, "utf8");
  const sizes = Object.fromEntries(
    [...session.matchAll(/'([a-z-]+)': \{[^}]*roundSize: (\d+)/g)].map((m) => [m[1], Number(m[2])]),
  );
  check("ROUND_SIZE: same as frontend GAMES", same(sizes, ROUND_SIZE), JSON.stringify(sizes));
  check("xpFor: same formula as frontend", session.includes("(right - helpedRight) * 5 + helpedRight * 2 + 10"));
}

// ---------- Streak (Philippine time) ----------

function streakChecks() {
  check("phDay: 2026-11-23 15:59 UTC is still 2026-11-23", phDay(new Date("2026-11-23T15:59:00Z")) === "2026-11-23");
  check("phDay: 2026-11-23 16:00 UTC is 2026-11-24", phDay(new Date("2026-11-23T16:00:00Z")) === "2026-11-24");
  check(
    "streak: same day stays the same",
    same(nextStreak("2026-11-23", 3, "2026-11-23"), { streakDays: 3, lastPlayDay: "2026-11-23" }),
  );
  check(
    "streak: yesterday → +1",
    same(nextStreak("2026-11-22", 3, "2026-11-23"), { streakDays: 4, lastPlayDay: "2026-11-23" }),
  );
  check("streak: yesterday across a month end → +1", nextStreak("2026-11-30", 5, "2026-12-01").streakDays === 6);
  check(
    "streak: a 2-day gap starts again at 1",
    same(nextStreak("2026-11-21", 3, "2026-11-23"), { streakDays: 1, lastPlayDay: "2026-11-23" }),
  );
  check(
    "streak: never played → 1",
    same(nextStreak(null, 0, "2026-11-23"), { streakDays: 1, lastPlayDay: "2026-11-23" }),
  );
}

// ---------- Mission ----------

function missionChecks() {
  const today = "2026-11-23";
  const at = (iso: string) => new Date(iso);
  const a = (id: string, extra: Partial<MissionCandidate>): MissionCandidate => ({
    assignmentId: id,
    dueDate: null,
    createdAt: at("2026-11-20T00:00:00Z"),
    games: ["quiz-show", "match-up"],
    done: [],
    lastDoneAt: null,
    ...extra,
  });

  const soonest = pickMission(
    [
      a("later", { dueDate: at("2026-11-30T04:00:00Z"), createdAt: at("2026-11-22T00:00:00Z") }),
      a("soon", { dueDate: at("2026-11-25T04:00:00Z") }),
      a("none", { createdAt: at("2026-11-23T00:00:00Z") }),
    ],
    today,
  );
  check("mission: the soonest due date wins", soonest?.assignmentId === "soon" && soonest.state === "open");

  const noDue = pickMission(
    [a("none", { createdAt: at("2026-11-23T00:00:00Z") }), a("due", { dueDate: at("2026-12-20T04:00:00Z") })],
    today,
  );
  check("mission: no due date goes last", noDue?.assignmentId === "due");

  const tie = pickMission(
    [
      a("old", { dueDate: at("2026-11-25T04:00:00Z"), createdAt: at("2026-11-18T00:00:00Z") }),
      a("new", { dueDate: at("2026-11-25T04:00:00Z"), createdAt: at("2026-11-21T00:00:00Z") }),
    ],
    today,
  );
  check("mission: a tie goes to the newest", tie?.assignmentId === "new");

  const overdue = pickMission([a("overdue", { dueDate: at("2026-11-10T04:00:00Z") })], today);
  check(
    "mission: an overdue one still counts as open",
    overdue?.assignmentId === "overdue" && overdue.state === "open",
  );

  const allDone = { done: ["quiz-show", "match-up"] as const };
  const doneToday = pickMission([a("x", { ...allDone, lastDoneAt: at("2026-11-23T01:00:00Z") })], today);
  check("mission: all done today → complete", doneToday?.assignmentId === "x" && doneToday.state === "complete");

  // 2026-11-22 15:00 UTC is 23:00 on the 22nd in the Philippines: yesterday.
  const doneYesterday = pickMission([a("x", { ...allDone, lastDoneAt: at("2026-11-22T15:00:00Z") })], today);
  check("mission: all done yesterday → none", doneYesterday === null);

  const halfDone = pickMission([a("x", { done: ["quiz-show"], lastDoneAt: at("2026-11-23T01:00:00Z") })], today);
  check("mission: one game left → still open", halfDone?.state === "open");
  check("mission: no assignments → none", pickMission([], today) === null);
}

// ---------- Chalkboard ----------

function boardChecks() {
  const pair = (n: number): BoardQuestion => ({ type: "matching_pair", prompt: `Word ${n}`, answer: `meaning ${n}` });
  const blank = (n: number): BoardQuestion => ({
    type: "fill_blank",
    prompt: `Idea ${n} has ___ in it.`,
    answer: `word${n}`,
  });
  const mc: BoardQuestion = { type: "multiple_choice", prompt: "Which?", answer: "This" };

  const words = makeBoard([mc, pair(1), blank(1), pair(2), pair(3), pair(4), pair(5)]);
  check(
    "board: pairs → key words, at most 4, in order",
    words.keyWords.length === 4 &&
      words.keyWords[0]?.word === "Word 1" &&
      words.keyWords[0]?.text === "meaning 1" &&
      words.keyIdeas.length === 0,
  );

  const ideas = makeBoard([mc, blank(1), blank(2), blank(3), blank(4)]);
  check(
    "board: no pairs → key ideas split at ___, at most 3",
    ideas.keyWords.length === 0 &&
      ideas.keyIdeas.length === 3 &&
      same(ideas.keyIdeas[0], { before: "Idea 1 has ", answer: "word1", after: " in it." }),
    JSON.stringify(ideas.keyIdeas[0]),
  );
  check("board: none → both empty", same(makeBoard([mc]), { keyWords: [], keyIdeas: [] }));
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
  const { makeStudentToken } = require("../auth/tokens") as typeof import("../auth/tokens");

  const tag = `zz-test-${randomBytes(4).toString("hex")}`;
  const made: { teacherId?: string; sectionId?: string; lessonId?: string } = {};
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const call = async (method: string, url: string, token: string, body?: unknown): Promise<Reply> => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(base + url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  };
  const code = (r: Reply) => r.body.error?.code ?? "";

  try {
    const teacher = await prisma.teacher.create({
      data: { email: `${tag}@kiddex.test`, name: `${tag}-teacher`, passwordHash: "not-a-hash" },
    });
    made.teacherId = teacher.id;
    const section = await prisma.section.create({
      data: { teacherId: teacher.id, grade: 4, name: tag, nameKey: tag, color: "yellow", icon: "flower" },
    });
    made.sectionId = section.id;
    const schoolId = () => `99${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    const student = await prisma.student.create({ data: { schoolId: schoolId(), sectionId: section.id } });
    const other = await prisma.student.create({ data: { schoolId: schoolId(), sectionId: section.id } });

    const lesson = await prisma.lesson.create({
      data: {
        ownerId: teacher.id,
        topic: `${tag}-Fractions`,
        subject: "Math",
        grade: 4,
        games: ["quiz-show", "match-up"],
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
    const base4 = { lessonId: lesson.id, subject: "Math", topic: "Equivalent Fractions", grade: 4 };
    const mcs = await Promise.all(
      [0, 1, 2, 3].map((i) =>
        prisma.question.create({
          data: {
            ...base4,
            position: i + 1,
            type: "multiple_choice",
            prompt: `Q${i}?`,
            choices: ["1/2", "2/4", "3/4"],
            answer: "1/2",
            level: "easy",
            status: "approved",
          },
        }),
      ),
    );
    const draft = await prisma.question.create({
      data: {
        ...base4,
        position: 5,
        type: "multiple_choice",
        prompt: "Draft?",
        choices: ["a", "b"],
        answer: "a",
        level: "easy",
        status: "draft",
      },
    });
    await Promise.all(
      [0, 1].map((i) =>
        prisma.question.create({
          data: {
            ...base4,
            position: 6 + i,
            type: "matching_pair",
            prompt: `Term ${i}`,
            choices: [],
            answer: `Meaning ${i}`,
            level: "easy",
            status: "approved",
          },
        }),
      ),
    );
    const assignment = await prisma.assignment.create({
      data: { lessonId: lesson.id, sectionId: section.id, name: `${tag}-pack`, games: ["quiz-show"], dueDate: null },
    });

    const token = makeStudentToken({ id: student.id, tokenVersion: 0 });
    const otherToken = makeStudentToken({ id: other.id, tokenVersion: 0 });

    // GET before playing.
    const g1 = await call("GET", "/api/student/games", token);
    const l1 = g1.body.lessons?.[0];
    check(
      "games: 200 with the one assigned lesson",
      g1.status === 200 && g1.body.lessons?.length === 1,
      `status ${g1.status}`,
    );
    check(
      "games: lesson title, teacher and pack name",
      l1?.lessonTitle === `${tag}-Fractions` && l1?.teacher === `${tag}-teacher` && l1?.name === `${tag}-pack`,
    );
    check(
      "games: only the 4 approved Quiz Show cards (no draft, no pairs)",
      l1?.cards?.length === 4 && l1.cards.every((c: any) => c.type === "multiple_choice" && c.status === "approved"),
    );
    check(
      "games: cards have no sourceQuote or flag",
      l1?.cards?.every((c: any) => !("sourceQuote" in c) && !("flag" in c)),
    );
    check(
      "games: progress starts at 0, level 1",
      same(g1.body.progress, { xp: 0, level: 1, xpIntoLevel: 0, xpGoal: 300, stars: 0, streakDays: 0 }),
      JSON.stringify(g1.body.progress),
    );
    check(
      "games: mission is open with Quiz Show",
      g1.body.mission?.state === "open" &&
        same(g1.body.mission?.games, ["quiz-show"]) &&
        same(g1.body.mission?.done, []),
    );
    check("games: mission max XP is 4 × 5 + 10 = 30", g1.body.mission?.maxXp === 30);
    check("games: the board shows the pairs as key words", g1.body.mission?.board?.keyWords?.[0]?.word === "Term 0");

    // Save a round: 4 of 4 right.
    const round = (questionIds: string[], extra: Record<string, unknown> = {}) => ({
      clientRoundId: randomUUID(),
      assignmentId: assignment.id,
      game: "quiz-show",
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      endedAt: new Date().toISOString(),
      helpsUsed: 0,
      answers: questionIds.map((questionId) => ({ questionId, right: true, tries: 1, ms: 4000, helped: false })),
      ...extra,
    });
    const first = round(mcs.map((q) => q.id));
    const s1 = await call("POST", "/api/student/rounds", token, first);
    check("round: saved (200)", s1.status === 200, `status ${s1.status} ${code(s1)}`);
    check(
      "round: 4 right → 30 XP, 3★, +3 stars",
      s1.body.round?.xp === 30 && s1.body.round?.stars === 3 && s1.body.round?.starsEarned === 3,
    );
    check(
      "round: easy → medium (up)",
      same(s1.body.round?.decision, { level: "medium", change: "up", reason: "4 of 4 right (100%)" }),
      JSON.stringify(s1.body.round?.decision),
    );
    check(
      "round: counts for the mission, Quiz Show done",
      s1.body.round?.countsForMission === true && same(s1.body.round?.missionDone, ["quiz-show"]),
    );
    check("round: the streak becomes 1", s1.body.progress?.streakDays === 1 && s1.body.progress?.xp === 30);

    // The same round again (lost connection).
    const s2 = await call("POST", "/api/student/rounds", token, first);
    check("round again: the same answer", s2.status === 200 && same(s2.body, s1.body), `status ${s2.status}`);
    const g2 = await call("GET", "/api/student/games", token);
    check("round again: no XP added", g2.body.progress?.xp === 30);
    const savedCount = await prisma.gameRound.count({ where: { studentId: student.id } });
    check("round again: saved only once", savedCount === 1, `${savedCount} rounds`);

    // Another Student sends the same round id.
    const s3 = await call("POST", "/api/student/rounds", otherToken, first);
    check(
      "round id of another Student → 409 ROUND_TAKEN",
      s3.status === 409 && code(s3) === "ROUND_TAKEN",
      `status ${s3.status} ${code(s3)}`,
    );

    // A game that is not in the assignment.
    const s4 = await call(
      "POST",
      "/api/student/rounds",
      token,
      round(
        mcs.map((q) => q.id),
        { game: "match-up" },
      ),
    );
    check(
      "wrong game → 404 GAME_NOT_FOUND",
      s4.status === 404 && code(s4) === "GAME_NOT_FOUND",
      `status ${s4.status} ${code(s4)}`,
    );

    // A draft question.
    const s5 = await call("POST", "/api/student/rounds", token, round([mcs[0]!.id, draft.id]));
    check(
      "draft question → 400 BAD_ROUND",
      s5.status === 400 && code(s5) === "BAD_ROUND",
      `status ${s5.status} ${code(s5)}`,
    );
    const s6 = await call("POST", "/api/student/rounds", token, { ...round([mcs[0]!.id]), xp: 9999 });
    check("an extra field (xp) → 400 BAD_ROUND", s6.status === 400 && code(s6) === "BAD_ROUND");
    const s7 = await call("POST", "/api/student/rounds", token, round([mcs[0]!.id, mcs[0]!.id]));
    check("the same question twice → 400 BAD_ROUND", s7.status === 400 && code(s7) === "BAD_ROUND");

    // A second, worse round: no new stars, not the mission's round.
    const worse = round(mcs.map((q) => q.id));
    (worse.answers as { right: boolean }[])[3]!.right = false;
    const s8 = await call("POST", "/api/student/rounds", token, worse);
    check(
      "second round 3/4: 2★, +0 stars, not for the mission",
      s8.body.round?.stars === 2 && s8.body.round?.starsEarned === 0 && s8.body.round?.countsForMission === false,
    );
    check(
      "second round: started from medium (75% keeps it)",
      s8.body.round?.decision?.level === "medium" && s8.body.round?.decision?.change === "keep",
    );

    // GET after playing.
    const g3 = await call("GET", "/api/student/games", token);
    const quiz = g3.body.lessons?.[0]?.games?.[0];
    check(
      "games: mission is complete today with Quiz Show done",
      g3.body.mission?.state === "complete" && same(g3.body.mission?.done, ["quiz-show"]),
    );
    check("games: Quiz Show done with best 3★", quiz?.done === true && quiz?.bestStars === 3);
    check(
      "games: the topic level is saved (lowercase key)",
      same(g3.body.levels, { "equivalent fractions": "medium" }),
      JSON.stringify(g3.body.levels),
    );
    check(
      "games: progress 30 + 25 XP, 3 stars, streak 1",
      g3.body.progress?.xp === 55 && g3.body.progress?.stars === 3 && g3.body.progress?.streakDays === 1,
      JSON.stringify(g3.body.progress),
    );

    // Answers are saved with the question's own level.
    const answers = await prisma.roundAnswer.findMany({
      where: { round: { studentId: student.id } },
      select: { level: true, position: true },
    });
    check(
      "answers: 8 saved, level from the question",
      answers.length === 8 && answers.every((a) => a.level === "easy"),
    );
  } catch (err) {
    check("database walkthrough ran without a crash", false, err instanceof Error ? err.name : "error");
  } finally {
    // Always clean up, even when a check failed. Students first (their rounds go with them).
    try {
      if (made.sectionId) await prisma.student.deleteMany({ where: { sectionId: made.sectionId } });
      if (made.lessonId) await prisma.lesson.deleteMany({ where: { id: made.lessonId } });
      if (made.sectionId) await prisma.section.deleteMany({ where: { id: made.sectionId } });
      if (made.teacherId) await prisma.teacher.deleteMany({ where: { id: made.teacherId } });
      const left = await prisma.teacher.count({ where: { email: { startsWith: tag } } });
      check("clean-up: everything made by the test is deleted", left === 0);
    } catch {
      check(
        "clean-up: everything made by the test is deleted",
        false,
        "look for rows starting with zz-test- in Prisma Studio",
      );
    }
    server.close();
    await prisma.$disconnect();
  }
}

async function main() {
  difficultyChecks();
  rewardChecks();
  streakChecks();
  missionChecks();
  boardChecks();
  await databaseWalkthrough();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
