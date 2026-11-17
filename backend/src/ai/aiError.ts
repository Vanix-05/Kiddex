// The short, typed error every AI provider throws, plus the helpers that turn the
// libraries' own errors and the model's raw answer into it.
// The `detail` is for the server console only and never holds a key or the AI's own error text.

// "rate_limited" = the AI said "too many requests" (HTTP 429); "busy" = overloaded (503 and similar).
export type AiErrorKind = "busy" | "rate_limited" | "timeout" | "bad_key" | "bad_answer";

/** Used when a 429 answer does not say how long to wait. */
const DEFAULT_RETRY_AFTER_S = 20;

export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    public readonly detail: string,
    /** Only for "rate_limited": how long the AI asked us to wait. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(`${kind}: ${detail}`);
    this.name = "AiError";
  }
}

/** Reads "7.66s", "1m2.5s", "250ms" or a plain number of seconds. Returns seconds, or undefined. */
export function parseDuration(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const plain = Number(value);
  if (Number.isFinite(plain)) return plain >= 0 ? plain : undefined;
  const match = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/.exec(value.trim());
  if (!match || !match.slice(1).some(Boolean)) return undefined;
  const [, h = "0", m = "0", s = "0", ms = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

function header(err: unknown, name: string): string | null | undefined {
  const headers = (err as { headers?: unknown })?.headers;
  if (headers && typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
  if (headers && typeof headers === "object") return (headers as Record<string, string>)[name];
  return undefined;
}

/**
 * How long a 429 answer asks us to wait. Groq: the LARGER of retry-after and
 * x-ratelimit-reset-tokens. Gemini: the wait written in the error message
 * ("retryDelay": "33s" / "Please retry in 33.5s"). Only the number is read.
 */
function retryAfterSeconds(err: unknown): number {
  const fromHeaders = [parseDuration(header(err, "retry-after")), parseDuration(header(err, "x-ratelimit-reset-tokens"))]
    .filter((n): n is number => n !== undefined && n > 0);
  if (fromHeaders.length) return Math.ceil(Math.max(...fromHeaders));

  const message = err instanceof Error ? err.message : "";
  const match =
    /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message) ?? /(?:retry|try again) in (\d+(?:\.\d+)?)\s*s/i.exec(message);
  const fromMessage = Number(match?.[1]);
  return Number.isFinite(fromMessage) && fromMessage > 0 ? Math.ceil(fromMessage) : DEFAULT_RETRY_AFTER_S;
}

/** Turns any error from an AI library into an AiError, using only the HTTP status and wait headers. */
export function toAiError(err: unknown, timedOut: boolean): AiError {
  if (err instanceof AiError) return err;
  if (timedOut) return new AiError("timeout", "no answer in time");

  const status = (err as { status?: unknown })?.status;
  const name = (err as { constructor?: { name?: string } })?.constructor?.name ?? "";
  const message = err instanceof Error ? err.message.toLowerCase() : "";

  if (name === "APIConnectionTimeoutError") return new AiError("timeout", "no answer in time");
  if (status === 401 || status === 403) return new AiError("bad_key", `key rejected (HTTP ${status})`);
  if (status === 400 && /api key|api_key/.test(message)) return new AiError("bad_key", "key rejected (HTTP 400)");
  if (status === 404) return new AiError("bad_key", "model not found (HTTP 404)");
  if (status === 400 || status === 422) return new AiError("bad_answer", `request refused (HTTP ${status})`);
  if (status === 429) {
    const wait = retryAfterSeconds(err);
    return new AiError("rate_limited", `HTTP 429, asks to wait ${wait} s`, wait);
  }
  if (status === 408 || (typeof status === "number" && status >= 500)) {
    return new AiError("busy", `HTTP ${status}`);
  }
  return new AiError("busy", typeof status === "number" ? `HTTP ${status}` : "could not reach the AI");
}

/**
 * Reads the model's answer as a JSON object. Removes a <think>...</think> part and ```json fences
 * first. Which lists are in it is checked later (a missing list just means 0 cards).
 */
export function parseAnswerJson(answer: string | undefined | null): Record<string, unknown> {
  if (!answer) throw new AiError("bad_answer", "empty answer");
  const text = answer
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*<\/think>/i, "") // a think part whose opening tag was cut off
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiError("bad_answer", "answer was not valid JSON");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new AiError("bad_answer", "answer was not a JSON object");
  return json as Record<string, unknown>;
}

/** Runs `task` with an abort signal that fires after `timeoutMs`; a timeout becomes AiError "timeout". */
export async function withTimeout<T>(timeoutMs: number, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } catch (err) {
    throw toAiError(err, controller.signal.aborted);
  } finally {
    clearTimeout(timer);
  }
}
