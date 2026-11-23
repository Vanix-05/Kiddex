# KIDDEX backend

Express 5 + TypeScript API for KIDDEX. Teacher accounts, lessons and their questions are saved in a Neon Postgres database, used through Prisma 7, so nothing is lost when the server restarts or sleeps.

## Install

```
cd backend
npm install
```

`npm install` also makes the Prisma client (`postinstall` runs `npm run db:generate`). It is made in `src/generated/prisma/` and is not committed.

## Settings (.env)

1. Copy `.env.example` to `.env` (in this `backend/` folder).
2. Paste your keys after `GEMINI_API_KEY=` and `GROQ_API_KEY=`.
   - Gemini key: https://aistudio.google.com/apikey
   - Groq key: https://console.groq.com/keys
3. Never commit `.env`. It is already in `.gitignore`.
4. Optional: `AI_ORDER=gemini,groq` sets which AI is tried first (see "How questions are made").
5. `FRONTEND_URL` is the website address (or several, separated by commas, no slash at the end) allowed to call this API from a browser, e.g. `https://kiddex.vercel.app,http://localhost:5173`. Any other website is blocked (CORS).

The server still starts without AI keys; the AI features just won't work yet. It does NOT start without the two database addresses and `JWT_SECRET`.

### The database (Neon)

1. In the Neon project, click **Connect**.
2. Turn **Connection pooling ON** and copy the address (it has `-pooler` in it) into `DATABASE_URL=`. The running server uses this one.
3. Turn **Connection pooling OFF** and copy the address into `DIRECT_URL=`. Only Prisma migrations use this one.
4. Keep the end of the addresses as Neon gives them (`?sslmode=require&channel_binding=require`).
5. Run `npm run db:migrate` to make the tables, then `npm run db:seed` to make the first Teacher.

These addresses hold the database password: never print, log or share them.

**The free Neon database sleeps when it is not used** and wakes on the first request, so the first answer after a break can take a few seconds. `/api/health` waits at most 3 seconds (it may say `db: false` once while the database wakes); `npm run db:check` waits up to 10 seconds.

### The login secret (JWT_SECRET)

`JWT_SECRET` signs the Teacher login tokens. It is required (the server does not start without it) and must be at least 32 characters. Make one with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never print, log or share it: anyone with it could make Teacher logins. Changing it logs every Teacher out.

### The first Teacher

There is no Register page: admins make Teacher accounts. The first one comes from `npm run db:seed`, using these settings (read only by the seed script, the server starts without them):

- `SEED_TEACHER_NAME` (default `Mr. Gucci`)
- `SEED_TEACHER_EMAIL` (default `mr.gucci@kiddex.test`)
- `SEED_TEACHER_PASSWORD` (required, at least 8 characters)

Running the seed again changes nothing if that Teacher already exists (it never resets the password).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API at http://localhost:3000 and restarts on every code change. |
| `npm run build` | Makes the Prisma client, then checks the TypeScript and builds it into `dist/`. |
| `npm start` | Runs the built version from `dist/` (run `npm run build` first). |
| `npm run check-keys` | Sends one tiny test request to Gemini and Groq and says if each key and model work. |
| `npm run read-file -- "C:\path\to\lesson.pdf"` | Reads a lesson file (PDF, .docx, .pptx) without the screens and prints the counts and the first 200 characters of each page or slide. |
| `npm run make-questions -- "C:\path\to\lesson.docx" --games quiz-show,match-up --topic "Equivalent Fractions" --subject Math --grade 4` | Makes question cards from a lesson file without the screens, through the same store as the addresses (creates a lesson, makes its questions, prints the lesson id). It has no login, so the lesson belongs to the seed Teacher (`SEED_TEACHER_EMAIL`, default `mr.gucci@kiddex.test`); run `npm run db:seed` first. Prints one line per game request (which AI answered, the seconds, estimated tokens, waits and why), cards per game and level, marks, rejects and top-up, and saves the full cards to `backend/results/` (not committed). Add `--order groq,gemini` to change the AI order for one run. |
| `npm run db:migrate` | Development: makes a new migration from `prisma/schema.prisma` (asks for a name) and applies it to the database (uses `DIRECT_URL`). |
| `npm run db:deploy` | Real server: applies the migrations in `prisma/migrations/` that are not applied yet. Never makes new ones. |
| `npm run db:studio` | Opens Prisma Studio, a web page to look at the tables. |
| `npm run db:generate` | Makes the Prisma client again (after a change to `prisma/schema.prisma`). |
| `npm run db:seed` | Makes the first Teacher from the `SEED_TEACHER_*` settings. Safe to run twice. |
| `npm run db:check` | Prints `Database: OK. Teachers: N. Lessons: N. Questions: N.` or a short reason it failed. |
| `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"` | Admin: makes a Teacher account and prints a temporary password once. Add `--password "..."` to choose it instead (testing; see "Choosing the password"). |
| `npm run reset-teacher-password -- --email "santos@school.ph"` | Admin: gives a Teacher a new temporary password, printed once. Add `--password "..."` to choose it instead. |
| `npm run add-admin -- --name "Carlo" --email "carlo@kiddex.test"` | Makes an admin account for the Admin page and prints a temporary password once. Add `--password "..."` to choose it instead (testing; see "Choosing the password"). |
| `npm run reset-admin-password -- --email "carlo@kiddex.test"` | Gives an admin a new temporary password, printed once (signs them out, clears the lock). Add `--password "..."` to choose it instead. |
| `npm run test-students` | Checks the School ID cleaner, the one-time code maker (6 digits, from `crypto`), New code, the 45-Students rule, the Student login rules (shared `WRONG_LOGIN`, 5 wrong → `429`, reset on a right login), Student tokens vs `requireTeacher` / `requireAdmin`, and that the setup values match the frontend. Prints PASS or FAIL for each. Needs no database. |
| `npm run test-checks` | Runs hand-made cards through our card checks (marks, page numbers, rejects, repeats, extra cards) and prints PASS or FAIL for each. Makes no AI call. |

## Check that it runs

- http://localhost:3000/api/health shows `status: "ok"`, whether each AI key is set, and `db: true` when the database answers.
- `npm run db:check` shows whether the database is reachable and how many Teachers, lessons and questions there are.
- http://localhost:3000/api/ping answers `{ "ok": true }` without touching the database.

## Deploy on Render

The backend runs as a free **Web Service** on Render (region **Singapore**, close to the Neon database).

1. New → Web Service → connect the GitHub repository.
2. **Root Directory:** `backend`
3. **Runtime:** Node (the version comes from `"engines": { "node": ">=22" }` in `package.json`).
4. **Build Command** (exactly):

   ```
   npm ci --include=dev && npm run build && npm run db:deploy
   ```

   `--include=dev` is needed because TypeScript and Prisma are dev dependencies and Render sets `NODE_ENV=production`. `npm run build` makes the Prisma client and the JavaScript in `dist/`; `npm run db:deploy` applies any new database migrations (it never makes new ones).
5. **Start Command:** `npm start`
6. **Health Check Path** (under Advanced): `/api/ping`
7. **Environment** → add these settings (copy the values from your `.env`, never paste them anywhere else):

   | Setting | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Neon address, pooling ON (has `-pooler`) |
   | `DIRECT_URL` | Neon address, pooling OFF |
   | `JWT_SECRET` | the same long random text as in `.env` (or a new one: then everyone logs in again) |
   | `FRONTEND_URL` | the Vercel address, e.g. `https://kiddex.vercel.app` (add `,http://localhost:5173` to also allow your laptop) |
   | `GROQ_API_KEY` | your Groq key |
   | `GROQ_MODEL` | as in `.env` |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | as in `.env` |
   | `AI_ORDER` | as in `.env`, e.g. `gemini,groq` |
   | `AI_TIMEOUT_MS` | as in `.env`, e.g. `60000` |

   Do **not** add `PORT` (Render sets it), `DEV_MARK_EVERY` (test only, and ignored in production anyway) or the `SEED_TEACHER_*` settings: Teachers are made from your laptop (`npm run db:seed`, `npm run add-teacher`), which uses the same Neon database.
8. After the first deploy, open `https://<your-service>.onrender.com/api/health`: it should show `db: true`.

Good to know:

- **The free server sleeps** after about 15 minutes without visits. The next visit wakes it, which can take up to about a minute (the Teacher Login shows "Waking up KIDDEX…"). A free uptime/ping service calling `/api/ping` every 10 minutes keeps it awake; `/api/ping` never touches the database.
- A lesson that was being made when the server went to sleep becomes `failed` with `SERVER_RESTARTED`; the Teacher can try again.
- In production (`NODE_ENV=production`) error answers never contain stack traces (the details only go to the Render log), `DEV_MARK_EVERY` is ignored, and the start log does not show `localhost`.
- `npm run make-questions`, `npm run test-checks`, `npm run check-keys` and the `db:*` / Teacher scripts are for your laptop; the server never runs them.
- After changing the Vercel address, update `FRONTEND_URL` on Render and choose "Save and deploy" so the server restarts with it.

## Teacher accounts (admins only)

Admins add Teachers, reset passwords and turn accounts off or on from the **Admin page** (`/admin` on the website, see "Admin page" below), or from the command line with these scripts. The commands work in Windows cmd and PowerShell; the `--` passes the options on to the script.

**Add a Teacher**

```
npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"
```

It prints a 12-character temporary password once (letters and numbers, no look-alikes such as 0/O or 1/l/I). Give it to the Teacher privately; only its hash is saved, so it cannot be shown again. An email that is already used is refused.

**Reset a password**

```
npm run reset-teacher-password -- --email "santos@school.ph"
```

It prints a new temporary password once, signs the Teacher out everywhere (`tokenVersion` goes up by 1) and clears the "too many wrong tries" lock. An unknown email changes nothing.

**Choosing the password (for testing):** all four account scripts (`add-teacher`, `reset-teacher-password`, `add-admin`, `reset-admin-password`) also take `--password "..."`. It works in Windows cmd and PowerShell:

```
npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph" --password "1234"
npm run reset-teacher-password -- --email "mr.gucci@kiddex.test" --password "1234"
npm run add-admin -- --name "Admin" --email "admin@kiddex.com" --password "1234"
npm run reset-admin-password -- --email "admin@kiddex.com" --password "5678"
```

- The chosen password is used instead of a random one and is **never printed**: the script only says `Made Teacher Ms. Santos with the password you chose.` (or `Made admin …`) or `Password changed for <email>.`
- A chosen password may be as short as **4 characters** (at most 200). Shorter than 8, it is still accepted, with one warning line: `Warning: this password is short. Use it for testing only and change it before real use.` Shorter than 4 is refused (nothing changes).
- A reset with `--password` works like any reset: the account is signed out everywhere (`tokenVersion` goes up by 1) and the lock is cleared.
- Without `--password`, the scripts work as before: a random 12-character temporary password, printed once. The Admin page always makes random 12-character passwords.
- The Teacher and admin logins accept any password from 1 to 200 characters, so a 4-character test password logs in normally (same shared `WRONG_LOGIN` error and lock after 5 tries).
- Note: a password typed on the command line can stay in your terminal's history. Use short passwords only for testing, and reset to a real one (without `--password`) before real use.

Emails are always saved trimmed and lowercase. Passwords are stored only as bcrypt hashes (bcryptjs, cost 12; `src/auth/passwords.ts`). Random temporary passwords are 12 characters; `SEED_TEACHER_PASSWORD` must be at least 8; a password chosen with `--password` at least 4 (for testing).

## Admin page

The Admin page (`/admin` on the website) manages **Teacher accounts only** (nothing about Students or lessons). Admins are their own accounts in the `Admin` table: an admin is not a Teacher and has no lessons. Admin accounts are made only from your laptop:

```
npm run add-admin -- --name "Carlo" --email "carlo@kiddex.test"
npm run reset-admin-password -- --email "carlo@kiddex.test"
```

Both admin scripts also take `--password "..."` to choose the password (for testing): see "Choosing the password" under "Teacher accounts".

Same style as the Teacher scripts: a duplicate email is refused, the temporary password is printed **once**, and a reset also signs the admin out everywhere and clears the lock. Your laptop and the live site use the same Neon database, so a new admin can log in on the live site right away.

| Address | What it does |
| --- | --- |
| `POST /api/admin/login` | Body `{ "email", "password" }`. Right: `{ token, admin: { id, name, email } }`. Exactly the same rules as the Teacher login (one `WRONG_LOGIN` answer, 5 wrong tries lock it for 5 minutes, at most 20 tries per 15 minutes per computer with its own counter, `503 DB_UNAVAILABLE`). |
| `GET /api/admin/me` | Needs an admin token. Answers `{ admin: { id, name, email } }`. |
| `GET /api/admin/teachers` | All Teachers, newest first: `id, name, email, active, lastLoginAt, createdAt, lessonCount`. Never the password hash. |
| `POST /api/admin/teachers` | Body `{ "name", "email" }` (name 2–60 characters). Makes the account with a temporary password and answers `201` `{ teacher, temporaryPassword }`. This is the only time the password is sent. Duplicate email: `409 EMAIL_TAKEN`. |
| `POST /api/admin/teachers/:id/reset-password` | Like `npm run reset-teacher-password`: a new temporary password, the Teacher is signed out everywhere, the lock is cleared. Answers `{ teacher, temporaryPassword }`. |
| `PATCH /api/admin/teachers/:id` | Body `{ "active": true }` or `{ "active": false }`. Turning **off** also signs the Teacher out everywhere; their lessons are kept. Answers `{ teacher }`. |

- Every `/api/admin/teachers...` address needs an **admin** token (`Authorization: Bearer <token>`); `401 LOGIN_NEEDED` otherwise. An admin token has `role: "admin"` and also lasts 8 hours. A Teacher token never works on the admin addresses, and an admin token never works on the Teacher ones.
- An unknown Teacher id: `404 TEACHER_NOT_FOUND`.
- There is **no delete address**, on purpose: it can't be undone. Turn the account off instead.
- A temporary password is only ever in the answer: it is never logged (the server log only has the error code and the address).
- **A turned-off Teacher** can't log in: the right password answers `403 ACCOUNT_OFF` "This account is turned off. Please ask your school's KIDDEX admin." (a wrong password still gets `WRONG_LOGIN`, so it never tells whether an account exists), and any token they still have answers `401 LOGIN_NEEDED`. `npm run add-teacher` and `npm run reset-teacher-password` keep working for them.

## Teacher login

| Address | What it does |
| --- | --- |
| `POST /api/auth/teacher/login` | Body `{ "email", "password" }`. Right: `200` `{ token, teacher: { id, name, email } }`. The email may be in any capitals. |
| `GET /api/auth/me` | Needs a login token. Answers `{ teacher: { id, name, email } }`. The app calls it once after a page reload to check the saved login. |

- **The token:** send it as `Authorization: Bearer <token>`. It lasts **8 hours** (one school day), is signed with `JWT_SECRET` (HS256) and holds only the Teacher id, `role: "teacher"` and the Teacher's `tokenVersion` (no email, no name). The frontend keeps it in sessionStorage, so closing the tab logs out.
- **There is no logout address:** logging out just makes the browser forget the token. Resetting the password (`npm run reset-teacher-password`) makes every older token stop working, because `tokenVersion` goes up.
- **Wrong email or password:** always the same answer, `401 WRONG_LOGIN` "Wrong email or password.", never which part was wrong. An unknown email still runs one bcrypt check, so it takes about as long.
- **Too many wrong tries:** each wrong password counts. At **5** in a row the account is locked for **5 minutes** (and the count starts again); while locked even the right password answers `429 TOO_MANY_TRIES`. A right login clears the count. An admin can clear a lock at once with `npm run reset-teacher-password`.
- **Per computer:** the login address allows at most **20 tries per 15 minutes** from one IP address (any result), then `429 TOO_MANY_TRIES`. This count lives in memory and starts again when the server restarts. `trust proxy` is set to 1 because the real server (Render) sits behind one proxy.
- **Turned off by an admin:** the right password answers `403 ACCOUNT_OFF` "This account is turned off. Please ask your school's KIDDEX admin." The password is checked first, so a wrong one still gets `WRONG_LOGIN`.
- **Every `/api/lessons...`, `/api/questions...`, `/api/sections...` and `/api/students...` address needs the token.** No token, a wrong or expired token, an admin token, a deleted Teacher, a reset password or a turned-off account: `401 LOGIN_NEEDED` "Please log in again.". Only `/`, `/api/ping`, `/api/health` and the two login addresses (Teacher and admin) are open.
- The login rules are shared with the admin login (`src/auth/accountLogin.ts`).
- **Database not reachable:** `503 DB_UNAVAILABLE` "We can't reach KIDDEX right now. Please try again in a minute." (after one more try a second later, for a database that is waking up).

Try it (PowerShell or cmd):

```
curl -H "Content-Type: application/json" -d "{\"email\":\"mr.gucci@kiddex.test\",\"password\":\"<password>\"}" http://localhost:3000/api/auth/teacher/login
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/me
```

## Student login

School ID + PIN code are two credentials, like a username and a password. Rules in `src/students/studentLogin.ts`, addresses in `src/routes/student.ts`.

| Address | What it does |
| --- | --- |
| `POST /api/auth/student/check-code` | Body `{ "schoolId", "code" }`. Right School ID + its current one-time code: `200 { ok: true }`. Used by the New Student book before the PIN code page. Does **not** log in. |
| `POST /api/auth/student/first-login` | Body `{ "schoolId", "code", "pin" }` (pin = exactly 4 digits). Checks the code again, saves the PIN code (bcrypt, cost 12), removes the one-time code, sets `registeredAt` (only if empty) and `lastLoginAt`. Answers `{ token, student }`. |
| `POST /api/auth/student/login` | Body `{ "schoolId", "pin" }`. Answers `{ token, student }`. |
| `GET /api/student/me` | Needs a Student token. The profile: `schoolId` (`2026-0144`), `section: { grade, name }`, `avatar, buddy, buddyName, look, seenIntroClip, seenBridgeCutscene`. Never a hash or a code. |
| `PUT /api/student/setup` | Needs a Student token. `{ avatar, buddy, buddyName }` at the end of first-time setup. Answers `{ student }`. |
| `PATCH /api/student/me` | Needs a Student token. Any of `{ look, buddyName, seenIntroClip, seenBridgeCutscene }`. Answers `{ student }`. |

- School IDs are cleaned like everywhere else (`2026-0144`, `20260144` or with spaces). One-time codes are compared with `crypto.timingSafeEqual`; a code works once.
- **One answer** for an unknown School ID, a wrong code, a used-up code and a wrong PIN code: `401 WRONG_LOGIN`. It never says which part was wrong. `/login` runs a bcrypt check against a dummy hash for an unknown School ID or a Student with no PIN code yet (same timing).
- **Wrong tries:** each wrong code or PIN code for a real Student counts. 5 in a row lock that Student for 5 minutes (`429 TOO_MANY_TRIES`); a right login clears the count. Same rule and code as the Teacher login.
- **Per computer:** a whole class logs in from one school internet address at the same time, so these three addresses share their own limit of **300 tries per 15 minutes** per address (not the Teacher login's 20). The per-Student lock is what protects each PIN code.
- **The token:** `role: "student"`, `sub` = Student id, `tv` = the Student's `tokenVersion`, 8 hours. A Student token never passes `requireTeacher` or `requireAdmin`, and Teacher/admin tokens never pass `requireStudent`. A **New code** from the Teacher raises `tokenVersion`, so the Student's open login ends (`401 LOGIN_NEEDED`).
- The allowed avatar, buddy, buddy name and look values are in `src/content/studentSetup.ts`, copies of the frontend's lists. `npm run test-students` checks they still match.
- No address ever gives a Student another Student's School ID.

## Addresses

| Address | What it does |
| --- | --- |
| `GET /api/ping` | Open (no login). Answers `{ "ok": true }` without touching the database: for a wake-up ping service. |
| `GET /api/health` | Open (no login). Server status, whether each AI key is set, and `db: true/false` (a tiny database check, at most 3 seconds; still `200` when the database is down). |

Every address below needs a Teacher login token (`Authorization: Bearer <token>`, see "Teacher login"), and only shows that Teacher's own lessons and questions.

| Address | What it does |
| --- | --- |
| `POST /api/lessons/extract` | Send one lesson file in the form field `file` (PDF, .docx or .pptx, max 10 MB). Answers with the text of every page or slide, the word count and `textLevel` (`none` below 80 words, `low` below 200, else `ok`). Pictures are skipped and there is no OCR, so scanned pages give no text. The file is read in memory and never saved. |
| `GET /api/lessons/extract/:extractId` | The same upload answer again. |
| `POST /api/lessons/:lessonId/generate` | Starts making questions. JSON body: `{ "topic", "subject", "grade": 3-6, "games": 1 or 2 of "quiz-show", "match-up", "fill-blank" }`. Saves these on the lesson, sets `status: "making"` and answers `202` with `{ "lessonId" }`; the work goes on in the background. `409 ALREADY_MAKING` / `409 ALREADY_HAS_QUESTIONS`. At most 2 lessons are made at the same time. |
| `GET /api/lessons` | My lessons, newest first: `id, topic, subject, fileName, fileType, unitLabel, unitCount, unitCountIsEstimate, wordCount, status, games, createdAt, counts: { total, toCheck, approved, flaggedLeft }`. No lesson text. |
| `GET /api/lessons/:lessonId` | One lesson: its fields, `makingStep` (`writing`, `checking` or `waiting`) and `seconds` while making, `error: { code, message }` when failed, `counts`, `summary` per game (`count, needed, enough`) and its `questions` in `position` order. The lesson text (`units`) only with `?withText=1`. Read it every few seconds until `status` is `ready` or `failed`. |
| `DELETE /api/lessons/:lessonId` | Deletes the lesson and its questions (`204`). Not while making (`409 ALREADY_MAKING`). |
| `POST /api/lessons/:lessonId/questions` | The Teacher adds their own question: `{ type, prompt, choices, answer, level, explanation }`. Saved as `madeBy: "teacher"`, no mark, at the end of its game group. Checked with the card format. Answers `201` with the question. |
| `PATCH /api/questions/:questionId` | Edit `prompt, choices, answer, level, explanation`. Checked with the card format. Saving a marked card also sets `flagChecked: true`. An approved card goes back to `draft` and its lesson back to `ready`. |
| `POST /api/questions/:questionId/keep` | "Yes, keep it" for a marked question: `flagChecked: true`. |
| `DELETE /api/questions/:questionId` | Deletes one question (`204`); positions are renumbered. |
| `POST /api/lessons/:lessonId/approve-all` | Approves every question and the lesson (`approvedAt`). `409 MARKED_NOT_CHECKED` if a marked question is not checked yet, `409 NO_QUESTIONS` if there are none. Answers with the lesson like `GET /api/lessons/:lessonId`. |

"Scroll to the end before Approve all" is a screen rule; the server can only check the marked questions.

Lesson `status`: `uploaded` → `making` → `ready` (or `failed`) → `approved`. A question is the card format from `src/content/questionCard.ts` plus `position` (order in the Check list), `flagChecked` and `madeBy` (`ai` or `teacher`).

**Saved in the database:** lessons and their questions are kept in the `Lesson` and `Question` tables (through `src/store/lessonStore.ts`), so they survive a restart. There is no limit on how many lessons a Teacher keeps. Every lesson belongs to the logged-in Teacher (its `ownerId` is the Teacher's id, from `src/auth/currentTeacher.ts`); another Teacher's lesson or question answers `404`.

### Sections and Students

Every address below needs a Teacher login token. A Teacher only ever sees and changes their **own** sections and Students: another Teacher's section answers `404 SECTION_NOT_FOUND`, the same as an unknown one.

| Address | What it does |
| --- | --- |
| `GET /api/sections` | My sections, oldest first: `id, grade, name, color, icon, studentCount, registeredCount`. |
| `POST /api/sections` | Body `{ "grade": 3-6, "name": 1-30 characters }`. The server picks the next tab look: yellow/flower, pink/tulip, coral/rose, then again. Same grade + name already mine (any capitals): `409 SECTION_TAKEN`. Answers `201` `{ section }`. |
| `GET /api/sections/:sectionId/students` | The section's Students in School ID order: `id, schoolId` (`2026-0144`), `registered` (has a PIN code), `oneTimeCode` (`482-915`, only while not registered, else `null`), `buddy, buddyName, lastLoginAt, registeredAt`. Never a hash. |
| `POST /api/sections/:sectionId/students` | Body `{ "schoolIds": [...] }` (1 to 45). Adds the good ones, each with a new one-time code, and answers `201` `{ added, skipped: [{ schoolId, reason }] }`. Reasons: `BAD_FORMAT` (not 8 digits), `DUPLICATE_IN_LIST`, `ALREADY_IN_SECTION`, `IN_ANOTHER_SECTION` (any other section, also another Teacher's; it never says whose). |
| `POST /api/students/:studentId/new-code` | A new one-time code for one of my Students (lost card or forgotten PIN code). The PIN code is removed, `tokenVersion` goes up (any open Student login ends), wrong tries and the lock are cleared. `registeredAt`, the buddy, the setup and all progress are **kept**. Also works for a Student who has a code but no PIN code yet (the old code stops working). Answers `{ student }` (same shape as the list, with the new `oneTimeCode`). Another Teacher's Student: `404 STUDENT_NOT_FOUND`. |

- **School IDs:** `2026-0144`, `20260144` or with spaces are all fine; saved as 8 digits (`20260144`), shown as `2026-0144`.
- **One-time codes:** 6 random digits from `crypto.randomInt`, never used by another Student at the same time.
- **At most 45 Students per section.** If the good new ones don't fit, **nothing** is added: `409 SECTION_FULL` "This section has room for N more Students.". The section row is locked during the check, so two quick clicks can't go over 45 together.
- Adding is **one transaction**: every good School ID is added, or none.
- There are no delete addresses for sections or Students yet (on purpose). A section with Students can't be deleted from the database, and a Teacher with sections can't either.
- **Database not reachable:** `503 DB_UNAVAILABLE` "We can't reach your class lists right now. Please try again in a minute."

### Assignments (review packs)

Both need a Teacher login token, and only work on the Teacher's own sections and lessons (anything else: `404 SECTION_NOT_FOUND` / `404 LESSON_NOT_FOUND`).

| Address | What it does |
| --- | --- |
| `GET /api/sections/:sectionId/assignments` | This section's assignments, newest first: `id, lessonId, name, games, dueDate` (`YYYY-MM-DD` or null), `createdAt`. |
| `PUT /api/sections/:sectionId/assignments/:lessonId` | Body `{ "name": 1-60 characters, "games": 1-3 of quiz-show, match-up, fill-blank, "dueDate": "2026-11-27" or null }`. Creates the assignment, or updates it if this lesson was given to this section before. Answers `{ assignment }`. |

- The lesson must be approved: else `409 LESSON_NOT_READY` "Check and approve the questions first.".
- Each game needs enough **approved** questions (`MIN_CARDS` in `src/content/questionCard.ts`, the same numbers as the frontend: Quiz Show 3, Match Up 4, Fill the Blank 3): else `409 GAME_NOT_READY`, naming the game.
- The due date is a date only, saved as noon Philippine time, so it never slips a day.
- A section with no Students yet can still get an assignment. What Students see from it comes later (roadmap step 7).

### The database tables

| Table | What it holds |
| --- | --- |
| `Teacher` | One row per Teacher account (email, name, password hash, login lock). |
| `Lesson` | One row per uploaded lesson: its owner, the file's name, type and counts, the lesson **text** (`units`, as JSON), the picked topic, subject, grade and games, and its `status`. The original file is never stored. |
| `Question` | One row per question card of a lesson, with its `position` (order in the Check list, 1, 2, 3…), `flagChecked` and `madeBy`. Deleted together with its lesson. |
| `Section` | One row per class section of a Teacher (grade 3–6, name, tab color and icon). `nameKey` is the name in lowercase, so one Teacher can't have the same grade + name twice in any capitals. |
| `Assignment` | A review pack: one approved lesson given to one section (pack name, games, due date). One per lesson + section; assigning again updates it. Deleted with its lesson or section. |
| `Student` | One row per Student: **School ID only, no name, email or photo** (Master Brief 4.1). The one-time code (not hashed, so the Teacher can show and print it; it works once and is removed when the PIN code is made), the PIN code's bcrypt hash, login lock fields, and the setup choices (buddy, look…) filled in later. |

- Saving the AI's cards, adding a question, deleting one (the rest are renumbered) and Approve all each happen in **one transaction**: all or nothing.
- "At most 2 lessons made at the same time" counts the `making` lessons in the database.
- **A server restart while making:** the free server can sleep or restart in the middle of making questions. On start, and then every minute, any lesson still `making` more than 5 minutes after it started becomes `failed` with `SERVER_RESTARTED` ("The server restarted while making questions. Please try again."). A job never runs over 3 minutes, so such a lesson was cut off.
- **Database not reachable** during a lesson or question address: `503 DB_UNAVAILABLE` "We can't reach the saved lessons right now. Please try again in a minute." (The login check runs first, so usually you get the login's version of `DB_UNAVAILABLE` instead.) The server log gets only a short safe reason, never the address or any lesson text.
- A Teacher who still has lessons can't be deleted from the database (their lessons must be deleted first).

Try it (with a token from the login address):

```
curl -H "Authorization: Bearer <token>" -F "file=@C:\path\to\lesson.docx" http://localhost:3000/api/lessons/extract
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"topic\":\"Fractions\",\"subject\":\"Math\",\"grade\":4,\"games\":[\"quiz-show\"]}" http://localhost:3000/api/lessons/<lessonId>/generate
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/lessons/<lessonId>
```

### How questions are made

- The AI gets only the lesson text, subject, topic and grade. Never the file name or any name. Gemini gets up to 6000 words of lesson text; Groq up to 2500 (cut at the end of a page or slide).
- **One AI request per game.** Each picked game gets its own request, one after the other: Match Up first (the list the AI most often skipped when asked for two at once), then Fill the Blank, then Quiz Show. Each request asks for that game's list only (`{ "matchUp": [...] }`, `{ "quizShow": [...] }`, ...) with its exact count, and passes the cards already kept for the other game as "we already have these", so the two games do not ask the same thing. Gemini gets this shape as a JSON schema; for Groq a missing list just means 0 cards for that game. If one game's request fails completely, the next game is still asked.
- Each answer is capped per game: Quiz Show 2400 tokens, Match Up 1200, Fill the Blank 1800 (`MAX_OUTPUT_TOKENS_PER_GAME`; 3500 for a request without its own cap). An answer that hits its cap counts as a bad answer, so the next AI is tried. Groq's free plan allows 8000 tokens per minute, so each Groq request is estimated first (characters / 4 + that request's cap) and the lesson text is cut further if the estimate is above 7000. Groq runs with `reasoning_effort: "none"` (no thinking tokens).
- **Groq token check.** Every good Groq answer tells us how many tokens of its per-minute budget are left and when it is full again (`x-ratelimit-remaining-tokens`, `x-ratelimit-reset-tokens`); this is kept in memory. Before the next Groq request (the second game or a top-up) we estimate its size: if enough is left, it is sent right away. If not, and the next AI in line was not down in the last 2 minutes, that AI is tried first without waiting (Groq moves to the back of the line); otherwise we wait until Groq's budget is full again, plus 1 s (at most 65 s, never past the job time limit, job `step: "waiting"`). Note: Groq also has an output-tokens-per-minute limit that these headers do not report, so a 429 can still happen; it is handled like any other 429 below.
- `AI_ORDER` in `.env` (default `gemini,groq`) sets which AI is tried first. An AI without a key is skipped. The first AI gets `AI_TIMEOUT_MS`; if it is busy, too slow, says "too many requests" or answers badly, the next one is used right away. The browser is never told which AI answered.
- The last AI (45 s limit) gets one more try: after 3 s if it was busy, or after the wait it asks for (at most 65 s) if it said "too many requests". For Groq that wait is the larger of its `retry-after` and `x-ratelimit-reset-tokens` headers. If the last AI fails and an earlier one only said "too many requests", that one gets the one more try instead, after what is left of its wait.
- An AI that was busy, slow or rate limited is not tried first for the next 2 minutes (it is still the backup). This note is kept in memory, so it is lost on restart.
- One job never runs longer than 240 s (two game requests, sometimes with a wait in between). While waiting for an AI the job shows `step: "waiting"`.
- The AI is asked for 35% more cards than we keep (Quiz Show 14, Match Up 9, Fill the Blank 11). If a game gets more good cards than its target (10 / 6 / 8), the best ones are kept (unmarked first, level mix close to 40/35/25) and the rest count as `extra` in the summary.
- Our code checks every card (`src/lessons/checkCards.ts`): card format, 4 choices for Quiz Show, 3 word-bank words and one `___` for Fill the Blank, no repeated questions or pair sides. A card whose `sourceQuote` cannot be found in the lesson gets `flag: "not_in_lesson"`; a card the AI was unsure about gets `flag: "ai_unsure"`.
- If a game has fewer good cards than it needs to be playable (Quiz Show 3, Match Up 4, Fill the Blank 3), any AI is asked once more for that game only (its own list, the missing number plus 2, the shorter 2500-word lesson text, and the questions we already have so they are not repeated). This happens after all the first game requests; a top-up to Groq goes through the same token check. If that fails, the job still finishes and that game shows `enough: false`. The job fails with `NO_GOOD_QUESTIONS` only if no game is playable.
- The numbers (cards per game, extra factor, waits, job time limit, word limits, Groq token budget, answer cap) are in `src/lessons/limits.ts`.

Try it: `curl -H "Authorization: Bearer <token>" -F "file=@C:\path\to\lesson.pdf" http://localhost:3000/api/lessons/extract`

Errors always look like `{ "error": { "code": "...", "message": "..." } }`. Login codes: `LOGIN_NEEDED`, `WRONG_LOGIN`, `TOO_MANY_TRIES`, `ACCOUNT_OFF`, `DB_UNAVAILABLE`. Admin page codes: `EMAIL_TAKEN`, `TEACHER_NOT_FOUND`, `BAD_REQUEST`. Lesson codes: `NO_FILE`, `ONE_FILE_ONLY`, `FILE_TOO_BIG`, `OLD_FORMAT`, `WRONG_TYPE`, `PDF_LOCKED`, `CANT_READ`. Lesson and question codes: `LESSON_NOT_FOUND`, `QUESTION_NOT_FOUND`, `ALREADY_MAKING`, `ALREADY_HAS_QUESTIONS`, `MARKED_NOT_CHECKED`, `NO_QUESTIONS`, `BAD_REQUEST`, `TOO_MANY_GAMES`, `NOT_ENOUGH_TEXT`, `AI_BUSY`. A failed lesson shows `AI_BUSY`, `NO_GOOD_QUESTIONS`, `SERVER_RESTARTED` or `DB_UNAVAILABLE` in its `error`.

The limits (file size, word levels) are in `src/lessons/limits.ts`.
