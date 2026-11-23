// `npm run test-students`: checks the School ID cleaner, the one-time code maker, "New code" and
// the 45-Students rule, and prints PASS or FAIL for each. Needs NO database.
// Codes made here are random test values; they are never printed.
import { MAX_STUDENTS_PER_SECTION } from "../sections/limits";
import { newCodeChanges } from "../sections/newCode";
import { makeOneTimeCode, makeUniqueCodes, showOneTimeCode } from "../sections/oneTimeCode";
import { planAdd } from "../sections/planAdd";
import { cleanSchoolId, showSchoolId } from "../sections/schoolId";

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

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
