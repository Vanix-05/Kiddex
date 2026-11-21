// A tiny in-memory note per AI provider:
//   - when it was last busy, too slow or rate limited: for 2 minutes after that it is not tried
//     FIRST (it is still used as the backup), so Teachers do not all wait on an AI that is down;
//   - its per-minute token budget as its last answer reported it (Groq's x-ratelimit-* headers),
//     so the next request waits only when the budget is really too low.
// Lost on restart.
import type { AiProviderName } from "../config/env";

const SKIP_AS_FIRST_MS = 2 * 60 * 1000;
const downSince = new Map<AiProviderName, number>();
const tokenBudget = new Map<AiProviderName, { remainingTokens: number; resetsAt: number }>();

export function markDown(name: AiProviderName): void {
  downSince.set(name, Date.now());
}

export function markOk(name: AiProviderName): void {
  downSince.delete(name);
}

export function wasRecentlyDown(name: AiProviderName): boolean {
  const since = downSince.get(name);
  return since !== undefined && Date.now() - since < SKIP_AS_FIRST_MS;
}

/** Saves the budget an answer reported: tokens left, and seconds until the budget is full again. */
export function noteTokenBudget(
  name: AiProviderName,
  remainingTokens: number,
  resetSeconds: number,
  now: number = Date.now(),
): void {
  tokenBudget.set(name, { remainingTokens, resetsAt: now + resetSeconds * 1000 });
}

/**
 * Seconds to wait before a request of `neededTokens` fits this provider's budget:
 * 0 if we know nothing, if enough tokens are left, or if the reset time has passed;
 * otherwise the seconds until the reset time, plus 1.
 */
export function tokenWaitSeconds(name: AiProviderName, neededTokens: number, now: number = Date.now()): number {
  const budget = tokenBudget.get(name);
  if (!budget || budget.remainingTokens >= neededTokens || now >= budget.resetsAt) return 0;
  return Math.ceil((budget.resetsAt - now) / 1000) + 1;
}
