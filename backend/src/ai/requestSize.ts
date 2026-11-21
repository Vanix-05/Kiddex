// A rough size of one AI request in tokens: about 4 characters per token for what we send,
// plus the most the answer may use (the request's own cap). Groq counts both against its per-minute budget.
import { MAX_OUTPUT_TOKENS } from "../lessons/limits";

export function estimateRequestTokens(
  instructions: string,
  lessonText: string,
  maxOutputTokens: number = MAX_OUTPUT_TOKENS,
): number {
  return Math.ceil((instructions.length + lessonText.length) / 4) + maxOutputTokens;
}
