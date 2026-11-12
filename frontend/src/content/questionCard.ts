// The shared "question card" format. The mini games read it now; the AI pipeline will write it later.
// QuestionCardSchema checks a card's shape and its rules; QuestionCard is the type it describes.
import { z } from 'zod'

const required = z.string().trim().min(1, 'is required')

/** Compare choices ignoring case and spaces: " 1/2 " and "1 / 2" are the same choice. */
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

export const QuestionCardSchema = z
  .object({
    id: required,
    lessonId: required,
    type: z.enum(['multiple_choice', 'matching_pair', 'fill_blank']),
    /** The question, the left term of a pair, or a sentence with ___. */
    prompt: required,
    /** multiple_choice: 2–4 options. fill_blank: 2–4 word-bank words. matching_pair: empty. */
    choices: z.array(required),
    /** multiple_choice / fill_blank: one of the choices. matching_pair: the right-hand term. */
    answer: required,
    subject: required,
    topic: required,
    grade: z.number().int().min(3).max(6),
    level: z.enum(['easy', 'medium', 'hard']),
    explanation: z.string().optional(),
    sourcePage: z.number().int().positive().optional(),
    status: z.enum(['draft', 'approved']),
  })
  .superRefine((card, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

    if (card.type === 'matching_pair') {
      if (card.choices.length) fail('choices', 'a matching pair has no choices')
      return
    }

    if (card.choices.length < 2 || card.choices.length > 4) fail('choices', 'needs 2 to 4 choices')
    if (new Set(card.choices.map(norm)).size !== card.choices.length) fail('choices', 'choices repeat')
    if (!card.choices.some((c) => norm(c) === norm(card.answer))) fail('answer', 'is not one of the choices')
    if (card.type === 'fill_blank' && !card.prompt.includes('___')) fail('prompt', 'a fill-in-the-blank prompt needs ___')
  })

export type QuestionCard = z.infer<typeof QuestionCardSchema>
export type CardType = QuestionCard['type']

/** The mini game each card type is played in. */
export type TemplateId = 'quiz-show' | 'match-up' | 'fill-blank'

export const TEMPLATE_FOR_TYPE: Record<CardType, TemplateId> = {
  multiple_choice: 'quiz-show',
  matching_pair: 'match-up',
  fill_blank: 'fill-blank',
}

/** Fewest approved cards a game needs to be playable. */
export const MIN_CARDS: Record<TemplateId, number> = {
  'quiz-show': 3,
  'match-up': 4,
  'fill-blank': 3,
}

/** The games that have enough approved cards to play. Draft cards don't count. */
export function availableTemplates(cards: readonly QuestionCard[]): TemplateId[] {
  const counts: Record<TemplateId, number> = { 'quiz-show': 0, 'match-up': 0, 'fill-blank': 0 }
  for (const card of cards) {
    if (card.status === 'approved') counts[TEMPLATE_FOR_TYPE[card.type]]++
  }
  return (Object.keys(MIN_CARDS) as TemplateId[]).filter((t) => counts[t] >= MIN_CARDS[t])
}
