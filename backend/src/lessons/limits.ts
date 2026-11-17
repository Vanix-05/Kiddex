// All the numbers that decide what a lesson file may be, how much text is enough,
// how many question cards we ask the AI for, and how long we wait. Change them here only.
export const MAX_FILE_MB = 10;
export const MIN_WORDS_TO_MAKE_QUESTIONS = 80;  // below this: blocked
export const LOW_TEXT_WORDS = 200;              // below this: allowed, with a soft warning
export const WORDS_PER_PAGE_ESTIMATE = 400;     // Word files only

export const TARGET_CARDS = { 'quiz-show': 10, 'match-up': 6, 'fill-blank': 8 } as const;
export const LOW_TEXT_TARGET_FACTOR = 0.5;   // when textLevel is "low", ask for half
export const ASK_EXTRA_FACTOR = 1.35;        // ask the AI for 35% more than we keep
export const MAX_WORDS_TO_AI = 6000;         // longer lessons are cut to this many words

export const MAX_RATE_LIMIT_WAIT_S = 65;     // longest wait when an AI says "too many requests"
export const MAX_JOB_SECONDS = 180;          // one question job never runs longer than this

export const GROQ_TOKENS_PER_MINUTE = 8000;   // Groq free plan; change if we upgrade
export const GROQ_MAX_LESSON_WORDS = 2500;    // lesson text sent to Groq is cut to this
export const MAX_OUTPUT_TOKENS = 3500;        // answer length cap for every provider
export const GROQ_GAP_AFTER_ANSWER_S = 60;    // before a Groq top-up: wait this long after its last answer
