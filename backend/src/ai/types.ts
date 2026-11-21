// The one shape both AI providers share, so generateWithFallback can treat them the same.
import type { AiProviderName } from "../config/env";
import type { LessonForAi, LessonSource } from "../lessons/lessonForAi";
import type { ListCounts } from "./answerShape";

/** One question request, before it is fitted to a provider. */
export interface AiRequest {
  instructions: string;
  /** The read lesson; each provider builds its own lesson text from it (Groq gets less). */
  lesson: LessonSource;
  /** The lists to write and how many items each (also used for Gemini's schema). */
  lists: ListCounts;
  /** Most words of lesson text to send (a provider may send fewer). */
  maxLessonWords: number;
  /** Answer length cap in tokens (MAX_OUTPUT_TOKENS when missing). */
  maxOutputTokens?: number;
}

/** The lesson text a provider actually sent, and the estimated request size in tokens. */
export interface SentLesson extends LessonForAi {
  estimatedTokens: number;
}

export interface AiProvider {
  name: AiProviderName;
  model: string;
  hasKey: boolean;
  /**
   * Only for a provider with a per-minute token budget (Groq): the estimated size of this
   * request in tokens, the same estimate the provider uses to fit the lesson text.
   */
  estimateTokens?(request: AiRequest): number;
  /**
   * Sends the request and returns the parsed JSON answer (an object) and the lesson text sent.
   * Throws an AiError (busy, rate_limited, timeout, bad_key, bad_answer). Never retries by itself.
   */
  ask(request: AiRequest, timeoutMs: number): Promise<{ json: Record<string, unknown>; lesson: SentLesson }>;
}
