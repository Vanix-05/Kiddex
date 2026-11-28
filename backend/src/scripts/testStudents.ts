// `npm run test-students`: checks the School ID cleaner, the one-time code maker, "New code",
// the 45-Students rule, the Student login rules and tokens, the Admin totals, and prints
// PASS or FAIL for each. Codes made here are random test values; they are never printed.
//
// When DATABASE_URL is set (backend/.env), it also walks through Remove, Restore and
// Delete forever on the real database with throwaway Teachers, a section and Students
// (names start with "zz-test-", School IDs start with 98). It ALWAYS deletes what it made
// at the end, even when a check fails. Never prints a token, a School ID, a code or an id.
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { randomBytes, randomInt } from "node:crypto";
import dotenv from "dotenv";
import type { Request, RequestHandler, Response } from "express";
import { ADMIN_STATS_KEYS, readAdminStats } from "../admin/adminStats";
import { requireAdmin } from "../auth/requireAdmin";
import { requireStudent } from "../auth/requireStudent";
import { requireTeacher } from "../auth/requireTeacher";
import { hashPassword } from "../auth/passwords";
import { makeStudentToken, makeTeacherToken, readAdminToken, readStudentToken, readTeacherToken } from "../auth/tokens";
import { AVATARS, BUDDY_IDS, LOOK_ITEMS, MAX_NICKNAME } from "../content/studentSetup";
import { AppError } from "../middleware/AppError";
import { dueDateFromText, dueDateText } from "../sections/dueDate";
import { MAX_STUDENTS_PER_SECTION } from "../sections/limits";
import { newCodeChanges } from "../sections/newCode";
import { makeOneTimeCode, makeUniqueCodes, showOneTimeCode } from "../sections/oneTimeCode";
import { planAdd } from "../sections/planAdd";
import { cleanSchoolId, showSchoolId } from "../sections/schoolId";
import { studentLogin, type StudentLoginRow, type StudentLoginStore } from "../students/studentLogin";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}

async function main() {
  // ---------- School ID cleaner ----------
  check("2026-0144 is cleaned to 20260144", cleanSchoolId("2026-0144") === "20260144");
  check("20260144 stays 20260144", cleanSchoolId("20260144") === "20260144");
  check("spaces are removed (' 2026 0144 ')", cleanSchoolId(" 2026 0144 ") === "20260144");
  check("a dash from Word (2026–0144) works", cleanSchoolId("2026–0144") === "20260144");
  check("7 numbers is not valid (2026-019)", cleanSchoolId("2026-019") === null);
  check("9 numbers is not valid", cleanSchoolId("202601444") === null);
  check("letters are not valid (2026-01A4)", cleanSchoolId("2026-01A4") === null);
  check("an empty line is not valid", cleanSchoolId("   ") === null);
  check("shown as 2026-0144", showSchoolId("20260144") === "2026-0144");

  // ---------- One-time code maker ----------
  const realRandom = Math.random;
  let usedMathRandom = false;
  Math.random = () => {
    usedMathRandom = true;
    return realRandom();
  };
  const codes = Array.from({ length: 2000 }, makeOneTimeCode);
  Math.random = realRandom;
  check("every code is exactly 6 digits", codes.every((c) => /^\d{6}$/.test(c)));
  check("codes come from crypto, not Math.random", !usedMathRandom);
  check("codes are not all the same", new Set(codes).size > 1900, `${new Set(codes).size} different of 2000`);
  check("codes with a leading 0 keep it", codes.some((c) => c.startsWith("0")));
  check("shown as 123-456", showOneTimeCode("123456") === "123-456");

  // Taken codes are made again, and the answer has no repeats.
  const takenOnce = new Set<string>();
  let asked = 0;
  const unique = await makeUniqueCodes(45, async (candidates) => {
    asked++;
    // Pretend the first 5 candidates of the first round are already used.
    if (asked === 1) candidates.slice(0, 5).forEach((c) => takenOnce.add(c));
    return new Set(candidates.filter((c) => takenOnce.has(c)));
  });
  check("45 unique codes are made", unique.length === 45 && new Set(unique).size === 45);
  check("a taken code is never given out", unique.every((c) => !takenOnce.has(c)));
  check("taken codes are made again (a second round ran)", asked >= 2);

  // ---------- The 45 rule ----------
  const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => String(20260000 + from + i));
  check("the limit is 45", MAX_STUDENTS_PER_SECTION === 45);

  const fits = planAdd(ids(100, 5), 40, new Map(), "sec-a");
  check("40 + 5 fits (45 at most)", !fits.full && fits.good.length === 5 && fits.placesLeft === 5);

  const over = planAdd(ids(100, 6), 40, new Map(), "sec-a");
  check("40 + 6 is too many: nothing is added", over.full && over.placesLeft === 5);

  const fresh = planAdd(ids(100, 45), 0, new Map(), "sec-a");
  check("45 into an empty section fits", !fresh.full && fresh.good.length === 45);

  const fullSection = planAdd(ids(100, 1), 45, new Map(), "sec-a");
  check("a full section takes no more", fullSection.full && fullSection.placesLeft === 0);

  // Skipped ones don't count toward the limit.
  const owners = new Map([
    ["20260144", "sec-a"], // already in this section
    ["20260150", "sec-b"], // another section (maybe another Teacher's)
  ]);
  const mixed = planAdd(["2026-0191", "2026-0191", "2026-019", "2026-0144", "2026-0150", "20260192"], 43, owners, "sec-a");
  const reasons = Object.fromEntries(mixed.skipped.map((s) => [s.schoolId, s.reason]));
  check("2 good ones fit in 2 places even with 4 bad ones", !mixed.full && mixed.good.join() === "20260191,20260192");
  check("BAD_FORMAT for 2026-019", reasons["2026-019"] === "BAD_FORMAT");
  check("DUPLICATE_IN_LIST for the second 2026-0191", reasons["2026-0191"] === "DUPLICATE_IN_LIST");
  check("ALREADY_IN_SECTION for 2026-0144", reasons["2026-0144"] === "ALREADY_IN_SECTION");
  check("IN_ANOTHER_SECTION for 2026-0150", reasons["2026-0150"] === "IN_ANOTHER_SECTION");

  // Removed Students: in this section → REMOVED_IN_SECTION; in another section → still IN_ANOTHER_SECTION.
  const removedPlan = planAdd(["2026-0144", "2026-0150"], 0, owners, "sec-a", new Set(["20260144", "20260150"]));
  const removedReasons = Object.fromEntries(removedPlan.skipped.map((s) => [s.schoolId, s.reason]));
  check("REMOVED_IN_SECTION for a removed Student of this section", removedReasons["2026-0144"] === "REMOVED_IN_SECTION");
  check("a removed Student of another section is still IN_ANOTHER_SECTION", removedReasons["2026-0150"] === "IN_ANOTHER_SECTION");

  // ---------- New code ----------
  const now = new Date("2026-11-23T08:00:00Z");
  const changes = newCodeChanges("730264", now);
  const keys = Object.keys(changes);
  check("new code: the new code is saved", changes.oneTimeCode === "730264");
  check("new code: codeMadeAt is set to now", changes.codeMadeAt === now);
  check("new code: the PIN code is removed", changes.pinHash === null);
  check("new code: tokenVersion goes up by 1 (open logins end)", changes.tokenVersion.increment === 1);
  check("new code: wrong tries and the lock are cleared", changes.failedLogins === 0 && changes.lockedUntil === null);
  const kept = ["registeredAt", "buddy", "buddyName", "avatar", "look", "seenIntroClip", "seenBridgeCutscene", "schoolId", "sectionId"];
  check("new code: registeredAt, buddy, setup and section are kept", kept.every((k) => !keys.includes(k)));

  // The Student's own old code counts as taken (the database still has it), so the
  // new one is always different. Here the first candidate happens to be the old code.
  let oldCode = "";
  let rounds = 0;
  const [renewed] = await makeUniqueCodes(1, async (candidates) => {
    rounds++;
    if (rounds === 1) oldCode = candidates[0];
    return new Set(candidates.filter((c) => c === oldCode));
  });
  check("new code: never the same as the old code", renewed !== oldCode && /^\d{6}$/.test(renewed) && rounds === 2);

  // ---------- Due dates (assignments) ----------
  const due = dueDateFromText("2026-11-27");
  check("due date: saved as noon Philippine time (04:00 UTC)", due?.toISOString() === "2026-11-27T04:00:00.000Z");
  check("due date: read back as the same day", !!due && dueDateText(due) === "2026-11-27");
  check("due date: a day that doesn't exist is refused", dueDateFromText("2026-02-30") === null && dueDateFromText("27/11/2026") === null);

  await loginChecks();
  await tokenChecks();
  await adminStatsChecks();
  sameAsFrontendChecks();
  await removeWalkthrough();

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

// ---------- Student login (an in-memory store: no database) ----------

/** The error code a promise fails with ("" when it works). */
async function failsWith(work: Promise<unknown>): Promise<string> {
  try {
    await work;
    return "";
  } catch (err) {
    return err instanceof AppError ? err.code : "UNEXPECTED";
  }
}

async function loginChecks() {
  const rows = new Map<string, StudentLoginRow & { schoolId: string }>();
  const add = (id: string, schoolId: string, extra: Partial<StudentLoginRow> = {}) =>
    rows.set(id, {
      id,
      schoolId,
      tokenVersion: 0,
      oneTimeCode: null,
      pinHash: null,
      failedLogins: 0,
      lockedUntil: null,
      registeredAt: null,
      ...extra,
    });
  const store: StudentLoginStore = {
    find: async (schoolId) => [...rows.values()].find((r) => r.schoolId === schoolId) ?? null,
    update: async (id, changes) => {
      const row = rows.get(id);
      if (row) Object.assign(row, changes);
    },
    useCode: async (id, code, changes) => {
      const row = rows.get(id);
      if (!row || row.oneTimeCode !== code) return false;
      Object.assign(row, changes);
      return true;
    },
  };
  const login = studentLogin(store);
  const row = (id: string) => rows.get(id)!;

  // A new Student (code 482915) and a registered one (PIN code 1234).
  add("new", "20260191", { oneTimeCode: "482915" });
  add("old", "20260192", { pinHash: await hashPassword("1234"), registeredAt: new Date("2026-11-01") });

  // School ID cleaning on login
  check("login: School ID with a dash works", (await failsWith(login.checkCode({ schoolId: "2026-0191", code: "482915" }))) === "");
  check("login: School ID without a dash works", (await failsWith(login.checkCode({ schoolId: "20260191", code: "482-915" }))) === "");
  check("login: check-code does not use up the code", row("new").oneTimeCode === "482915");

  // The one shared WRONG_LOGIN
  check("login: unknown School ID → WRONG_LOGIN (code)", (await failsWith(login.checkCode({ schoolId: "2026-9999", code: "482915" }))) === "WRONG_LOGIN");
  check("login: unknown School ID → WRONG_LOGIN (PIN)", (await failsWith(login.login({ schoolId: "2026-9999", pin: "1234" }))) === "WRONG_LOGIN");
  check("login: wrong code → WRONG_LOGIN", (await failsWith(login.checkCode({ schoolId: "2026-0191", code: "111111" }))) === "WRONG_LOGIN");
  check("login: a wrong code counts as a wrong try", row("new").failedLogins === 1);
  check("login: wrong PIN code → WRONG_LOGIN", (await failsWith(login.login({ schoolId: "2026-0192", pin: "9999" }))) === "WRONG_LOGIN");
  check("login: no PIN code made yet → WRONG_LOGIN", (await failsWith(login.login({ schoolId: "2026-0191", pin: "1234" }))) === "WRONG_LOGIN");
  check("login: a PIN code must be 4 numbers", (await failsWith(login.firstLogin({ schoolId: "2026-0191", code: "482915", pin: "12" }))) === "BAD_REQUEST");

  // First login: the PIN code is saved (hashed), the code is used up
  const before = row("new").failedLogins;
  check("first login: right code + new PIN code works", (await failsWith(login.firstLogin({ schoolId: "2026-0191", code: "482-915", pin: "5678" }))) === "" && before > 0);
  check("first login: the code is gone, codeMadeAt cleared", row("new").oneTimeCode === null && (row("new") as { codeMadeAt?: unknown }).codeMadeAt === null);
  check("first login: the PIN code is hashed, never kept as typed", !!row("new").pinHash && row("new").pinHash !== "5678");
  check("first login: registeredAt is set and wrong tries cleared", !!row("new").registeredAt && row("new").failedLogins === 0);
  check("login: a used-up code → WRONG_LOGIN", (await failsWith(login.checkCode({ schoolId: "2026-0191", code: "482915" }))) === "WRONG_LOGIN");
  check("login: the new PIN code works", (await failsWith(login.login({ schoolId: "2026-0191", pin: "5678" }))) === "");

  // A right login resets the count
  await failsWith(login.login({ schoolId: "2026-0192", pin: "0000" }));
  await failsWith(login.login({ schoolId: "2026-0192", pin: "0000" }));
  const counted = row("old").failedLogins;
  await login.login({ schoolId: "2026-0192", pin: "1234" });
  check("login: a right login resets the wrong tries", counted === 3 && row("old").failedLogins === 0);

  // 5 wrong in a row → 429, even with the right PIN code
  const answers: string[] = [];
  for (let i = 0; i < 5; i++) answers.push(await failsWith(login.login({ schoolId: "2026-0192", pin: "0000" })));
  check("login: wrong tries 1–5 answer WRONG_LOGIN", answers.every((a) => a === "WRONG_LOGIN"));
  check("login: after 5 wrong → 429 TOO_MANY_TRIES", (await failsWith(login.login({ schoolId: "2026-0192", pin: "0000" }))) === "TOO_MANY_TRIES");
  check("login: locked: even the right PIN code waits", (await failsWith(login.login({ schoolId: "2026-0192", pin: "1234" }))) === "TOO_MANY_TRIES");
  const minutes = ((row("old").lockedUntil?.getTime() ?? 0) - Date.now()) / 60000;
  check("login: the lock lasts 5 minutes", minutes > 4.9 && minutes <= 5);
  row("old").lockedUntil = new Date(Date.now() - 1000); // 5 minutes later
  check("login: after the lock the right PIN code works again", (await failsWith(login.login({ schoolId: "2026-0192", pin: "1234" }))) === "");

  // New code (Teacher): the old PIN code stops working, registeredAt is kept
  Object.assign(row("old"), newCodeChanges("730264", new Date()), { tokenVersion: 1 });
  check("new code: the old PIN code stops working", (await failsWith(login.login({ schoolId: "2026-0192", pin: "1234" }))) === "WRONG_LOGIN");
  const registeredAt = row("old").registeredAt;
  await login.firstLogin({ schoolId: "2026-0192", code: "730264", pin: "4321" });
  check("new code: a new PIN code works, registeredAt is kept", row("old").registeredAt === registeredAt && (await failsWith(login.login({ schoolId: "2026-0192", pin: "4321" }))) === "");
}

// ---------- Tokens ----------

async function tokenChecks() {
  const studentToken = makeStudentToken({ id: "student-1", tokenVersion: 0 });
  const teacherToken = makeTeacherToken({ id: "teacher-1", tokenVersion: 0 });
  check("token: a Student token reads as a Student token", readStudentToken(studentToken)?.accountId === "student-1");
  check("token: a Student token is not a Teacher token", readTeacherToken(studentToken) === null);
  check("token: a Student token is not an admin token", readAdminToken(studentToken) === null);
  check("token: a Teacher token is not a Student token", readStudentToken(teacherToken) === null);

  // The real middleware: it refuses before it ever asks the database.
  const run = (handler: RequestHandler, token: string) =>
    new Promise<string>((resolve) => {
      const req = { get: (name: string) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined) };
      void handler(req as unknown as Request, {} as Response, (err?: unknown) => resolve(err instanceof AppError ? err.code : "PASSED"));
    });
  check("token: requireTeacher refuses a Student token", (await run(requireTeacher, studentToken)) === "LOGIN_NEEDED");
  check("token: requireAdmin refuses a Student token", (await run(requireAdmin, studentToken)) === "LOGIN_NEEDED");
  check("token: requireStudent refuses a Teacher token", (await run(requireStudent, teacherToken)) === "LOGIN_NEEDED");
  // GET /api/admin/stats sits behind requireAdmin.
  check("admin stats: a Teacher token is refused", (await run(requireAdmin, teacherToken)) === "LOGIN_NEEDED");
  check("admin stats: a Student token is refused", (await run(requireAdmin, studentToken)) === "LOGIN_NEEDED");
}

// ---------- Admin totals (numbers only) ----------

async function adminStatsChecks() {
  const sample = { teachers: 4, activeTeachers: 3, sections: 5, students: 186, registeredStudents: 142, lessons: 7, approvedLessons: 5 };
  const stats = await readAdminStats({
    teachers: async () => sample.teachers,
    activeTeachers: async () => sample.activeTeachers,
    sections: async () => sample.sections,
    students: async () => sample.students,
    registeredStudents: async () => sample.registeredStudents,
    lessons: async () => sample.lessons,
    approvedLessons: async () => sample.approvedLessons,
  });
  const keys = Object.keys(stats).sort();
  check("admin stats: exactly 7 fields", keys.length === 7, keys.join());
  check("admin stats: the right field names", keys.join() === Object.keys(sample).sort().join(), keys.join());
  check("admin stats: every field is a number", Object.values(stats).every((v) => typeof v === "number" && Number.isFinite(v)));
  check("admin stats: the numbers are passed through", ADMIN_STATS_KEYS.every((k) => stats[k] === sample[k]));
}

// ---------- The allowed values match the frontend ----------

function sameAsFrontendChecks() {
  const setupFolder = path.resolve(__dirname, "../../../frontend/src/setup");
  if (!fs.existsSync(setupFolder)) {
    console.log("SKIP  allowed values vs frontend (no frontend folder next to the backend)");
    return;
  }
  const read = (file: string) => fs.readFileSync(path.join(setupFolder, file), "utf8");
  // \b: not the "id: 'girl'" inside "kid: 'girl'".
  const ids = (list: string) => [...list.matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]);
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

  const buddyList = /buddyIds = \[([^\]]+)\]/.exec(read("quizData.ts"))?.[1] ?? "";
  check("same as frontend: buddy ids", same([...buddyList.matchAll(/'([^']+)'/g)].map((m) => m[1]), BUDDY_IDS));
  check("same as frontend: MAX_NICKNAME", new RegExp(`MAX_NICKNAME = ${MAX_NICKNAME}\\b`).test(read("petData.ts")));
  check("same as frontend: avatars", /'boy' \| 'girl'/.test(read("avatar.ts")) && same(AVATARS, ["boy", "girl"]));

  const customize = read("customizeData.ts");
  // Every look key the frontend has (its ITEMS object) is here too.
  const itemsBlock = /export const ITEMS: Record<LookKey, CustomizeItem\[\]> = \{([\s\S]*?)\n\}/.exec(customize)?.[1] ?? "";
  const frontKeys = [...itemsBlock.matchAll(/^\s*(\w+)(?::|,)/gm)].map((m) => m[1]);
  check("same as frontend: look keys", same([...frontKeys].sort(), Object.keys(LOOK_ITEMS).sort()), frontKeys.join());
  for (const key of Object.keys(LOOK_ITEMS) as (keyof typeof LOOK_ITEMS)[]) {
    // A key that shares another key's list (bottomColor: shirt): checked against that key's list.
    const shared = new RegExp(`^\\s*${key}: (\\w+),`, "m").exec(itemsBlock)?.[1];
    if (shared) {
      const block = new RegExp(`const ${shared}: CustomizeItem\\[\\] = \\[([\\s\\S]*?)\\n\\]`).exec(customize)?.[1] ?? "";
      check(`same as frontend: look ${key} (= ${shared})`, same(ids(block), LOOK_ITEMS[key]));
      continue;
    }
    if (key === "skin") {
      const swatches = /const skin[^=]*= \[([^\]]+)\]/.exec(customize)?.[1] ?? "";
      const count = (swatches.match(/'#/g) ?? []).length;
      check("same as frontend: look skin", same(Array.from({ length: count }, (_, i) => `skin${i + 1}`), LOOK_ITEMS.skin));
      continue;
    }
    const block = new RegExp(`const ${key}: CustomizeItem\\[\\] = \\[([\\s\\S]*?)\\n\\]`).exec(customize)?.[1] ?? "";
    check(`same as frontend: look ${key}`, same(ids(block), LOOK_ITEMS[key]));
  }
}

// ---------- Remove, Restore and Delete forever (database walkthrough) ----------

type Reply = { status: number; body: Record<string, any> };

async function removeWalkthrough() {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP  remove walkthrough (DATABASE_URL is not set)");
    return;
  }
  // Loaded only now: these need the database settings (env.ts stops without them).
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { prisma } = require("../db/prisma") as typeof import("../db/prisma");
  const { app } = require("../app") as typeof import("../app");
  const { kickStudent } = require("../lobby/lobbyKick") as typeof import("../lobby/lobbyKick");
  const { sectionProgress } = require("../store/reportStore") as typeof import("../store/reportStore");

  const tag = `zz-test-${randomBytes(4).toString("hex")}`;
  const made: { teacherIds: string[]; sectionId?: string; lessonId?: string } = { teacherIds: [] };
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, url: string, token: string | null, body?: unknown): Promise<Reply> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  };
  const errorOf = (r: Reply) => `${r.status} ${r.body?.error?.code ?? r.body?.code ?? ""}`.trim();
  const codeOf = (r: Reply): string => r.body?.error?.code ?? r.body?.code ?? "";

  try {
    // Two Teachers: T owns the section, other tries to touch T's Student.
    const teacher = await prisma.teacher.create({
      data: { email: `${tag}@kiddex.test`, name: `${tag}-teacher`, passwordHash: "not-a-hash" },
    });
    made.teacherIds.push(teacher.id);
    const other = await prisma.teacher.create({
      data: { email: `${tag}-2@kiddex.test`, name: `${tag}-teacher-2`, passwordHash: "not-a-hash" },
    });
    made.teacherIds.push(other.id);
    const tToken = makeTeacherToken(teacher);
    const oToken = makeTeacherToken(other);
    const section = await prisma.section.create({
      data: { teacherId: teacher.id, grade: 4, name: tag, nameKey: tag, color: "yellow", icon: "flower" },
    });
    made.sectionId = section.id;

    // School IDs 98xxxxxx: A (has a PIN code and a round), B (never made a PIN code), fillers.
    const start = randomInt(0, 900_000);
    const sid = (n: number) => `98${String((start + n) % 1_000_000).padStart(6, "0")}`;
    const shown = (n: number) => showSchoolId(sid(n));
    const a = await prisma.student.create({
      data: {
        schoolId: sid(0),
        sectionId: section.id,
        pinHash: await hashPassword("1234"),
        registeredAt: new Date(),
        buddy: BUDDY_IDS[0],
        buddyName: "Mochi",
        xp: 120,
        stars: 4,
      },
    });
    const bCode = makeOneTimeCode();
    const b = await prisma.student.create({
      data: { schoolId: sid(1), sectionId: section.id, oneTimeCode: bCode, codeMadeAt: new Date() },
    });

    // A round for A, with answers and a topic level, so Delete forever really deletes something.
    const lesson = await prisma.lesson.create({
      data: {
        ownerId: teacher.id,
        topic: `${tag}-Fractions`,
        subject: "Math",
        grade: 4,
        games: ["quiz-show"],
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
    const now = new Date();
    const round = await prisma.gameRound.create({
      data: {
        clientRoundId: `${tag}-round`,
        studentId: a.id,
        lessonId: lesson.id,
        game: "quiz-show",
        topic: "Fractions",
        startLevel: "easy",
        endLevel: "easy",
        change: "keep",
        reason: "1 of 2 right (50%)",
        right: 1,
        helpedRight: 0,
        total: 2,
        helpsUsed: 0,
        xp: 10,
        stars: 1,
        starsEarned: 1,
        countsForMission: false,
        startedAt: new Date(now.getTime() - 60_000),
        endedAt: now,
        answers: {
          create: [
            { position: 0, level: "easy", right: true, tries: 1, ms: 1000, helped: false },
            { position: 1, level: "easy", right: false, tries: 2, ms: 2000, helped: false },
          ],
        },
      },
    });
    await prisma.topicLevel.create({ data: { studentId: a.id, topicKey: "fractions", topic: "Fractions" } });

    // A logs in; the token works.
    const loginA = await call("POST", "/api/auth/student/login", null, { schoolId: shown(0), pin: "1234" });
    const aToken: string = loginA.body.token ?? "";
    check("remove: before, A logs in with the PIN code", loginA.status === 200 && !!aToken, errorOf(loginA));
    const sectionsBefore = (await call("GET", "/api/sections", tToken)).body as unknown as Record<string, any>[];
    const before = sectionsBefore.find((s) => s.id === section.id);
    const progressBefore = await sectionProgress(teacher.id, section.id);

    // Another Teacher can't touch A.
    const oRemove = await call("POST", `/api/students/${a.id}/remove`, oToken);
    const oRestore = await call("POST", `/api/students/${a.id}/restore`, oToken);
    const oDelete = await call("DELETE", `/api/students/${a.id}`, oToken, { schoolId: shown(0) });
    check(
      "another Teacher: remove, restore and delete → 404 STUDENT_NOT_FOUND",
      [oRemove, oRestore, oDelete].every((r) => r.status === 404 && codeOf(r) === "STUDENT_NOT_FOUND"),
      [oRemove, oRestore, oDelete].map(errorOf).join(", "),
    );
    const oRemoved = await call("GET", `/api/sections/${section.id}/removed`, oToken);
    check("another Teacher: the removed list → 404 SECTION_NOT_FOUND", oRemoved.status === 404, errorOf(oRemoved));
    check("another Teacher: A is still active", (await prisma.student.findUnique({ where: { id: a.id } }))?.removedAt === null);

    // Delete forever needs Remove first.
    const notRemoved = await call("DELETE", `/api/students/${a.id}`, tToken, { schoolId: shown(0) });
    check("delete: an active Student → 409 NOT_REMOVED", notRemoved.status === 409 && codeOf(notRemoved) === "NOT_REMOVED", errorOf(notRemoved));

    // Remove A (twice: the same answer).
    const versionBefore = (await prisma.student.findUniqueOrThrow({ where: { id: a.id } })).tokenVersion;
    const removed1 = await call("POST", `/api/students/${a.id}/remove`, tToken);
    const removed2 = await call("POST", `/api/students/${a.id}/remove`, tToken);
    check("remove: answers { ok: true }", removed1.status === 200 && removed1.body.ok === true, errorOf(removed1));
    check("remove: tapping twice answers the same", removed2.status === 200 && removed2.body.ok === true, errorOf(removed2));
    const aRow = await prisma.student.findUniqueOrThrow({ where: { id: a.id } });
    check("remove: removedAt is set and tokenVersion went up once", aRow.removedAt !== null && aRow.tokenVersion === versionBefore + 1);
    check(
      "remove: nothing else changes (PIN code, buddy, XP, stars, rounds kept)",
      aRow.pinHash !== null && aRow.buddyName === "Mochi" && aRow.xp === 120 && aRow.stars === 4 &&
        (await prisma.gameRound.count({ where: { studentId: a.id } })) === 1,
    );
    kickStudent(a.id); // The Lobby isn't running here: does nothing, no crash.
    check("lobby: kickStudent without a running Lobby does nothing", true);

    // A can't log in, and the old token stops working.
    const failedBefore = aRow.failedLogins;
    const loginRemoved = await call("POST", "/api/auth/student/login", null, { schoolId: shown(0), pin: "1234" });
    check("remove: login with the right PIN code → 401 WRONG_LOGIN", loginRemoved.status === 401 && codeOf(loginRemoved) === "WRONG_LOGIN", errorOf(loginRemoved));
    check(
      "remove: no wrong try is counted for a removed Student",
      (await prisma.student.findUniqueOrThrow({ where: { id: a.id } })).failedLogins === failedBefore,
    );
    const oldToken = await call("GET", "/api/student/me", aToken);
    check("remove: an old login token → 401", oldToken.status === 401, errorOf(oldToken));
    const freshToken = await call("GET", "/api/student/me", makeStudentToken({ id: a.id, tokenVersion: aRow.tokenVersion }));
    check("remove: even a token with the new tokenVersion → 401 LOGIN_NEEDED", freshToken.status === 401 && codeOf(freshToken) === "LOGIN_NEEDED", errorOf(freshToken));

    // A leaves every list and count.
    const list = await call("GET", `/api/sections/${section.id}/students`, tToken);
    check("remove: not in My Students", list.status === 200 && !(list.body as unknown as any[]).some((s) => s.id === a.id));
    const after = ((await call("GET", "/api/sections", tToken)).body as unknown as Record<string, any>[]).find((s) => s.id === section.id);
    check(
      "remove: studentCount and registeredCount go down, removedCount goes up",
      !!before && !!after && after.studentCount === before.studentCount - 1 && after.registeredCount === before.registeredCount - 1 &&
        before.removedCount === 0 && after.removedCount === 1,
      JSON.stringify([before?.studentCount, after?.studentCount, before?.registeredCount, after?.registeredCount, after?.removedCount]),
    );
    const progressAfter = await sectionProgress(teacher.id, section.id);
    check("remove: Progress no longer counts them", progressAfter.registered === progressBefore.registered - 1);
    const levels = await call("GET", `/api/students/${a.id}/levels`, tToken);
    check("remove: their Student page → 404", levels.status === 404, errorOf(levels));
    const removedList = await call("GET", `/api/sections/${section.id}/removed`, tToken);
    const entry = (removedList.body as unknown as any[]).find?.((s) => s.id === a.id);
    check(
      "remove: shown in /removed with School ID, registered, buddy and removedAt",
      removedList.status === 200 && !!entry && entry.schoolId === shown(0) && entry.registered === true &&
        entry.buddy === BUDDY_IDS[0] && entry.buddyName === "Mochi" && typeof entry.removedAt === "string" &&
        Object.keys(entry).sort().join() === "buddy,buddyName,id,registered,removedAt,schoolId",
      entry ? Object.keys(entry).join() : errorOf(removedList),
    );

    // Adding A's School ID again in this section → REMOVED_IN_SECTION, no second row.
    const again = await call("POST", `/api/sections/${section.id}/students`, tToken, { schoolIds: [shown(0)] });
    check(
      "add: a removed School ID of this section → REMOVED_IN_SECTION",
      again.status === 201 && again.body.added?.length === 0 && again.body.skipped?.[0]?.reason === "REMOVED_IN_SECTION",
      errorOf(again),
    );

    // Fill the section to 45 active (B + 44), then Remove frees a place.
    await prisma.student.createMany({
      data: Array.from({ length: 44 }, (_, i) => ({ schoolId: sid(10 + i), sectionId: section.id })),
    });
    const tooMany = await call("POST", `/api/sections/${section.id}/students`, tToken, { schoolIds: [shown(60)] });
    check("full: 45 active (+1 removed) → adding one more is SECTION_FULL", tooMany.status === 409 && codeOf(tooMany) === "SECTION_FULL", errorOf(tooMany));
    const restoreFull = await call("POST", `/api/students/${a.id}/restore`, tToken);
    check(
      "restore: into a full section → 409 SECTION_FULL with the message",
      restoreFull.status === 409 && codeOf(restoreFull) === "SECTION_FULL" &&
        JSON.stringify(restoreFull.body).includes("This section already has 45 Students. Remove someone first."),
      errorOf(restoreFull),
    );
    await call("POST", `/api/students/${b.id}/remove`, tToken);
    const fits = await call("POST", `/api/sections/${section.id}/students`, tToken, { schoolIds: [shown(60)] });
    check("full: Remove frees a place (one more can be added)", fits.status === 201 && fits.body.added?.length === 1, errorOf(fits));

    // Make room, then Restore A: the old PIN code works again.
    await prisma.student.deleteMany({ where: { schoolId: { in: [sid(10), sid(11)] } } });
    const restored = await call("POST", `/api/students/${a.id}/restore`, tToken);
    check(
      "restore: answers the Student (StudentView)",
      restored.status === 200 && restored.body.student?.id === a.id && restored.body.student?.registered === true &&
        restored.body.student?.lastPlayedAt !== null,
      errorOf(restored),
    );
    const restoredAgain = await call("POST", `/api/students/${a.id}/restore`, tToken);
    check("restore: a Student who isn't removed → OK, nothing changes", restoredAgain.status === 200 && restoredAgain.body.student?.id === a.id, errorOf(restoredAgain));
    const loginBack = await call("POST", "/api/auth/student/login", null, { schoolId: shown(0), pin: "1234" });
    check("restore: login with the old PIN code works again", loginBack.status === 200 && !!loginBack.body.token, errorOf(loginBack));

    // Restore B (never made a PIN code): their old one-time code works again.
    const restoredB = await call("POST", `/api/students/${b.id}/restore`, tToken);
    const codeBack = await call("POST", "/api/auth/student/check-code", null, { schoolId: shown(1), code: bCode });
    check("restore: no PIN code yet → the old one-time code works again", restoredB.status === 200 && codeBack.status === 200, `${errorOf(restoredB)}, ${errorOf(codeBack)}`);

    // Delete forever: Remove, then type the School ID.
    await call("POST", `/api/students/${a.id}/remove`, tToken);
    const wrongId = await call("DELETE", `/api/students/${a.id}`, tToken, { schoolId: shown(1) });
    check("delete: a wrong School ID → 400 SCHOOL_ID_MISMATCH", wrongId.status === 400 && codeOf(wrongId) === "SCHOOL_ID_MISMATCH", errorOf(wrongId));
    check("delete: after a wrong School ID the Student is still there", (await prisma.student.count({ where: { id: a.id } })) === 1);
    const deleted = await call("DELETE", `/api/students/${a.id}`, tToken, { schoolId: sid(0) }); // no dash: the same School ID
    check("delete: the School ID without a dash matches → { ok: true }", deleted.status === 200 && deleted.body.ok === true, errorOf(deleted));
    const [rowsLeft, roundsLeft, answersLeft, levelsLeft] = await Promise.all([
      prisma.student.count({ where: { id: a.id } }),
      prisma.gameRound.count({ where: { studentId: a.id } }),
      prisma.roundAnswer.count({ where: { roundId: round.id } }),
      prisma.topicLevel.count({ where: { studentId: a.id } }),
    ]);
    check(
      "delete: no Student row, and no GameRound, RoundAnswer or TopicLevel left",
      rowsLeft === 0 && roundsLeft === 0 && answersLeft === 0 && levelsLeft === 0,
      JSON.stringify([rowsLeft, roundsLeft, answersLeft, levelsLeft]),
    );
    const gone = await call("POST", `/api/students/${a.id}/restore`, tToken);
    check("delete: the deleted Student is not found any more → 404", gone.status === 404, errorOf(gone));
  } catch (err) {
    check("remove walkthrough ran without a crash", false, err instanceof Error ? err.name : "error");
  } finally {
    // Always clean up, even when a check failed.
    try {
      if (made.sectionId) await prisma.student.deleteMany({ where: { sectionId: made.sectionId } });
      if (made.lessonId) await prisma.lesson.deleteMany({ where: { id: made.lessonId } });
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

void main();
