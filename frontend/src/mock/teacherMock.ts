// FAKE DATA for the front-end only. Delete this file when the database is connected.
//
// Screens never import this file. They read it through the hooks in
// src/teacher/data/useTeacherData.ts, so the real API can replace those hooks
// later without touching the screens.
//
// The dashboard always starts empty (no sections, students or lessons). What
// the Teacher adds stays in memory until a refresh. Only two fakes are left:

import { TEMPLATE_FOR_TYPE } from '../content/questionCard'
import type { QuestionCard, SourceQuote, TemplateId } from '../teacher/data/types'
import { equivalentFractionsCards, fakeSourceQuotes } from './questionCards'

// FAKE: delete when the backend is connected. The logged-in Teacher's name.
export const FAKE_TEACHER_NAME = 'Ms. Cruz'

// FAKE: delete when the backend is connected.
/**
 * The fake "AI" for uploads: every upload gets the 16 Equivalent Fractions
 * cards, for this lesson, labeled with the Teacher's topic and subject. Only
 * the game types the Teacher picked.
 */
export function fakeDraftsFor(lesson: { id: string; topic: string; subject: string; games: TemplateId[] }, grade: number) {
  const cards: QuestionCard[] = []
  const quotes: Record<string, SourceQuote> = {}
  for (const card of equivalentFractionsCards) {
    if (!lesson.games.includes(TEMPLATE_FOR_TYPE[card.type])) continue
    const id = card.id.replace(card.lessonId, lesson.id)
    cards.push({ ...card, id, lessonId: lesson.id, topic: lesson.topic, subject: lesson.subject, grade, status: 'draft' })
    const quote = fakeSourceQuotes[card.id]
    if (quote) quotes[id] = quote
  }
  return { cards, quotes }
}
