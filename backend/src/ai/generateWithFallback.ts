// Asks the AI providers in the order of AI_ORDER and returns the first good answer.
//   - A provider that was busy, slow or rate limited in the last 2 minutes is moved to the
//     back of the line (still used as the backup).
//   - Not the last provider: at most AI_TIMEOUT_MS; any failure → next provider right away.
//   - Last provider (45 s limit, or AI_TIMEOUT_MS when it is the only one) gets ONE more try:
//       rate limited (429) → after the wait it asks for (at most MAX_RATE_LIMIT_WAIT_S),
//       busy (503 etc.)    → after 3 s.
//   - If the last provider fails in another way but an earlier one was only rate limited,
//     that earlier one is now the only one left that works: wait what is left of its
//     wait time and try it ONE more time.
//   - Top-up requests to Groq first wait until 60 s have passed since its last answer.
//   - Nothing starts or waits past the job's deadline (MAX_JOB_SECONDS).
// Which provider answered is for the server console and the test command only, never the browser.
import { env, type AiProviderName } from "../config/env";
import { lessonErrors } from "../lessons/lessonErrors";
import { MAX_RATE_LIMIT_WAIT_S } from "../lessons/limits";
import { AiError, type AiErrorKind } from "./aiError";
import { markDown, markOk, secondsSinceAnswer, wasRecentlyDown } from "./providerHealth";
import { gemini } from "./providers/gemini";
import { groq } from "./providers/groq";
import type { AiProvider, AiRequest, SentLesson } from "./types";

/** "matchUp 9, quizShow 14": list lengths only, for the console. */
function listSizes(json: Record<string, unknown>): string {
  return Object.entries(json)
    .map(([key, value]) => `${key} ${Array.isArray(value) ? value.length : "not a list"}`)
    .join(", ") || "none";
}

const LAST_PROVIDER_TIMEOUT_MS = 45_000;
const BUSY_RETRY_WAIT_S = 3;
/** Do not start a call with less time than this left before the deadline. */
const MIN_CALL_MS = 10_000;

const PROVIDERS: Record<AiProviderName, AiProvider> = { gemini, groq };

export interface FallbackOptions {
  /** Overrides AI_ORDER (test command only). */
  order?: AiProviderName[];
  /** Time (ms since 1970) after which no call or wait may start. */
  deadline?: number;
  /** Called when we start waiting (seconds) and when we stop (0). */
  onWait?: (seconds: number) => void;
  /** A top-up request: a provider with a per-minute budget waits its gap after its last answer. */
  isTopUp?: boolean;
}

export interface AiAnswer {
  /** The answer object; which lists are in it is checked by toRawCards. */
  json: Record<string, unknown>;
  /** The lesson text this provider was sent (cut info and estimated request size). */
  lesson: SentLesson;
  provider: AiProviderName;
  model: string;
  /** Seconds the answering call took. */
  seconds: number;
  /** Seconds from the first try until the answer, failed tries and waits included. */
  totalSeconds: number;
  usedBackup: boolean;
  /** Why the first provider in the order did not answer (plain words), when a backup was used. */
  backupReason?: string;
  /** Each wait we made, in seconds. */
  waits: number[];
}

const REASON: Record<AiErrorKind | "no_key" | "recently_down", string> = {
  no_key: "no key in .env",
  recently_down: "it was busy in the last 2 minutes",
  busy: "it was busy",
  rate_limited: "it said too many requests",
  timeout: "it was too slow",
  bad_key: "the key or model was rejected",
  bad_answer: "its answer was not usable JSON",
};

export async function generateWithFallback(
  request: AiRequest,
  options: FallbackOptions = {},
): Promise<AiAnswer> {
  const order = options.order ?? env.aiOrder;
  const deadline = options.deadline ?? Infinity;
  const withKey = order.map((name) => PROVIDERS[name]).filter((provider) => provider.hasKey);
  if (!withKey.length) {
    console.warn("[ai] no AI has a key in .env");
    throw lessonErrors.aiBusy();
  }

  // Healthy providers first (in AI_ORDER), then the ones that were just down.
  const line = [...withKey.filter((p) => !wasRecentlyDown(p.name)), ...withKey.filter((p) => wasRecentlyDown(p.name))];
  let backupReason: string | undefined;
  if (!PROVIDERS[order[0]!]?.hasKey) backupReason = REASON.no_key;
  else if (line[0]!.name !== order[0]) {
    backupReason = REASON.recently_down;
    console.log(`[ai] skipping ${order[0]} as first choice (busy in the last 2 minutes), starting with ${line[0]!.name}`);
  }

  const startedAt = Date.now();
  const waits: number[] = [];

  /** One call. Returns the answer, or the AiError after logging it. */
  async function tryOnce(provider: AiProvider, timeoutMs: number): Promise<AiAnswer | AiError> {
    // Top-up to a provider with a per-minute budget (Groq): wait until its gap after the last answer has passed.
    const since = secondsSinceAnswer(provider.name);
    if (options.isTopUp && provider.gapAfterAnswerSeconds && since !== undefined && since < provider.gapAfterAnswerSeconds) {
      const gap = Math.ceil(provider.gapAfterAnswerSeconds - since);
      if (!(await waitFor(gap, provider, `${provider.name} answered ${Math.floor(since)} s ago`))) {
        return new AiError("timeout", "job time limit reached");
      }
    }

    const timeLeft = deadline - Date.now();
    if (timeLeft < MIN_CALL_MS) {
      console.warn(`[ai] job time limit reached, not calling ${provider.name}`);
      return new AiError("timeout", "job time limit reached");
    }
    const callStart = Date.now();
    try {
      const { json, lesson } = await provider.ask(request, Math.min(timeoutMs, timeLeft));
      markOk(provider.name);
      const usedBackup = provider.name !== order[0];
      const answer: AiAnswer = {
        json,
        lesson,
        provider: provider.name,
        model: provider.model,
        seconds: secondsSince(callStart),
        totalSeconds: secondsSince(startedAt),
        usedBackup,
        ...(usedBackup && backupReason ? { backupReason } : {}),
        waits,
      };
      console.log(
        `[ai] ${provider.name} answered in ${answer.seconds} s (total ${answer.totalSeconds} s)` +
          `${usedBackup ? ` (backup; first AI: ${backupReason})` : ""}; list sizes: ${listSizes(json)}`,
      );
      return answer;
    } catch (err) {
      const aiError = err instanceof AiError ? err : new AiError("busy", "unexpected error");
      if (!(err instanceof AiError)) console.error(`[ai] ${provider.name} unexpected error`, err);
      console.warn(`[ai] ${provider.name} failed after ${secondsSince(callStart)} s: ${aiError.kind} (${aiError.detail})`);
      if (aiError.kind === "busy" || aiError.kind === "timeout" || aiError.kind === "rate_limited") markDown(provider.name);
      if (provider.name === order[0] && !backupReason) backupReason = REASON[aiError.kind];
      return aiError;
    }
  }

  /** Waits `seconds` unless that would pass the deadline. Returns false if it did not wait. */
  async function waitFor(seconds: number, provider: AiProvider, why = "one more try"): Promise<boolean> {
    if (Date.now() + seconds * 1000 + MIN_CALL_MS > deadline) {
      console.warn(`[ai] not waiting ${seconds} s for ${provider.name}: it would pass the job time limit`);
      return false;
    }
    if (seconds > 0) {
      console.log(`[ai] waiting ${seconds} s for ${provider.name} (${why})`);
      options.onWait?.(seconds);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      options.onWait?.(0);
      waits.push(seconds);
    }
    return true;
  }

  const waitSecondsFor = (error: AiError) =>
    Math.min(error.retryAfterSeconds ?? MAX_RATE_LIMIT_WAIT_S, MAX_RATE_LIMIT_WAIT_S);

  // Earlier providers that were only rate limited, with when they failed.
  const rateLimited: { provider: AiProvider; error: AiError; failedAt: number }[] = [];

  for (const [index, provider] of line.entries()) {
    const isLast = index === line.length - 1;
    const timeoutMs = isLast && line.length > 1 ? LAST_PROVIDER_TIMEOUT_MS : env.aiTimeoutMs;

    const first = await tryOnce(provider, timeoutMs);
    if (!(first instanceof AiError)) return first;

    if (!isLast) {
      if (first.kind === "rate_limited") rateLimited.push({ provider, error: first, failedAt: Date.now() });
      continue; // go to the next provider right away
    }

    // Last provider: one more try after a rate-limited or busy answer.
    if (first.kind === "rate_limited" || first.kind === "busy") {
      const seconds = first.kind === "rate_limited" ? waitSecondsFor(first) : BUSY_RETRY_WAIT_S;
      if (await waitFor(seconds, provider)) {
        const second = await tryOnce(provider, timeoutMs);
        if (!(second instanceof AiError)) return second;
      }
    }
  }

  // Every provider failed. An earlier one that was only rate limited is the only one left
  // that works: wait what is left of its wait time and try it once more.
  const pending = rateLimited[0];
  if (pending) {
    const leftMs = waitSecondsFor(pending.error) * 1000 - (Date.now() - pending.failedAt);
    if (await waitFor(Math.max(0, Math.ceil(leftMs / 1000)), pending.provider)) {
      const again = await tryOnce(pending.provider, env.aiTimeoutMs);
      if (!(again instanceof AiError)) return again;
    }
  }

  throw lessonErrors.aiBusy();
}

function secondsSince(start: number): number {
  return Math.round((Date.now() - start) / 100) / 10;
}
