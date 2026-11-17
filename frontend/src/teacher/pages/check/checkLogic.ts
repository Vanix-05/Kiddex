/**
 * The Check page's pure logic (no React): grouping and numbering, the marked
 * list, the bottom bar's state, the small grey lines, and the edit form checks.
 * Tested in checkLogic.test.ts.
 */
import { QuestionCardSchema, TEMPLATE_FOR_TYPE, type QuestionCard, type TemplateId } from '../../../content/questionCard'
import type { ServerQuestion } from '../../api/lessonsApi'

export const GAME_ORDER: TemplateId[] = ['quiz-show', 'match-up', 'fill-blank']

export const gameOf = (card: Pick<QuestionCard, 'type'>): TemplateId => TEMPLATE_FOR_TYPE[card.type]

// ---------- Groups and numbers ----------

export interface CardGroup {
  game: TemplateId
  cards: ServerQuestion[]
}

/** The lesson's cards in position order. */
export const byPosition = (cards: readonly ServerQuestion[]) => [...cards].sort((a, b) => a.position - b.position)

/**
 * One group per game, in the order Quiz Show, Match Up, Fill the Blank: the
 * lesson's games (even when empty, so "Add my own" has a place), plus any
 * other game that has cards.
 */
export function groupCards(cards: readonly ServerQuestion[], lessonGames: readonly TemplateId[]): CardGroup[] {
  const sorted = byPosition(cards)
  return GAME_ORDER.filter((g) => lessonGames.includes(g) || sorted.some((c) => gameOf(c) === g)).map((game) => ({
    game,
    cards: sorted.filter((c) => gameOf(c) === game),
  }))
}

/** Gives the cards positions 1, 2, 3… in Check-list order (game groups, then their old order). */
export function renumber(cards: readonly ServerQuestion[]): ServerQuestion[] {
  const sorted = [...cards].sort(
    (a, b) => GAME_ORDER.indexOf(gameOf(a)) - GAME_ORDER.indexOf(gameOf(b)) || a.position - b.position,
  )
  return sorted.map((c, i) => (c.position === i + 1 ? c : { ...c, position: i + 1 }))
}

/** A new card goes at the end of its game group; everything is renumbered. */
export function insertAtGroupEnd(cards: readonly ServerQuestion[], card: ServerQuestion): ServerQuestion[] {
  return renumber([...cards, { ...card, position: Number.MAX_SAFE_INTEGER }])
}

const GROUP_WORD: Record<TemplateId, [string, string]> = {
  'quiz-show': ['question', 'questions'],
  'match-up': ['pair', 'pairs'],
  'fill-blank': ['sentence', 'sentences'],
}

/** "10 questions", "6 pairs", "1 sentence". */
export const groupCountLabel = (game: TemplateId, n: number) => `${n} ${GROUP_WORD[game][n === 1 ? 0 : 1]}`

// ---------- Marked questions ----------

export type Flag = NonNullable<QuestionCard['flag']>

/** "Not found in your lesson" / "AI was not sure" (left page). */
export const FLAG_REASON: Record<Flag, string> = {
  not_in_lesson: 'Not found in your lesson',
  ai_unsure: 'AI was not sure',
}

/** "not found in your lesson" / "the AI was not sure" (the card's grey line). */
export const FLAG_LINE: Record<Flag, string> = {
  not_in_lesson: 'not found in your lesson',
  ai_unsure: 'the AI was not sure',
}

export interface MarkedItem {
  id: string
  number: number
  /** The question on one line. */
  text: string
  reason: string
  checked: boolean
}

/** Shortens text to one line: "Which is a way to make an equivalent…" */
export function shorten(text: string, max = 44): string {
  const one = text.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  const cut = one.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '')}…`
}

/** Every marked card, in list order. */
export function markedList(cards: readonly ServerQuestion[]): MarkedItem[] {
  return byPosition(cards)
    .filter((c): c is ServerQuestion & { flag: Flag } => !!c.flag)
    .map((c) => ({ id: c.id, number: c.position, text: shorten(c.prompt), reason: FLAG_REASON[c.flag], checked: c.flagChecked }))
}

/** A card the Teacher still has to look at: marked and not checked yet. */
export const isOpenMark = (c: Pick<ServerQuestion, 'flag' | 'flagChecked'>) => !!c.flag && !c.flagChecked

// ---------- The bottom bar ----------

export type BarState =
  | { kind: 'empty' }
  | { kind: 'locked'; moreBelow: number }
  | { kind: 'marked'; left: number; firstId: string; firstNumber: number }
  | { kind: 'ready'; total: number }
  | { kind: 'approved'; total: number }

/**
 * Which of the bar's states to show.
 * approved = the lesson is already approved; otherwise the Teacher must have
 * seen the end of the list once, then check every marked card.
 */
export function barState(input: {
  cards: readonly ServerQuestion[]
  seenEnd: boolean
  moreBelow: number
  lessonApproved: boolean
}): BarState {
  const total = input.cards.length
  if (total === 0) return { kind: 'empty' }
  if (input.lessonApproved) return { kind: 'approved', total }
  if (!input.seenEnd) return { kind: 'locked', moreBelow: input.moreBelow }
  const open = byPosition(input.cards).filter(isOpenMark)
  if (open.length > 0) return { kind: 'marked', left: open.length, firstId: open[0].id, firstNumber: open[0].position }
  return { kind: 'ready', total }
}

// ---------- Grey lines ----------

const LEVEL_NAME: Record<QuestionCard['level'], string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

/** "Easy · page 2", or just "Easy" (Word lessons have no page numbers). */
export function levelLine(card: Pick<QuestionCard, 'level' | 'sourcePage'>, fileType: 'PDF' | 'DOC' | 'PPT'): string {
  const level = LEVEL_NAME[card.level]
  if (fileType === 'DOC' || !card.sourcePage) return level
  return `${level} · ${fileType === 'PPT' ? 'slide' : 'page'} ${card.sourcePage}`
}

export const levelName = (level: QuestionCard['level']) => LEVEL_NAME[level]

// ---------- The edit form ----------

export type FormField = 'prompt' | 'choices' | 'answer' | 'explanation'

export interface CardForm {
  type: QuestionCard['type']
  prompt: string
  /** Quiz Show: 4 boxes. Fill the Blank: 3 words. Match Up: unused. */
  choices: string[]
  /** Which choice is right (Quiz Show and Fill the Blank). */
  rightIndex: number
  /** Match Up: the right side. */
  right: string
  explanation: string
  level: QuestionCard['level']
}

const BOXES: Record<QuestionCard['type'], number> = { multiple_choice: 4, fill_blank: 3, matching_pair: 0 }

/** The form for a card (or an empty one of a type). */
export function formFor(card: Pick<QuestionCard, 'type' | 'prompt' | 'choices' | 'answer' | 'explanation' | 'level'>): CardForm {
  const boxes = BOXES[card.type]
  const choices = card.type === 'matching_pair' ? [] : [...card.choices, ...Array(Math.max(0, boxes - card.choices.length)).fill('')]
  const rightIndex = card.type === 'matching_pair' ? -1 : choices.findIndex((c) => c.trim() !== '' && c.trim() === card.answer.trim())
  return {
    type: card.type,
    prompt: card.prompt,
    choices,
    rightIndex,
    right: card.type === 'matching_pair' ? card.answer : '',
    explanation: card.explanation ?? '',
    level: card.level,
  }
}

export const emptyForm = (type: QuestionCard['type']): CardForm =>
  formFor({ type, prompt: '', choices: [], answer: '', explanation: '', level: 'easy' })

/** What the backend gets: the edit fields only. */
export function formToEdit(form: CardForm) {
  const pair = form.type === 'matching_pair'
  const choices = pair ? [] : form.choices.map((c) => c.trim())
  return {
    prompt: form.prompt.trim(),
    choices,
    answer: pair ? form.right.trim() : (choices[form.rightIndex] ?? ''),
    level: form.level,
    explanation: pair ? undefined : form.explanation.trim() || undefined,
  }
}

/** True when the form differs from the card it came from. */
export const formChanged = (form: CardForm, from: CardForm) => JSON.stringify(form) !== JSON.stringify(from)

/**
 * Problems with the form, in simple words, by field ({} = fine to save).
 * Checks our own rules first (clearer words), then the card format itself.
 */
export function formProblems(form: CardForm, card: Omit<QuestionCard, 'prompt' | 'choices' | 'answer' | 'level' | 'explanation'>): Partial<Record<FormField, string>> {
  const problems: Partial<Record<FormField, string>> = {}
  const edit = formToEdit(form)
  const pair = form.type === 'matching_pair'

  if (!edit.prompt) problems.prompt = pair ? 'Fill in the left side.' : form.type === 'fill_blank' ? 'Write the sentence.' : 'Write the question.'
  else if (form.type === 'fill_blank' && edit.prompt.split('___').length !== 2) problems.prompt = 'The sentence needs exactly one blank (___).'

  if (pair) {
    if (!edit.answer) problems.answer = 'Fill in the right side.'
  } else {
    const n = BOXES[form.type]
    const what = form.type === 'fill_blank' ? 'words' : 'choices'
    if (edit.choices.length < n || edit.choices.some((c) => !c)) problems.choices = `Fill in all ${n} ${what}.`
    else if (new Set(edit.choices.map((c) => c.toLowerCase().replace(/\s+/g, ''))).size !== edit.choices.length) {
      problems.choices = `Two ${what} are the same. Make each one different.`
    } else if (form.rightIndex < 0 || !edit.answer) problems.answer = 'Tap the round mark next to the right answer.'
  }
  if (Object.keys(problems).length) return problems

  // The card format (the same check the backend does).
  const result = QuestionCardSchema.safeParse({ ...card, ...edit })
  if (!result.success) {
    const field = String(result.error.issues[0]?.path[0] ?? 'prompt')
    const key: FormField = field === 'choices' || field === 'answer' || field === 'explanation' ? field : 'prompt'
    problems[key] = 'Something here isn’t right yet. Please check it.'
  }
  return problems
}
