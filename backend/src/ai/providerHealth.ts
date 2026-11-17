// A tiny in-memory note per AI provider:
//   - when it was last busy, too slow or rate limited: for 2 minutes after that it is not tried
//     FIRST (it is still used as the backup), so Teachers do not all wait on an AI that is down;
//   - when it last answered, so a Groq top-up can wait until its per-minute budget is back.
// Lost on restart.
import type { AiProviderName } from "../config/env";

const SKIP_AS_FIRST_MS = 2 * 60 * 1000;
const downSince = new Map<AiProviderName, number>();
const answeredAt = new Map<AiProviderName, number>();

export function markDown(name: AiProviderName): void {
  downSince.set(name, Date.now());
}

export function markOk(name: AiProviderName): void {
  downSince.delete(name);
  answeredAt.set(name, Date.now());
}

export function wasRecentlyDown(name: AiProviderName): boolean {
  const since = downSince.get(name);
  return since !== undefined && Date.now() - since < SKIP_AS_FIRST_MS;
}

/** Seconds since this provider last answered, or undefined if it has not answered yet. */
export function secondsSinceAnswer(name: AiProviderName): number | undefined {
  const at = answeredAt.get(name);
  return at === undefined ? undefined : (Date.now() - at) / 1000;
}
