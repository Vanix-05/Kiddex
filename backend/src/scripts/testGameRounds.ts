// `npm run test-game-rounds`: checks the game rules in src/games/ (difficulty copy,
// XP, stars, levels, streak in Philippine time, mission choice, chalkboard, the Teacher's
// level path) and prints
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
import { applyPlan, makePlan, NO_OPTIONS, type CleanupOptions } from "../cleanup/cleanup";
import { makeBoard, type BoardQuestion } from "../games/board";
import { decideAfterFour, decideAfterRound, stepLevel, type Answer, type Level } from "../games/difficulty";
import { countChanges, groupByTopic, roundChecks, shownRounds } from "../games/levelPath";
import { pickMission, type MissionCandidate } from "../games/mission";
import { levelFromXp, missionMaxXp, ROUND_SIZE, starsEarned, starsFor, xpFor } from "../games/rewards";
import { nextStreak, phDay, shownStreak } from "../games/streak";

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
    const frontend = require(frontendFile) as {
      decideAfterRound: typeof decideAfterRound;
      decideAfterFour: typeof decideAfterFour;
    };
    const differ = DIFFICULTY_CASES.filter(
      (c) => !same(frontend.decideAfterRound(c.answers, c.start), decideAfterRound(c.answers, c.start)),
    );
    check(
      "difficulty: same decisions as frontend/src/games/difficulty.ts",
      differ.length === 0,
      differ.map((c) => c.name).join("; "),
    );
    const fours: [Answer[], Level][] = [
      [[R, R, R, W], "medium"],
      [[R, W, W, W], "easy"],
      [[R, R, W, W], "medium"],
      [[R, R, R, R], "hard"],
      [[ok, ok, helped, helped], "medium"],
    ];
    check(
      "difficulty: decideAfterFour same as the frontend",
      fours.every(([a, l]) => same(frontend.decideAfterFour(a, l), decideAfterFour(a, l))),
    );
  } catch {
    console.log("SKIP  difficulty vs frontend (could not load the frontend file)");
  }
}

// ---------- The Teacher's level path (step 8) ----------

function levelPathChecks() {
  const at = (rights: (boolean | "h")[]) =>
    rights.map((r, position) => ({ position, right: r !== false, helped: r === "h" }));

  const two = roundChecks("quiz-show", "medium", at([R, R, R, R, R, W, R, R]));
  check(
    "levelPath: 4 right then 3 right from medium → hard, then keep at hard",
    two.length === 2 &&
      two[0]!.levelBefore === "medium" &&
      two[0]!.levelAfter === "hard" &&
      two[0]!.change === "up" &&
      two[0]!.counted === 4 &&
      two[1]!.levelBefore === "hard" &&
      two[1]!.levelAfter === "hard" &&
      two[1]!.change === "keep" &&
      two[1]!.reason.includes("already the hardest"),
    JSON.stringify(two.map((c) => [c.levelBefore, c.levelAfter, c.change, c.reason])),
  );

  const low = roundChecks("fill-blank", "easy", at([R, W, W, W]));
  check(
    "levelPath: 1 right of 4 from easy → keep (already the easiest)",
    low.length === 1 && low[0]!.change === "keep" && low[0]!.levelAfter === "easy" && low[0]!.reason.includes("already the easiest"),
    JSON.stringify(low),
  );

  const helpedOnes = roundChecks("quiz-show", "medium", at([R, R, "h", "h"]));
  check(
    "levelPath: helped answers count as not right (2 of 4 → keep)",
    helpedOnes[0]?.counted === 2 && helpedOnes[0]?.change === "keep",
  );

  check("levelPath: Match Up → no checks", roundChecks("match-up", "easy", at([R, R, R, R, R, R])).length === 0);

  const six = roundChecks("quiz-show", "easy", at([R, R, R, R, R, W]));
  check(
    "levelPath: 6 answers → one check of 4 + one leftover group of 2",
    six.length === 2 &&
      six[0]!.from === 1 &&
      six[0]!.to === 4 &&
      six[0]!.decided &&
      six[1]!.from === 5 &&
      six[1]!.to === 6 &&
      six[1]!.answers.length === 2 &&
      !six[1]!.decided &&
      six[1]!.change === "keep" &&
      six[1]!.levelBefore === "medium" &&
      six[1]!.levelAfter === "medium",
    JSON.stringify(six.map((c) => [c.from, c.to, c.change, c.decided])),
  );

  const shuffled = roundChecks("quiz-show", "easy", [
    { position: 3, right: true, helped: false },
    { position: 0, right: false, helped: false },
    { position: 2, right: false, helped: false },
    { position: 1, right: false, helped: false },
  ]);
  check("levelPath: answers are read in position order", same(shuffled[0]?.answers.map((a) => a.right), [W, W, W, R]));

  const d = (iso: string) => new Date(iso);
  const groups = groupByTopic([
    { topic: "Fractions ", endedAt: d("2026-11-20T01:00:00Z"), change: "up" },
    { topic: "Plants", endedAt: d("2026-11-21T01:00:00Z"), change: "keep" },
    { topic: "fractions", endedAt: d("2026-11-22T01:00:00Z"), change: "down" },
  ]);
  check(
    "levelPath: grouped by trimmed lowercase topic, newest played first",
    groups.length === 2 && groups[0]!.key === "fractions" && groups[0]!.rounds.length === 2 && groups[1]!.key === "plants",
    JSON.stringify(groups.map((g) => g.key)),
  );
  check("levelPath: ups and downs", same(countChanges(groups[0]!.rounds), { ups: 1, downs: 1 }));
  check("levelPath: the newest 6 rounds, oldest first", same(shownRounds([1, 2, 3, 4, 5, 6, 7, 8, 9]), [4, 5, 6, 7, 8, 9]));
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
  // What the screens see: only a streak that is still going.
  check("shown streak: last round today → kept", shownStreak("2026-11-23", 3, "2026-11-23") === 3);
  check("shown streak: last round yesterday → kept", shownStreak("2026-11-22", 3, "2026-11-23") === 3);
  check("shown streak: last round 2 days ago → 0", shownStreak("2026-11-21", 3, "2026-11-23") === 0);
  check("shown streak: never played → 0", shownStreak(null, 0, "2026-11-23") === 0);
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
  const { makeStudentToken, makeTeacherToken } = require("../auth/tokens") as typeof import("../auth/tokens");

  const tag = `zz-test-${randomBytes(4).toString("hex")}`;
  const made: {
    teacherId?: string;
    teacher2Id?: string;
    teacher3Id?: string;
    sectionId?: string;
    section3Id?: string;
    lessonId?: string;
  } = {};
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

    // ---------- The Teacher's levels page (step 8) ----------
    const teacherToken = makeTeacherToken({ id: teacher.id, tokenVersion: 0 });
    const lv = await call("GET", `/api/students/${student.id}/levels`, teacherToken);
    const topic0 = lv.body.topics?.[0];
    check("levels: 200 for my Student", lv.status === 200, `status ${lv.status} ${code(lv)}`);
    check(
      "levels: one topic, next round medium, 2 rounds, up 1",
      lv.body.topics?.length === 1 &&
        topic0?.topic === "Equivalent Fractions" &&
        topic0?.level === "medium" &&
        topic0?.roundCount === 2 &&
        topic0?.ups === 1 &&
        topic0?.downs === 0 &&
        topic0?.lesson === `${tag}-pack`,
      JSON.stringify(topic0 && { ...topic0, rounds: undefined }),
    );
    check(
      "levels: checks worked out again (4 right from easy → medium)",
      same(
        topic0?.rounds?.[0]?.checks?.map((c: any) => [c.from, c.to, c.counted, c.levelBefore, c.levelAfter, c.change]),
        [[1, 4, 4, "easy", "medium", "up"]],
      ),
      JSON.stringify(topic0?.rounds?.[0]?.checks),
    );
    check(
      "levels: no question text or choices are sent",
      !/Q0\?|1\/2|"prompt"|"choices"/.test(JSON.stringify(lv.body)),
    );
    check(
      "levels: Last played and streak in the answer",
      typeof lv.body.student?.lastPlayedAt === "string" && lv.body.student?.streakDays === 1,
    );
    const list = await call("GET", `/api/sections/${section.id}/students`, teacherToken);
    const row = list.body?.find?.((s: any) => s.id === student.id);
    const rowOther = list.body?.find?.((s: any) => s.id === other.id);
    check(
      "students list: lastPlayedAt and streakDays (null and 0 for a Student who never played)",
      typeof row?.lastPlayedAt === "string" && row?.streakDays === 1 && rowOther?.lastPlayedAt === null && rowOther?.streakDays === 0,
      JSON.stringify({ last: row?.lastPlayedAt, streak: row?.streakDays }),
    );

    // Another Teacher: the same 404 as a Student that doesn't exist.
    const teacher3 = await prisma.teacher.create({
      data: { email: `${tag}-3@kiddex.test`, name: `${tag}-teacher-3`, passwordHash: "not-a-hash" },
    });
    made.teacher3Id = teacher3.id;
    const section3 = await prisma.section.create({
      data: { teacherId: teacher3.id, grade: 4, name: `${tag}-3`, nameKey: `${tag}-3`, color: "yellow", icon: "flower" },
    });
    made.section3Id = section3.id;
    const otherTeacherToken = makeTeacherToken({ id: teacher3.id, tokenVersion: 0 });
    const notMine = await call("GET", `/api/students/${student.id}/levels`, otherTeacherToken);
    const unknown = await call("GET", "/api/students/zz-no-such-student/levels", teacherToken);
    check(
      "levels: another Teacher's Student → 404 STUDENT_NOT_FOUND (same as unknown)",
      notMine.status === 404 && code(notMine) === "STUDENT_NOT_FOUND" && unknown.status === 404 && code(unknown) === "STUDENT_NOT_FOUND",
      `status ${notMine.status} ${code(notMine)}`,
    );
    const asStudent = await call("GET", `/api/students/${student.id}/levels`, token);
    check("levels: a Student token → 401", asStudent.status === 401, `status ${asStudent.status}`);

    // ---------- npm run cleanup (on this test's zz-test- data only) ----------
    const teacherEmail = `${tag}@kiddex.test`;
    const opts = (extra: Partial<CleanupOptions>): CleanupOptions => ({
      ...NO_OPTIONS,
      teacher: teacherEmail,
      ...extra,
    });
    const lessonRows = () => prisma.lesson.count({ where: { id: lesson.id } });

    // A second Teacher with a lesson whose title also starts with the tag.
    const teacher2 = await prisma.teacher.create({
      data: { email: `${tag}-2@kiddex.test`, name: `${tag}-teacher-2`, passwordHash: "not-a-hash" },
    });
    made.teacher2Id = teacher2.id;
    await prisma.lesson.create({
      data: {
        ownerId: teacher2.id,
        topic: `${tag}-Other`,
        fileName: `${tag}-other.pdf`,
        fileType: "pdf",
        sizeBytes: 1,
        unitLabel: "page",
        unitCount: 1,
        unitCountIsEstimate: false,
        wordCount: 100,
        textLevel: "ok",
        units: [],
      },
    });

    const dry = await makePlan(prisma, opts({ lessons: [tag] }));
    check(
      "cleanup: a dry run plans the lesson",
      dry.problems.length === 0 && dry.lessonIds.length === 1,
      dry.problems.join(" "),
    );
    check("cleanup: a dry run deletes nothing", (await lessonRows()) === 1);

    const twoTeachers = await makePlan(prisma, { ...NO_OPTIONS, lessons: [tag] });
    check(
      "cleanup: text matching 2 Teachers stops without --teacher",
      twoTeachers.problems.some((p) => p.includes("2 Teachers")) && twoTeachers.lessonIds.length === 0,
      twoTeachers.problems.join(" "),
    );

    const typo = await makePlan(prisma, opts({ lessons: [tag], assignments: [`${tag}-no-such-pack`] }));
    let typoDeleted = true;
    try {
      await applyPlan(prisma, typo);
    } catch {
      typoDeleted = false;
    }
    check(
      "cleanup: a filter that matches nothing stops the whole run",
      typo.problems.length === 1 && !typoDeleted && (await lessonRows()) === 1,
      typo.problems.join(" "),
    );

    // --lesson --yes: its questions, assignments and rounds go with it.
    const roundsBefore = await prisma.gameRound.count({ where: { lessonId: lesson.id } });
    await applyPlan(prisma, dry);
    const lessonGone =
      (await lessonRows()) === 0 &&
      (await prisma.question.count({ where: { lessonId: lesson.id } })) === 0 &&
      (await prisma.assignment.count({ where: { lessonId: lesson.id } })) === 0 &&
      (await prisma.gameRound.count({ where: { lessonId: lesson.id } })) === 0;
    check(
      "cleanup: --lesson removes its questions, assignment and rounds",
      roundsBefore === 2 && lessonGone,
      `${roundsBefore} rounds before`,
    );

    // --reset-progress: keeps the Student and the PIN code, zeros the numbers.
    await prisma.student.update({ where: { id: student.id }, data: { pinHash: "zz-test-not-a-real-hash" } });
    await prisma.topicLevel.create({ data: { studentId: student.id, topicKey: "zz", topic: "zz" } });
    const reset = await makePlan(prisma, opts({ resetProgress: [student.schoolId] }));
    await applyPlan(prisma, reset);
    const after = await prisma.student.findUnique({
      where: { id: student.id },
      select: { pinHash: true, xp: true, stars: true, streakDays: true, lastPlayDay: true },
    });
    check(
      "cleanup: --reset-progress keeps the Student and PIN code, zeros the numbers",
      !!after &&
        after.pinHash === "zz-test-not-a-real-hash" &&
        after.xp === 0 &&
        after.stars === 0 &&
        after.streakDays === 0 &&
        after.lastPlayDay === null &&
        (await prisma.topicLevel.count({ where: { studentId: student.id } })) === 0,
      JSON.stringify(after && { ...after, pinHash: undefined }),
    );
  } catch (err) {
    check("database walkthrough ran without a crash", false, err instanceof Error ? err.name : "error");
  } finally {
    // Always clean up, even when a check failed. Students first (their rounds go with them).
    try {
      if (made.sectionId) await prisma.student.deleteMany({ where: { sectionId: made.sectionId } });
      if (made.lessonId) await prisma.lesson.deleteMany({ where: { id: made.lessonId } });
      if (made.teacher2Id) await prisma.lesson.deleteMany({ where: { ownerId: made.teacher2Id } });
      if (made.sectionId) await prisma.section.deleteMany({ where: { id: made.sectionId } });
      if (made.teacherId) await prisma.teacher.deleteMany({ where: { id: made.teacherId } });
      if (made.teacher2Id) await prisma.teacher.deleteMany({ where: { id: made.teacher2Id } });
      if (made.section3Id) await prisma.section.deleteMany({ where: { id: made.section3Id } });
      if (made.teacher3Id) await prisma.teacher.deleteMany({ where: { id: made.teacher3Id } });
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
  levelPathChecks();
  await databaseWalkthrough();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
