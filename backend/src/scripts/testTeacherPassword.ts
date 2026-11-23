// `npm run test-teacher-password`: checks that a Teacher can change their own password
// (POST /api/auth/teacher/password), the sticky note flag (PATCH .../password-note),
// the `password` part of /api/auth/me, and that an admin reset makes the password
// temporary again. Prints PASS or FAIL for each.
//
// NEEDS THE DATABASE: it makes one test Teacher (test-password-…@kiddex.test) and
// always deletes it at the end. Runs the real app on a free port on this computer.
// Never prints a password, a hash or a token.
import type { AddressInfo } from "node:net";
import { randomBytes } from "node:crypto";
import { createAccount, resetAccountPassword } from "../auth/accounts";
import { prisma } from "../db/prisma";
import { app } from "../app";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  (${detail})`}`);
}

type Answer = { status: number; body: Record<string, unknown> };

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const call = async (method: string, path: string, token: string | null, body?: unknown): Promise<Answer> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };
  const code = (a: Answer) => (a.body.error as { code?: string } | undefined)?.code ?? "";
  const flags = (a: Answer) => a.body.password as { temporary?: boolean; noteHidden?: boolean } | undefined;
  const change = (token: string | null, currentPassword: string, newPassword: string) =>
    call("POST", "/api/auth/teacher/password", token, { currentPassword, newPassword });

  const email = `test-password-${randomBytes(4).toString("hex")}@kiddex.test`;
  let teacherId: string | null = null;

  try {
    const made = await createAccount("teacher", { name: "Test Password Teacher", email });
    teacherId = made.account.id;
    const temporary = made.temporaryPassword;

    const login = await call("POST", "/api/auth/teacher/login", null, { email, password: temporary });
    const oldToken = String(login.body.token ?? "");
    check("the new Teacher logs in with the temporary password", login.status === 200 && !!oldToken, `status ${login.status}`);

    const me1 = await call("GET", "/api/auth/me", oldToken);
    check("me: a new account is temporary, note shown", flags(me1)?.temporary === true && flags(me1)?.noteHidden === false);
    const teacherShape = Object.keys((me1.body.teacher as object) ?? {}).sort().join();
    check("me: teacher keeps { id, name, email }", teacherShape === "email,id,name", teacherShape);

    // The sticky note's X.
    const note = await call("PATCH", "/api/auth/teacher/password-note", oldToken, { hidden: true });
    const me2 = await call("GET", "/api/auth/me", oldToken);
    check("note: hiding it answers { ok: true }", note.status === 200 && note.body.ok === true, `status ${note.status}`);
    check("note: me shows noteHidden, still temporary", flags(me2)?.noteHidden === true && flags(me2)?.temporary === true);
    check("note: no token -> 401", (await call("PATCH", "/api/auth/teacher/password-note", null, { hidden: true })).status === 401);

    // Change password: the refusals.
    const newPassword = `New-${randomBytes(6).toString("hex")}`;
    const noToken = await change(null, temporary, newPassword);
    check("change: no token -> 401", noToken.status === 401, `status ${noToken.status}`);
    const wrong = await change(oldToken, "not-the-password", newPassword);
    check("change: wrong current -> 400 WRONG_CURRENT_PASSWORD", wrong.status === 400 && code(wrong) === "WRONG_CURRENT_PASSWORD", `${wrong.status} ${code(wrong)}`);
    const short = await change(oldToken, temporary, "short");
    check("change: short new -> 400 BAD_PASSWORD", short.status === 400 && code(short) === "BAD_PASSWORD", `${short.status} ${code(short)}`);
    const same = await change(oldToken, temporary, temporary);
    check("change: same as now -> 400 SAME_PASSWORD", same.status === 400 && code(same) === "SAME_PASSWORD", `${same.status} ${code(same)}`);
    check("change: the refusals did not end the login", (await call("GET", "/api/auth/me", oldToken)).status === 200);

    // Change password: right.
    const right = await change(oldToken, temporary, newPassword);
    const newToken = String(right.body.token ?? "");
    check("change: right -> 200 with a new token", right.status === 200 && !!newToken && newToken !== oldToken, `status ${right.status}`);
    const me3 = await call("GET", "/api/auth/me", newToken);
    check("change: the new token works", me3.status === 200, `status ${me3.status}`);
    check("change: me shows temporary: false, noteHidden: true", flags(me3)?.temporary === false && flags(me3)?.noteHidden === true);
    check("change: the OLD token now gets 401", (await call("GET", "/api/auth/me", oldToken)).status === 401);
    const oldLogin = await call("POST", "/api/auth/teacher/login", null, { email, password: temporary });
    check("change: the old password no longer logs in", oldLogin.status === 401);
    const newLogin = await call("POST", "/api/auth/teacher/login", null, { email, password: newPassword });
    check("change: the new password logs in", newLogin.status === 200);

    // The admin resets it: temporary again, note back, everyone logged out.
    await resetAccountPassword("teacher", teacherId);
    const row = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { passwordIsTemporary: true, passwordNoteHidden: true } });
    check("admin reset: temporary: true, noteHidden: false again", row?.passwordIsTemporary === true && row?.passwordNoteHidden === false);
    check("admin reset: the Teacher's token gets 401", (await call("GET", "/api/auth/me", newToken)).status === 401);
  } catch (err) {
    failures++;
    console.log(`FAIL  the test stopped early: ${err instanceof Error ? err.message : "unknown error"}`);
  } finally {
    if (teacherId) {
      const removed = await prisma.teacher.deleteMany({ where: { id: teacherId } });
      check("cleanup: the test Teacher was deleted", removed.count === 1);
    }
    server.close();
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
