# KIDDEX backend

Express 5 + TypeScript API for KIDDEX.

## Install

```
cd backend
npm install
```

## Settings (.env)

1. Copy `.env.example` to `.env` (in this `backend/` folder).
2. Paste your keys after `GEMINI_API_KEY=` and `GROQ_API_KEY=`.
   - Gemini key: https://aistudio.google.com/apikey
   - Groq key: https://console.groq.com/keys
3. Never commit `.env`. It is already in `.gitignore`.
4. Optional: `AI_ORDER=gemini,groq` sets which AI is tried first (see "How questions are made").

The server still starts without keys; the AI features just won't work yet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API at http://localhost:3000 and restarts on every code change. |
| `npm run build` | Checks the TypeScript and builds it into `dist/`. |
| `npm start` | Runs the built version from `dist/` (run `npm run build` first). |
| `npm run check-keys` | Sends one tiny test request to Gemini and Groq and says if each key and model work. |
| `npm run read-file -- "C:\path\to\lesson.pdf"` | Reads a lesson file (PDF, .docx, .pptx) without the screens and prints the counts and the first 200 characters of each page or slide. |
| `npm run make-questions -- "C:\path\to\lesson.docx" --games quiz-show,match-up --topic "Equivalent Fractions" --subject Math --grade 4` | Makes question cards from a lesson file without the screens, through the same store as the addresses (creates a lesson, makes its questions, prints the lesson id). Prints which AI answered, the seconds, cards per game and level, marks, rejects and top-up, and saves the full cards to `backend/results/` (not committed). Add `--order groq,gemini` to change the AI order for one run. |
| `npm run test-checks` | Runs hand-made cards through our card checks (marks, page numbers, rejects, repeats, extra cards) and prints PASS or FAIL for each. Makes no AI call. |

## Check that it runs

- http://localhost:3000/api/health shows `status: "ok"` and whether each AI key is set.

## Addresses

| Address | What it does |
| --- | --- |
| `GET /api/health` | Server status, and whether each AI key is set. |
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

**Memory only, for testing:** lessons and questions live in `src/store/lessonStore.ts` until the server stops (at most 30 lessons; when full, the oldest that is not making is removed). A database replaces the inside of that file later; the addresses stay the same. Every lesson belongs to `"demo-teacher"` (`src/auth/currentTeacher.ts`) until real login exists; another owner's lesson or question answers `404`.

Try it:

```
curl -F "file=@C:\path\to\lesson.docx" http://localhost:3000/api/lessons/extract
curl -X POST -H "Content-Type: application/json" -d "{\"topic\":\"Fractions\",\"subject\":\"Math\",\"grade\":4,\"games\":[\"quiz-show\"]}" http://localhost:3000/api/lessons/<lessonId>/generate
curl http://localhost:3000/api/lessons/<lessonId>
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

Try it: `curl -F "file=@C:\path\to\lesson.pdf" http://localhost:3000/api/lessons/extract`

Errors always look like `{ "error": { "code": "...", "message": "..." } }`. Lesson codes: `NO_FILE`, `ONE_FILE_ONLY`, `FILE_TOO_BIG`, `OLD_FORMAT`, `WRONG_TYPE`, `PDF_LOCKED`, `CANT_READ`. Lesson and question codes: `LESSON_NOT_FOUND`, `QUESTION_NOT_FOUND`, `ALREADY_MAKING`, `ALREADY_HAS_QUESTIONS`, `MARKED_NOT_CHECKED`, `NO_QUESTIONS`, `BAD_REQUEST`, `TOO_MANY_GAMES`, `NOT_ENOUGH_TEXT`, `AI_BUSY`. A failed lesson shows `AI_BUSY` or `NO_GOOD_QUESTIONS` in its `error`.

The limits (file size, word levels) are in `src/lessons/limits.ts`.
