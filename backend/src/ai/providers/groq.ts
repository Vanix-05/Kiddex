// Groq provider (groq-sdk). JSON mode, temperature 0.3, no automatic retries.
// Made to fit Groq's per-minute token budget:
//   - lesson text up to GROQ_MAX_LESSON_WORDS, cut further until the request estimate is ≤ 7,000 tokens
//   - answer capped at the request's own maxOutputTokens (MAX_OUTPUT_TOKENS when missing)
//   - every good answer's x-ratelimit-remaining-tokens / x-ratelimit-reset-tokens headers are
//     saved in providerHealth, so generateWithFallback knows if the next request fits
//   - reasoning_effort "none": Groq's docs say qwen3 models support "none" to turn reasoning off,
//     so no tokens are spent on thinking. A <think>...</think> part is still removed just in case.
import Groq from "groq-sdk";
import { env } from "../../config/env";
import { lessonTextForAi } from "../../lessons/lessonForAi";
import { GROQ_MAX_LESSON_WORDS, GROQ_TOKENS_PER_MINUTE, MAX_OUTPUT_TOKENS } from "../../lessons/limits";
import { AiError, parseAnswerJson, parseDuration, withTimeout } from "../aiError";
import { noteTokenBudget } from "../providerHealth";
import { estimateRequestTokens } from "../requestSize";
import type { AiProvider, AiRequest, SentLesson } from "../types";

/** Keep each request well below the per-minute budget. */
const MAX_REQUEST_TOKENS = GROQ_TOKENS_PER_MINUTE - 1000;
const MIN_LESSON_WORDS = 200;

let client: Groq | undefined;

/** The lesson text for Groq: at most GROQ_MAX_LESSON_WORDS, then cut by 15% steps until it fits. */
function fitLesson(request: AiRequest): SentLesson {
  const maxOutput = request.maxOutputTokens ?? MAX_OUTPUT_TOKENS;
  let maxWords = Math.min(request.maxLessonWords, GROQ_MAX_LESSON_WORDS);
  for (;;) {
    const lesson = lessonTextForAi(request.lesson, maxWords);
    const estimatedTokens = estimateRequestTokens(request.instructions, lesson.text, maxOutput);
    if (estimatedTokens <= MAX_REQUEST_TOKENS || maxWords <= MIN_LESSON_WORDS) {
      return { ...lesson, estimatedTokens };
    }
    maxWords = Math.max(MIN_LESSON_WORDS, Math.floor(maxWords * 0.85));
  }
}

/** Saves the token budget Groq reported in a good answer's headers (numbers only). */
function saveBudget(headers: Headers): void {
  const remaining = Number(headers.get("x-ratelimit-remaining-tokens") ?? NaN);
  const reset = parseDuration(headers.get("x-ratelimit-reset-tokens"));
  if (!Number.isFinite(remaining) || reset === undefined) return;
  noteTokenBudget("groq", remaining, reset);
  console.log(`[ai] groq budget left: ${remaining} tokens, full again in ${reset} s`);
}

export const groq: AiProvider = {
  name: "groq",
  model: env.groqModel,
  hasKey: Boolean(env.groqApiKey),

  estimateTokens: (request) => fitLesson(request).estimatedTokens,

  async ask(request, timeoutMs) {
    client ??= new Groq({ apiKey: env.groqApiKey, maxRetries: 0 });
    const ai = client;

    const lesson = fitLesson(request);
    console.log(`[ai] groq request estimate: ${lesson.estimatedTokens} tokens`);

    const { data: completion, response } = await withTimeout(timeoutMs, (signal) =>
      ai.chat.completions
        .create(
          {
            model: env.groqModel,
            temperature: 0.3,
            response_format: { type: "json_object" },
            reasoning_effort: "none",
            max_completion_tokens: request.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
            messages: [
              { role: "system", content: request.instructions },
              { role: "user", content: lesson.text },
            ],
          },
          { signal, timeout: timeoutMs },
        )
        .withResponse(),
    );
    saveBudget(response.headers);
    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") throw new AiError("bad_answer", "answer hit the length cap");
    return { json: parseAnswerJson(choice?.message?.content), lesson };
  },
};
