// Google Gemini provider (@google/genai). JSON output held to our answer shape with a
// responseSchema (one required list per game, with minItems), temperature 0.3,
// answer capped at MAX_OUTPUT_TOKENS, no automatic retries. Lesson text up to MAX_WORDS_TO_AI.
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { lessonTextForAi } from "../../lessons/lessonForAi";
import { MAX_OUTPUT_TOKENS, MAX_WORDS_TO_AI } from "../../lessons/limits";
import { AiError, parseAnswerJson, withTimeout } from "../aiError";
import { geminiSchema } from "../answerShape";
import { estimateRequestTokens } from "../requestSize";
import type { AiProvider } from "../types";

let client: GoogleGenAI | undefined;

export const gemini: AiProvider = {
  name: "gemini",
  model: env.geminiModel,
  hasKey: Boolean(env.geminiApiKey),

  async ask(request, timeoutMs) {
    // attempts: 1 = no automatic retries (the library retries up to 5 times by default).
    client ??= new GoogleGenAI({ apiKey: env.geminiApiKey, httpOptions: { retryOptions: { attempts: 1 } } });
    const ai = client;

    const lesson = lessonTextForAi(request.lesson, Math.min(request.maxLessonWords, MAX_WORDS_TO_AI));
    const estimatedTokens = estimateRequestTokens(request.instructions, lesson.text);
    console.log(`[ai] gemini request estimate: ${estimatedTokens} tokens`);

    const response = await withTimeout(timeoutMs, (signal) =>
      ai.models.generateContent({
        model: env.geminiModel,
        contents: lesson.text,
        config: {
          systemInstruction: request.instructions,
          responseMimeType: "application/json",
          responseSchema: geminiSchema(request.lists),
          temperature: 0.3,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          abortSignal: signal,
        },
      }),
    );
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      throw new AiError("bad_answer", "answer hit the length cap");
    }
    return { json: parseAnswerJson(response.text), lesson: { ...lesson, estimatedTokens } };
  },
};
