// `npm run test-checks`: runs hand-made cards through checkCards with a made-up lesson and
// prints PASS or FAIL for each rule. Makes NO AI call.
import { gameRequestOrder, toRawCards } from "../ai/answerShape";
import { noteTokenBudget, tokenWaitSeconds } from "../ai/providerHealth";
import { createCardChecker, keepBest, type RejectReason } from "../lessons/checkCards";
import type { QuestionCard, TemplateId } from "../content/questionCard";

const lesson = {
  id: "test-lesson",
  fileType: "pdf" as const,
  units: [
    { number: 1, text: "Plants need sunlight to make food.\nThe leaves catch the light." },
    { number: 2, text: "Roots take in water from the soil. Water moves up the stem to the leaves." },
  ],
};

function newChecker(games: TemplateId[]) {
  return createCardChecker({ lesson, subject: "Science", topic: "Plants", grade: 4, games });
}

/** Adds one card and says whether it was kept (with the card) or rejected (with the reason). */
function addOne(checker: ReturnType<typeof newChecker>, raw: object): { card?: QuestionCard; reason?: RejectReason } {
  const before = { ...checker.rejected() };
  if (checker.add([raw]) === 1) return { card: checker.cards().at(-1) };
  const after = checker.rejected();
  const reason = (Object.keys(after) as RejectReason[]).find((r) => (after[r] ?? 0) > (before[r] ?? 0));
  return { reason };
}

const mc = (prompt: string, extra: object = {}) => ({
  type: "multiple_choice",
  prompt,
  choices: ["Sunlight", "Sand", "Salt", "Smoke"],
  answer: "Sunlight",
  level: "easy",
  explanation: "The lesson says so.",
  sourcePage: 1,
  sourceQuote: "Plants need sunlight to make food.",
  unsure: false,
  ...extra,
});

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${detail})`}`);
}

const checker = newChecker(["quiz-show", "match-up", "fill-blank"]);

// 1. Quote not in the lesson
let r = addOne(checker, mc("What do plants need to make food?", { sourceQuote: "Plants eat pizza on Fridays.", sourcePage: 2 }));
check(
  "quote not in lesson -> flag not_in_lesson, no sourcePage",
  r.card?.flag === "not_in_lesson" && r.card.sourcePage === undefined && r.card.sourceQuote === undefined,
  JSON.stringify(r),
);

// 2. Real quote, wrong page from the AI
r = addOne(checker, mc("Where does water go after the roots?", {
  choices: ["Up the stem", "Into the sky", "Down the soil", "Into the sun"],
  answer: "Up the stem",
  sourceQuote: "Water moves up the stem to the leaves",
  sourcePage: 1,
}));
check("real quote -> page where OUR code found it (2, AI said 1)", r.card?.sourcePage === 2 && !r.card.flag, JSON.stringify(r));

// 3. unsure + real quote
r = addOne(checker, mc("What catches the light?", {
  choices: ["The leaves", "The roots", "The soil", "The water"],
  answer: "The leaves",
  sourceQuote: "The leaves catch the light.",
  unsure: true,
}));
check("unsure: true + real quote -> flag ai_unsure", r.card?.flag === "ai_unsure" && r.card.sourcePage === 1, JSON.stringify(r));
check("the unsure field is removed from the card", r.card !== undefined && !("unsure" in r.card), JSON.stringify(r.card));

// 4. Answer not one of the choices
r = addOne(checker, mc("What do roots take in?", { answer: "Water" }));
check("answer not in choices -> rejected", r.reason === "broke the card format", JSON.stringify(r));

// 5. Repeated question (different case, spaces and punctuation)
r = addOne(checker, mc("what do PLANTS need to make food ???"));
check("repeated question -> dropped", r.reason === "repeated question", JSON.stringify(r));

// 6. A pair that reuses a right side
const pair = (left: string, right: string) => ({
  type: "matching_pair", prompt: left, answer: right, choices: [], level: "easy",
  sourceQuote: "Roots take in water from the soil.", unsure: false,
});
addOne(checker, pair("Roots", "Take in water"));
r = addOne(checker, pair("Stem", "take in water!"));
check("pair reusing a right side -> dropped", r.reason === "pair side used twice", JSON.stringify(r));

// 7. Fill-blank with two ___
r = addOne(checker, {
  type: "fill_blank", prompt: "___ take in ___ from the soil.", choices: ["Roots", "Leaves", "Stems"], answer: "Roots",
  level: "medium", sourceQuote: "Roots take in water from the soil.", unsure: false,
});
check("fill-blank with two ___ -> rejected", r.reason === "blank problem", JSON.stringify(r));

// 8. A card type that was not picked
const quizOnly = newChecker(["quiz-show"]);
r = addOne(quizOnly, pair("Leaves", "Catch the light"));
check("card type not picked -> dropped", r.reason === "type not asked for", JSON.stringify(r));

// 9. Keeping the target number: unmarked cards first
const fake = (id: string, level: QuestionCard["level"], flag?: QuestionCard["flag"]) =>
  ({ id, level, ...(flag ? { flag } : {}) }) as QuestionCard;
const pool = [fake("a", "easy", "not_in_lesson"), fake("b", "easy"), fake("c", "medium"), fake("d", "hard"), fake("e", "easy")];
const kept = keepBest(pool, 3).map((card) => card.id).join("");
check("extra cards: keeps unmarked first with a level mix", kept === "bcd", `kept ${kept}`);

// 10. An answer without the matchUp list: 0 pairs, no crash. Types come from the list names.
try {
  const answerChecker = newChecker(["quiz-show", "match-up"]);
  const { type: _type, ...quizItem } = mc("What do plants need to make food?");
  const raw = toRawCards({ quizShow: [quizItem] }, ["quiz-show", "match-up"]);
  answerChecker.add(raw.cards);
  const broken = toRawCards({ quizShow: "oops", matchUp: null }, ["quiz-show", "match-up"]);
  answerChecker.add(broken.cards);
  check(
    "answer missing the matchUp list -> 0 pairs, no crash",
    answerChecker.count("match-up") === 0 && answerChecker.count("quiz-show") === 1 && raw.received["match-up"] === 0,
    `pairs ${answerChecker.count("match-up")}, quiz ${answerChecker.count("quiz-show")}`,
  );
} catch (err) {
  check("answer missing the matchUp list -> 0 pairs, no crash", false, `crashed: ${String(err)}`);
}

// 11. Groq's token budget: wait only when the next request does not fit, and only until the reset.
{
  const now = 1_000_000;
  noteTokenBudget("groq", 5000, 20, now); // 5,000 tokens left, full again in 20 s
  const enough = tokenWaitSeconds("groq", 4000, now);
  const notEnough = tokenWaitSeconds("groq", 6000, now + 5000); // 15 s left, plus 1
  const afterReset = tokenWaitSeconds("groq", 6000, now + 21_000);
  check(
    "tokenWaitSeconds: 0 when enough, seconds to reset + 1 when not, 0 after reset",
    enough === 0 && notEnough === 16 && afterReset === 0,
    `enough ${enough}, not enough ${notEnough}, after reset ${afterReset}`,
  );
}

// 12. One request per game: Match Up goes first.
{
  const order = gameRequestOrder(["quiz-show", "match-up"]).join(",");
  check("game request order for quiz-show + match-up -> match-up, quiz-show", order === "match-up,quiz-show", order);
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks PASS");
process.exitCode = failures ? 1 : 0;
