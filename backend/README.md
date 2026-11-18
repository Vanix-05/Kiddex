# KIDDEX backend

Express 5 + TypeScript API for KIDDEX. Teacher accounts live in a Neon Postgres database, used through Prisma 7.

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
| `npm run make-questions -- "C:\path\to\lesson.docx" --games quiz-show,match-up --topic "Equivalent Fractions" --subject Math --grade 4` | Makes question cards from a lesson file without the screens, through the same store as the addresses (creates a lesson, makes its questions, prints the lesson id). It has no login, so the lesson belongs to the seed Teacher (`SEED_TEACHER_EMAIL`, default `mr.gucci@kiddex.test`); run `npm run db:seed` first. Prints which AI answered, the seconds, cards per game and level, marks, rejects and top-up, and saves the full cards to `backend/results/` (not committed). Add `--order groq,gemini` to change the AI order for one run. |
| `npm run db:migrate` | Development: makes a new migration from `prisma/schema.prisma` (asks for a name) and applies it to the database (uses `DIRECT_URL`). |
| `npm run db:deploy` | Real server: applies the migrations in `prisma/migrations/` that are not applied yet. Never makes new ones. |
| `npm run db:studio` | Opens Prisma Studio, a web page to look at the tables. |
| `npm run db:generate` | Makes the Prisma client again (after a change to `prisma/schema.prisma`). |
| `npm run db:seed` | Makes the first Teacher from the `SEED_TEACHER_*` settings. Safe to run twice. |
| `npm run db:check` | Prints `Database: OK. Teachers: N.` or a short reason it failed. |
| `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"` | Admin: makes a Teacher account and prints a temporary password once. |
| `npm run reset-teacher-password -- --email "santos@school.ph"` | Admin: gives a Teacher a new temporary password, printed once. |
| `npm run test-checks` | Runs hand-made cards through our card checks (marks, page numbers, rejects, repeats, extra cards) and prints PASS or FAIL for each. Makes no AI call. |

## Check that it runs

- http://localhost:3000/api/health shows `status: "ok"`, whether each AI key is set, and `db: true` when the database answers.
- `npm run db:check` shows whether the database is reachable and how many Teachers there are.

## Teacher accounts (admins only)

Admins add Teachers and reset passwords from the command line (no admin screens yet). Both commands work in Windows cmd and PowerShell; the `--` passes the options on to the script.

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

Emails are always saved trimmed and lowercase. Passwords are stored only as bcrypt hashes (bcryptjs, cost 12; `src/auth/passwords.ts`). Teacher passwords must be at least 8 characters.

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
- **Every `/api/lessons...` and `/api/questions...` address needs the token.** No token, a wrong or expired token, a deleted Teacher or a reset password: `401 LOGIN_NEEDED` "Please log in again.". Only `/`, `/api/health` and the login address are open.
- **Database not reachable:** `503 DB_UNAVAILABLE` "We can't reach KIDDEX right now. Please try again in a minute." (after one more try a second later, for a database that is waking up).

Try it (PowerShell or cmd):

```
curl -H "Content-Type: application/json" -d "{\"email\":\"mr.gucci@kiddex.test\",\"password\":\"<password>\"}" http://localhost:3000/api/auth/teacher/login
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/me
```

## Addresses

| Address | What it does |
| --- | --- |
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

**Memory only, for testing:** lessons and questions live in `src/store/lessonStore.ts` until the server stops (at most 30 lessons; when full, the oldest that is not making is removed). A database replaces the inside of that file later; the addresses stay the same. Every lesson belongs to the logged-in Teacher (its `ownerId` is the Teacher's id, from `src/auth/currentTeacher.ts`); another Teacher's lesson or question answers `404`.

Try it (with a token from the login address):

```
curl -H "Authorization: Bearer <token>" -F "file=@C:\path\to\lesson.docx" http://localhost:3000/api/lessons/extract
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"topic\":\"Fractions\",\"subject\":\"Math\",\"grade\":4,\"games\":[\"quiz-show\"]}" http://localhost:3000/api/lessons/<lessonId>/generate
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/lessons/<lessonId>
```

### How questions are made

- The AI gets only the lesson text, subject, topic and grade. Never the file name or any name. Gemini gets up to 6000 words of lesson text; Groq up to 2500 (cut at the end of a page or slide).
- The AI answers with one list per picked game: `{ "matchUp": [...], "fillBlank": [...], "quizShow": [...] }` (only the picked ones). The instructions describe Match Up first, then Fill the Blank, then Quiz Show, each with its own exact count. Gemini gets this shape as a JSON schema; for Groq a missing list just means 0 cards for that game.
- Every answer is capped at 3500 tokens. Groq's free plan allows 8000 tokens per minute, so each Groq request is estimated first (characters / 4 + 3500) and the lesson text is cut further if the estimate is above 7000. Groq runs with `reasoning_effort: "none"` (no thinking tokens).
- `AI_ORDER` in `.env` (default `gemini,groq`) sets which AI is tried first. An AI without a key is skipped. The first AI gets `AI_TIMEOUT_MS`; if it is busy, too slow, says "too many requests" or answers badly, the next one is used right away. The browser is never told which AI answered.
- The last AI (45 s limit) gets one more try: after 3 s if it was busy, or after the wait it asks for (at most 65 s) if it said "too many requests". For Groq that wait is the larger of its `retry-after` and `x-ratelimit-reset-tokens` headers. If the last AI fails and an earlier one only said "too many requests", that one gets the one more try instead, after what is left of its wait.
- An AI that was busy, slow or rate limited is not tried first for the next 2 minutes (it is still the backup). This note is kept in memory, so it is lost on restart.
- One job never runs longer than 180 s. While waiting for an AI the job shows `step: "waiting"`.
- The AI is asked for 35% more cards than we keep (Quiz Show 14, Match Up 9, Fill the Blank 11). If a game gets more good cards than its target (10 / 6 / 8), the best ones are kept (unmarked first, level mix close to 40/35/25) and the rest count as `extra` in the summary.
- Our code checks every card (`src/lessons/checkCards.ts`): card format, 4 choices for Quiz Show, 3 word-bank words and one `___` for Fill the Blank, no repeated questions or pair sides. A card whose `sourceQuote` cannot be found in the lesson gets `flag: "not_in_lesson"`; a card the AI was unsure about gets `flag: "ai_unsure"`.
- If a game has fewer good cards than it needs to be playable (Quiz Show 3, Match Up 4, Fill the Blank 3), any AI is asked once more for that game only (its own list, the missing number plus 2, the shorter 2500-word lesson text, and the questions we already have so they are not repeated). Before a top-up goes to Groq, we wait until 60 s have passed since Groq's last answer. If that fails, the job still finishes and that game shows `enough: false`. The job fails with `NO_GOOD_QUESTIONS` only if no game is playable.
- The numbers (cards per game, extra factor, waits, job time limit, word limits, Groq token budget, answer cap) are in `src/lessons/limits.ts`.

Try it: `curl -H "Authorization: Bearer <token>" -F "file=@C:\path\to\lesson.pdf" http://localhost:3000/api/lessons/extract`

Errors always look like `{ "error": { "code": "...", "message": "..." } }`. Login codes: `LOGIN_NEEDED`, `WRONG_LOGIN`, `TOO_MANY_TRIES`, `DB_UNAVAILABLE`. Lesson codes: `NO_FILE`, `ONE_FILE_ONLY`, `FILE_TOO_BIG`, `OLD_FORMAT`, `WRONG_TYPE`, `PDF_LOCKED`, `CANT_READ`. Lesson and question codes: `LESSON_NOT_FOUND`, `QUESTION_NOT_FOUND`, `ALREADY_MAKING`, `ALREADY_HAS_QUESTIONS`, `MARKED_NOT_CHECKED`, `NO_QUESTIONS`, `BAD_REQUEST`, `TOO_MANY_GAMES`, `NOT_ENOUGH_TEXT`, `AI_BUSY`. A failed lesson shows `AI_BUSY` or `NO_GOOD_QUESTIONS` in its `error`.

The limits (file size, word levels) are in `src/lessons/limits.ts`.
