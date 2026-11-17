// `npm run check-keys`: sends one tiny request to each AI provider to see if
// the key and model in .env work. It never prints a key, not even part of it.
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { env } from "../config/env";

const LIMIT_MS = 30_000;
const PROMPT = "Reply with the single word: ok";

class TimeoutError extends Error {}

// Runs `task` with an abort signal and gives up after LIMIT_MS.
async function withLimit<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMIT_MS);
  try {
    return await task(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) throw new TimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Turns any error into a short, safe reason. Raw error text is never printed,
// because some providers repeat parts of the request in their messages.
function shortReason(err: unknown): string {
  if (err instanceof TimeoutError) return "the AI is busy, try again";
  const status = (err as { status?: unknown })?.status;
  const text = err instanceof Error ? err.message.toLowerCase() : "";

  if (status === 401 || status === 403) return "the key was rejected";
  if (status === 400 && /api key|api_key|invalid_api_key/.test(text)) return "the key was rejected";
  if (status === 404 || /model_not_found|model .*not found|does not exist/.test(text)) return "model not found";
  if (status === 503 || status === 504 || /timed? ?out/.test(text)) return "the AI is busy, try again";
  if (status === 429) return "too many requests or quota used up, try again later";
  if (typeof status === "number") return `unexpected answer from the AI (HTTP ${status})`;
  return "could not reach the AI, check the internet connection";
}

function seconds(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)} s`;
}

async function checkGemini(): Promise<void> {
  if (!env.geminiApiKey) {
    console.log("Gemini: no key in .env");
    return;
  }
  const label = `Gemini (${env.geminiModel})`;
  const start = Date.now();
  try {
    // attempts: 1 = one request only (the library retries up to 5 times by default).
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey, httpOptions: { retryOptions: { attempts: 1 } } });
    await withLimit((signal) =>
      ai.models.generateContent({
        model: env.geminiModel,
        contents: PROMPT,
        config: { maxOutputTokens: 64, abortSignal: signal },
      }),
    );
    console.log(`${label}: OK, ${seconds(start)}`);
  } catch (err) {
    console.log(`${label}: FAILED, ${shortReason(err)}`);
  }
}

async function checkGroq(): Promise<void> {
  if (!env.groqApiKey) {
    console.log("Groq: no key in .env");
    return;
  }
  const label = `Groq (${env.groqModel})`;
  const start = Date.now();
  try {
    const groq = new Groq({ apiKey: env.groqApiKey, maxRetries: 0, timeout: LIMIT_MS });
    await withLimit((signal) =>
      groq.chat.completions.create(
        {
          model: env.groqModel,
          messages: [{ role: "user", content: PROMPT }],
          max_completion_tokens: 64,
        },
        { signal },
      ),
    );
    console.log(`${label}: OK, ${seconds(start)}`);
  } catch (err) {
    const timedOut = err instanceof Error && err.constructor.name === "APIConnectionTimeoutError";
    console.log(`${label}: FAILED, ${timedOut ? "the AI is busy, try again" : shortReason(err)}`);
  }
}

async function main(): Promise<void> {
  await checkGemini();
  await checkGroq();
}

main();
