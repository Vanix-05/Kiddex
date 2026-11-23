// The Lobby's chalkboard for a lesson, from its approved questions. Pure function: no database.

export interface BoardQuestion {
  type: "multiple_choice" | "matching_pair" | "fill_blank";
  prompt: string;
  answer: string;
}

export interface Board {
  keyWords: { word: string; text: string }[];
  keyIdeas: { before: string; answer: string; after: string }[];
}

const BLANK = /_{3,}/;

/**
 * `questions` must be the lesson's approved questions in `position` order.
 * - Key words: with at least 1 matching pair, the first 4 pairs.
 * - Key ideas: otherwise, the first 3 fill-in-the-blank sentences, split at ___.
 * - Neither: both lists empty.
 */
export function makeBoard(questions: readonly BoardQuestion[]): Board {
  const pairs = questions.filter((q) => q.type === "matching_pair");
  if (pairs.length) {
    return { keyWords: pairs.slice(0, 4).map((q) => ({ word: q.prompt, text: q.answer })), keyIdeas: [] };
  }
  const blanks = questions.filter((q) => q.type === "fill_blank" && BLANK.test(q.prompt)).slice(0, 3);
  return {
    keyWords: [],
    keyIdeas: blanks.map((q) => {
      const match = BLANK.exec(q.prompt)!;
      return {
        // Spaces kept: before + answer + after reads as the whole sentence.
        before: q.prompt.slice(0, match.index),
        answer: q.answer,
        after: q.prompt.slice(match.index + match[0].length),
      };
    }),
  };
}
