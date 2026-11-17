// The shape of the AI's answer: one required list per picked game,
//   { "matchUp": [...], "fillBlank": [...], "quizShow": [...] }
// Items have no "type"; our code sets it from the list they came from.
// Also builds the JSON schema Gemini uses to keep to this shape.
import { Type, type Schema } from "@google/genai";
import type { CardType, TemplateId } from "../content/questionCard";

export const LIST_KEY: Record<TemplateId, string> = {
  "match-up": "matchUp",
  "fill-blank": "fillBlank",
  "quiz-show": "quizShow",
};

export const TYPE_FOR_GAME: Record<TemplateId, CardType> = {
  "quiz-show": "multiple_choice",
  "match-up": "matching_pair",
  "fill-blank": "fill_blank",
};

/** The order the AI writes the lists in: the harder types first, before it runs out of room. */
export const WRITE_ORDER: TemplateId[] = ["match-up", "fill-blank", "quiz-show"];

/** How many items to ask for, per picked game. */
export type ListCounts = Partial<Record<TemplateId, number>>;

export function pickedInWriteOrder(counts: ListCounts): TemplateId[] {
  return WRITE_ORDER.filter((game) => (counts[game] ?? 0) > 0);
}

/**
 * Turns the AI's answer into raw cards with `type` set from their list.
 * A missing, empty or broken list simply gives 0 cards for that game (never a crash).
 */
export function toRawCards(answer: Record<string, unknown>, games: TemplateId[]): {
  cards: Record<string, unknown>[];
  received: Partial<Record<TemplateId, number>>;
} {
  const cards: Record<string, unknown>[] = [];
  const received: Partial<Record<TemplateId, number>> = {};
  for (const game of games) {
    const list = answer[LIST_KEY[game]];
    const items = Array.isArray(list) ? list : [];
    received[game] = items.length;
    for (const item of items) {
      // Not an object → keep it as-is so the checker counts it as "not a card".
      cards.push(item && typeof item === "object" ? { ...(item as object), type: TYPE_FOR_GAME[game] } : { item });
    }
  }
  return { cards, received };
}

const text: Schema = { type: Type.STRING };

function itemSchema(game: TemplateId): Schema {
  const properties: Record<string, Schema> = {
    prompt: text,
    ...(game === "match-up" ? {} : { choices: { type: Type.ARRAY, items: text } }),
    answer: text,
    level: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
    explanation: text,
    sourcePage: { type: Type.INTEGER },
    sourceQuote: text,
    unsure: { type: Type.BOOLEAN },
  };
  const order = Object.keys(properties);
  return { type: Type.OBJECT, properties, required: order, propertyOrdering: order };
}

/** Gemini's responseSchema: only the picked lists, each required, each with minItems. */
export function geminiSchema(counts: ListCounts): Schema {
  const games = pickedInWriteOrder(counts);
  const properties: Record<string, Schema> = {};
  for (const game of games) {
    properties[LIST_KEY[game]] = { type: Type.ARRAY, minItems: String(counts[game]), items: itemSchema(game) };
  }
  const keys = games.map((game) => LIST_KEY[game]);
  return { type: Type.OBJECT, properties, required: keys, propertyOrdering: keys };
}
