// Small rules for Archive, Restore, Delete and Change due date on My lessons
// (no React, so Vitest can check them).

/** The ⋯ menu's items on a lesson row, in this order. */
export type LessonMenuItem = 'due' | 'archive' | 'delete'

/**
 * Change due date only on assigned lessons; Archive once a Student played it
 * (Delete would erase their scores), Delete when nobody did.
 */
export function lessonMenuItems(lesson: { assigned: boolean; playedBy: number }): LessonMenuItem[] {
  return [...(lesson.assigned ? (['due'] as const) : []), lesson.playedBy > 0 ? 'archive' : 'delete']
}

/** What the toast at the bottom of My lessons says. */
export type LessonToastKind = 'archived' | 'restored' | 'deleted' | 'deletedForever' | 'dueSaved'

export function lessonToastText(kind: LessonToastKind, title: string): string {
  switch (kind) {
    case 'archived':
      return `“${title}” archived`
    case 'restored':
      return `“${title}” restored`
    case 'deleted':
      return `“${title}” deleted`
    case 'deletedForever':
      return `“${title}” deleted forever`
    case 'dueSaved':
      return 'Due date saved'
  }
}

/** "Archived (2)", or null when there are none (the link is hidden at 0). */
export const archivedLinkText = (count: number) => (count > 0 ? `Archived (${count})` : null)

/** Delete: "The lesson and its 18 questions are erased." */
export function erasedLine(questions: number): string {
  if (questions === 0) return 'The lesson is erased.'
  return `The lesson and its ${questions} question${questions === 1 ? '' : 's'} are erased.`
}

/** Delete forever: "The lesson, its 24 questions and its review pack are erased." */
export function erasedForeverLine(questions: number): string {
  if (questions === 0) return 'The lesson and its review pack are erased.'
  return `The lesson, its ${questions} question${questions === 1 ? '' : 's'} and its review pack are erased.`
}

/** "15 Students’ scores for it leave your reports." */
export const scoresLeaveLine = (played: number) =>
  `${played} ${played === 1 ? 'Student’s' : 'Students’'} scores for it leave your reports.`

/** Delete forever can only be pressed with the box ticked, and once. */
export const canDeleteForever = (ticked: boolean, saving: boolean) => ticked && !saving
