// The Student's games on the database (gp-1):
//   studentGames(studentId)      → everything the game screens need (GET /api/student/games)
//   saveRound(studentId, round)  → saves one finished round (POST /api/student/rounds)
// A Student only ever sees their own section's assignments and their own rounds.
// The rules themselves (XP, stars, streak, level, mission, board) are pure functions
// in src/games/; the difficulty engine is rule-based, not AI.
// Never log ids, School IDs or answers.
import { fromDb } from "../auth/authErrors";
import { loginNeeded } from "../auth/accountLogin";
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type CardType, type TemplateId } from "../content/questionCard";
import { prisma } from "../db/prisma";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../middleware/AppError";
import { dueDateText } from "../sections/dueDate";
import { makeBoard, type Board } from "../games/board";
import { decideAfterRound, START_LEVEL, type Decision, type Level } from "../games/difficulty";
import { pickMission, type MissionCandidate } from "../games/mission";
import { levelFromXp, missionMaxXp, ROUND_SIZE, starsEarned, starsFor, xpFor } from "../games/rewards";
import { nextStreak, phDay, shownStreak } from "../games/streak";

/** The games in their usual order. */
export const GAMES = ["quiz-show", "match-up", "fill-blank"] as const satisfies readonly TemplateId[];

const TYPE_FOR_GAME: Record<TemplateId, CardType> = {
  "quiz-show": "multiple_choice",
  "match-up": "matching_pair",
  "fill-blank": "fill_blank",
};

const CARD_NOUN: Record<TemplateId, string> = {
  "quiz-show": "questions",
  "match-up": "pairs",
  "fill-blank": "sentences",
};

export const gameErrors = {
  gameNotFound: () => new AppError(404, "GAME_NOT_FOUND", "This game isn't in your lessons any more."),
  badRound: (message = "This round could not be saved.") => new AppError(400, "BAD_ROUND", message),
  roundTaken: () => new AppError(409, "ROUND_TAKEN", "This round could not be saved. Please play it again."),
};

// ---------- Progress ----------

export interface Progress {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpGoal: number;
  stars: number;
  streakDays: number;
}

/** The streak is shown only while it is still going (today or yesterday, Philippine time). */
const progressOf = (
  s: { xp: number; stars: number; streakDays: number; lastPlayDay: string | null },
  now = new Date(),
): Progress => ({
  xp: s.xp,
  ...levelFromXp(s.xp),
  stars: s.stars,
  streakDays: shownStreak(s.lastPlayDay, s.streakDays, phDay(now)),
});

const PROGRESS_FIELDS = { xp: true, stars: true, streakDays: true, lastPlayDay: true } satisfies Prisma.StudentSelect;

// ---------- GET /api/student/games ----------

const CARD_FIELDS = {
  id: true,
  lessonId: true,
  type: true,
  prompt: true,
  choices: true,
  answer: true,
  subject: true,
  topic: true,
  grade: true,
  level: true,
  explanation: true,
  status: true,
} satisfies Prisma.QuestionSelect;

type CardRow = Prisma.QuestionGetPayload<{ select: typeof CARD_FIELDS }>;

/** The QuestionCard shape the games read (no sourceQuote, no flag). */
const toCard = ({ explanation, ...card }: CardRow) => (explanation ? { ...card, explanation } : card);

export interface GameEntry {
  id: TemplateId;
  playable: boolean;
  reason?: string;
  bestStars: number;
  done: boolean;
}

export interface StudentGames {
  progress: Progress;
  levels: Record<string, Level>;
  lessons: {
    assignmentId: string;
    lessonId: string;
    name: string;
    lessonTitle: string;
    subject: string | null;
    grade: number | null;
    teacher: string;
    dueDate: string | null;
    assignedAt: string;
    games: GameEntry[];
    cards: ReturnType<typeof toCard>[];
  }[];
  mission: {
    assignmentId: string;
    state: "open" | "complete";
    games: TemplateId[];
    done: TemplateId[];
    maxXp: number;
    board: Board;
  } | null;
}

const lessonTitle = (topic: string | null, fileName: string) => topic?.trim() || fileName.replace(/\.[^.]+$/, "");

/**
 * Three queries, run together (never one per lesson): the Student with their topic
 * levels, the section's assignments with lesson + approved questions + Teacher, and
 * the Student's rounds grouped by lesson / game / assignment.
 */
export async function studentGames(studentId: string, now = new Date()): Promise<StudentGames> {
  const [student, assignments, groups] = await fromDb(() =>
    Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { ...PROGRESS_FIELDS, topicLevels: { select: { topicKey: true, level: true } } },
      }),
      prisma.assignment.findMany({
        where: { section: { students: { some: { id: studentId } } }, lesson: { status: "approved" } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          name: true,
          games: true,
          dueDate: true,
          createdAt: true,
          lesson: {
            select: {
              id: true,
              topic: true,
              fileName: true,
              subject: true,
              grade: true,
              owner: { select: { name: true } },
              questions: { where: { status: "approved" }, orderBy: { position: "asc" }, select: CARD_FIELDS },
            },
          },
        },
      }),
      prisma.gameRound.groupBy({
        by: ["lessonId", "game", "assignmentId", "countsForMission"],
        where: { studentId },
        _max: { stars: true, createdAt: true },
      }),
    ]),
  );
  if (!student) throw loginNeeded();

  // Best stars per lesson + game; when each game was done per assignment.
  const bestStars = new Map<string, number>();
  const doneAt = new Map<string, Date>();
  for (const g of groups) {
    const key = `${g.lessonId}|${g.game}`;
    bestStars.set(key, Math.max(bestStars.get(key) ?? 0, g._max.stars ?? 0));
    if (g.countsForMission && g.assignmentId && g._max.createdAt)
      doneAt.set(`${g.assignmentId}|${g.game}`, g._max.createdAt);
  }

  const candidates: MissionCandidate[] = [];
  const extras = new Map<string, { counts: Record<TemplateId, number>; board: Board }>();

  const lessons = assignments.map((a) => {
    const { lesson } = a;
    const counts: Record<TemplateId, number> = { "quiz-show": 0, "match-up": 0, "fill-blank": 0 };
    for (const q of lesson.questions) counts[TEMPLATE_FOR_TYPE[q.type]]++;

    const assigned = GAMES.filter((g) => a.games.includes(g));
    const games: GameEntry[] = assigned.map((id) => {
      const playable = counts[id] >= MIN_CARDS[id];
      return {
        id,
        playable,
        ...(playable ? {} : { reason: `Needs at least ${MIN_CARDS[id]} approved ${CARD_NOUN[id]}.` }),
        bestStars: bestStars.get(`${lesson.id}|${id}`) ?? 0,
        done: doneAt.has(`${a.id}|${id}`),
      };
    });

    const playable = games.filter((g) => g.playable).map((g) => g.id);
    const done = playable.filter((g) => doneAt.has(`${a.id}|${g}`));
    const doneTimes = done.map((g) => doneAt.get(`${a.id}|${g}`)!.getTime());
    candidates.push({
      assignmentId: a.id,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      games: playable,
      done,
      lastDoneAt: doneTimes.length ? new Date(Math.max(...doneTimes)) : null,
    });
    extras.set(a.id, { counts, board: makeBoard(lesson.questions) });

    const assignedTypes = new Set(assigned.map((g) => TYPE_FOR_GAME[g]));
    return {
      assignmentId: a.id,
      lessonId: lesson.id,
      name: a.name,
      lessonTitle: lessonTitle(lesson.topic, lesson.fileName),
      subject: lesson.subject,
      grade: lesson.grade,
      teacher: lesson.owner.name,
      dueDate: a.dueDate ? dueDateText(a.dueDate) : null,
      assignedAt: a.createdAt.toISOString(),
      games,
      cards: lesson.questions.filter((q) => assignedTypes.has(q.type)).map(toCard),
    };
  });

  const pick = pickMission(candidates, phDay(now));
  let mission: StudentGames["mission"] = null;
  if (pick) {
    const chosen = candidates.find((c) => c.assignmentId === pick.assignmentId)!;
    const { counts, board } = extras.get(pick.assignmentId)!;
    mission = {
      assignmentId: pick.assignmentId,
      state: pick.state,
      games: [...chosen.games],
      done: [...chosen.done],
      maxXp: missionMaxXp(chosen.games.map((game) => ({ game, cards: counts[game] }))),
      board,
    };
  }

  return {
    progress: progressOf(student, now),
    levels: Object.fromEntries(student.topicLevels.map((t) => [t.topicKey, t.level])),
    lessons,
    mission,
  };
}

// ---------- POST /api/student/rounds ----------

export interface RoundInput {
  clientRoundId: string;
  assignmentId: string;
  game: TemplateId;
  startedAt: Date;
  endedAt: Date;
  helpsUsed: number;
  answers: { questionId: string; right: boolean; tries: number; ms: number; helped: boolean }[];
}

export interface RoundAnswerView {
  round: {
    xp: number;
    stars: number;
    starsEarned: number;
    decision: Decision;
    countsForMission: boolean;
    missionDone: TemplateId[];
  };
  progress: Progress;
}

const ROUND_FIELDS = {
  id: true,
  studentId: true,
  assignmentId: true,
  xp: true,
  stars: true,
  starsEarned: true,
  endLevel: true,
  change: true,
  reason: true,
  countsForMission: true,
  createdAt: true,
} satisfies Prisma.GameRoundSelect;

type SavedRound = Prisma.GameRoundGetPayload<{ select: typeof ROUND_FIELDS }>;
type Db = Prisma.TransactionClient | typeof prisma;

const FUTURE_LIMIT_MS = 5 * 60 * 1000;

/** This assignment's done games (countsForMission), up to `until`, in the usual order. */
async function missionDone(
  db: Db,
  studentId: string,
  assignmentId: string | null,
  until?: Date,
): Promise<TemplateId[]> {
  if (!assignmentId) return [];
  const rows = await db.gameRound.findMany({
    where: { studentId, assignmentId, countsForMission: true, ...(until ? { createdAt: { lte: until } } : {}) },
    select: { game: true },
    distinct: ["game"],
  });
  return GAMES.filter((g) => rows.some((r) => r.game === g));
}

const answerOf = (round: SavedRound, done: TemplateId[], progress: Progress): RoundAnswerView => ({
  round: {
    xp: round.xp,
    stars: round.stars,
    starsEarned: round.starsEarned,
    decision: { level: round.endLevel, change: round.change as Decision["change"], reason: round.reason },
    countsForMission: round.countsForMission,
    missionDone: done,
  },
  progress,
});

/**
 * The same round sent again (lost connection): nothing is saved, the first answer
 * is rebuilt from the saved round. Another Student's round id: 409 ROUND_TAKEN.
 */
async function replay(studentId: string, clientRoundId: string): Promise<RoundAnswerView | null> {
  const round = await fromDb(() => prisma.gameRound.findUnique({ where: { clientRoundId }, select: ROUND_FIELDS }));
  if (!round) return null;
  if (round.studentId !== studentId) throw gameErrors.roundTaken();
  const [done, student] = await fromDb(() =>
    Promise.all([
      missionDone(prisma, studentId, round.assignmentId, round.createdAt),
      prisma.student.findUnique({ where: { id: studentId }, select: PROGRESS_FIELDS }),
    ]),
  );
  if (!student) throw loginNeeded();
  return answerOf(round, done, progressOf(student));
}

/** The most common topic among the questions (a tie goes to the first one played). */
function roundTopic(topics: readonly string[]): string {
  const count = new Map<string, number>();
  for (const t of topics) count.set(t, (count.get(t) ?? 0) + 1);
  let best = topics[0]!;
  for (const t of topics) if (count.get(t)! > count.get(best)!) best = t;
  return best;
}

const topicKeyOf = (topic: string) => topic.trim().toLowerCase();

const isUniqueClash = (err: unknown) => (err as { code?: unknown })?.code === "P2002";

export async function saveRound(studentId: string, input: RoundInput, now = new Date()): Promise<RoundAnswerView> {
  // 1. Sent before? Answer what was answered the first time.
  const again = await replay(studentId, input.clientRoundId);
  if (again) return again;

  // 2. Checks. The assignment must be in the Student's own section, its lesson approved,
  // and the game one of its games.
  const assignment = await fromDb(() =>
    prisma.assignment.findFirst({
      where: {
        id: input.assignmentId,
        section: { students: { some: { id: studentId } } },
        lesson: { status: "approved" },
      },
      select: { id: true, lessonId: true, games: true },
    }),
  );
  if (!assignment || !assignment.games.includes(input.game)) throw gameErrors.gameNotFound();

  const { answers } = input;
  if (answers.length < 1 || answers.length > ROUND_SIZE[input.game]) {
    throw gameErrors.badRound(`A round of this game has 1 to ${ROUND_SIZE[input.game]} answers.`);
  }
  const ids = answers.map((a) => a.questionId);
  if (new Set(ids).size !== ids.length) throw gameErrors.badRound("A question is in the round twice.");
  if (input.helpsUsed > answers.length) throw gameErrors.badRound("More helps than answers.");
  if (input.endedAt < input.startedAt) throw gameErrors.badRound("The round ends before it starts.");
  const latest = now.getTime() + FUTURE_LIMIT_MS;
  if (input.startedAt.getTime() > latest || input.endedAt.getTime() > latest) {
    throw gameErrors.badRound("The round's time is in the future.");
  }

  // Only approved questions of this lesson, of this game's type. Each answer's level
  // comes from here, never from the browser.
  const questions = await fromDb(() =>
    prisma.question.findMany({
      where: { id: { in: ids }, lessonId: assignment.lessonId, status: "approved", type: TYPE_FOR_GAME[input.game] },
      select: { id: true, topic: true, level: true },
    }),
  );
  if (questions.length !== ids.length) throw gameErrors.badRound("A question in this round can't be played any more.");
  const byId = new Map(questions.map((q) => [q.id, q]));
  const played = answers.map((a) => ({ ...a, question: byId.get(a.questionId)! }));

  // The round's numbers, worked out here with the src/games/ rules.
  const topic = roundTopic(played.map((p) => p.question.topic)).trim();
  const topicKey = topicKeyOf(topic);
  const right = answers.filter((a) => a.right).length;
  const helpedRight = answers.filter((a) => a.right && a.helped).length;
  const total = answers.length;
  const xp = xpFor(right, helpedRight);
  const stars = starsFor(right, total);
  const today = phDay(now);

  // 3. One transaction.
  const saved = await fromDb(
    async () => {
      try {
        return await prisma.$transaction(
          async (tx) => {
            // One after another: a transaction has one connection.
            const topicLevel = await tx.topicLevel.findUnique({
              where: { studentId_topicKey: { studentId, topicKey } },
              select: { level: true },
            });
            const best = await tx.gameRound.aggregate({
              where: { studentId, lessonId: assignment.lessonId, game: input.game },
              _max: { stars: true },
            });
            const earlierMission = await tx.gameRound.findFirst({
              where: { studentId, assignmentId: assignment.id, game: input.game, countsForMission: true },
              select: { id: true },
            });
            const student = await tx.student.findUnique({
              where: { id: studentId },
              select: { lastPlayDay: true, streakDays: true },
            });
            if (!student) throw loginNeeded();

            const startLevel: Level = topicLevel?.level ?? START_LEVEL;
            const decision = decideAfterRound(answers, startLevel);
            const earned = starsEarned(stars, best._max.stars ?? 0);
            const countsForMission = !earlierMission;
            const streak = nextStreak(student.lastPlayDay, student.streakDays, today);

            await tx.topicLevel.upsert({
              where: { studentId_topicKey: { studentId, topicKey } },
              create: { studentId, topicKey, topic, level: decision.level },
              update: { topic, level: decision.level },
            });

            const round = await tx.gameRound.create({
              data: {
                clientRoundId: input.clientRoundId,
                studentId,
                lessonId: assignment.lessonId,
                assignmentId: assignment.id,
                game: input.game,
                topic,
                startLevel,
                endLevel: decision.level,
                change: decision.change,
                reason: decision.reason,
                right,
                helpedRight,
                total,
                helpsUsed: input.helpsUsed,
                xp,
                stars,
                starsEarned: earned,
                countsForMission,
                startedAt: input.startedAt,
                endedAt: input.endedAt,
                answers: {
                  createMany: {
                    data: played.map((p, position) => ({
                      questionId: p.questionId,
                      position,
                      level: p.question.level,
                      right: p.right,
                      tries: p.tries,
                      ms: p.ms,
                      helped: p.helped,
                    })),
                  },
                },
              },
              select: ROUND_FIELDS,
            });

            const updated = await tx.student.update({
              where: { id: studentId },
              data: { xp: { increment: xp }, stars: { increment: earned }, ...streak },
              select: PROGRESS_FIELDS,
            });
            const done = await missionDone(tx, studentId, assignment.id);
            return answerOf(round, done, progressOf(updated, now));
          },
          { maxWait: 10_000, timeout: 15_000 },
        );
      } catch (err) {
        // Sent twice at the same moment: the other copy saved first (clientRoundId is unique).
        if (isUniqueClash(err)) return null;
        throw err;
      }
    },
    // Not tried twice: it adds XP.
    { retry: false },
  );
  if (saved) return saved;
  const first = await replay(studentId, input.clientRoundId);
  if (!first) throw gameErrors.roundTaken();
  return first;
}
