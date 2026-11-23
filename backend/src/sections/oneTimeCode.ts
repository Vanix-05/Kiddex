// One-time login codes: 6 random digits from crypto.randomInt (never Math.random).
// Saved with no dash ("482915"), shown as "482-915". Never log a code.
import { randomInt } from "node:crypto";

export const ONE_TIME_CODE_LENGTH = 6;

/** 6 random digits, e.g. "048291" (a leading 0 is fine). */
export function makeOneTimeCode(): string {
  return String(randomInt(0, 10 ** ONE_TIME_CODE_LENGTH)).padStart(ONE_TIME_CODE_LENGTH, "0");
}

/** "482915" → "482-915". */
export function showOneTimeCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** Give up after this many rounds (with a million codes this never happens in practice). */
const MAX_ROUNDS = 20;

/**
 * `count` different codes that `findTaken` says no other Student uses yet.
 * `findTaken` gets the candidates and answers the ones already in use; those are
 * made again until none is taken.
 */
export async function makeUniqueCodes(
  count: number,
  findTaken: (candidates: string[]) => Promise<Set<string>>,
): Promise<string[]> {
  const chosen = new Set<string>();
  for (let round = 0; round < MAX_ROUNDS && chosen.size < count; round++) {
    const candidates = new Set<string>();
    while (candidates.size < count - chosen.size) {
      const code = makeOneTimeCode();
      if (!chosen.has(code)) candidates.add(code);
    }
    const taken = await findTaken([...candidates]);
    for (const code of candidates) if (!taken.has(code)) chosen.add(code);
  }
  if (chosen.size < count) throw new Error("Could not make enough different one-time codes.");
  return [...chosen];
}
