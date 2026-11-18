// What the Teacher screens get for a lesson: the list row and the full lesson.
// The lesson text (units) is only sent when asked for (the "See the text" window).
import { MIN_CARDS, TEMPLATE_FOR_TYPE, type TemplateId } from "../content/questionCard";
import type { Lesson, LessonSummary, Question } from "../store/lessonStore";
import { messageForCode } from "./lessonErrors";

function counts(questions: Question[]) {
  return {
    total: questions.length,
    toCheck: questions.filter((q) => q.status === "draft").length,
    approved: questions.filter((q) => q.status === "approved").length,
    flaggedLeft: questions.filter((q) => q.flag && !q.flagChecked).length,
  };
}

/** One row of GET /api/lessons. */
export function lessonListItem(lesson: LessonSummary, questions: Question[]) {
  return {
    id: lesson.id,
    topic: lesson.topic,
    subject: lesson.subject,
    fileName: lesson.fileName,
    fileType: lesson.fileType,
    unitLabel: lesson.unitLabel,
    unitCount: lesson.unitCount,
    unitCountIsEstimate: lesson.unitCountIsEstimate,
    wordCount: lesson.wordCount,
    status: lesson.status,
    games: lesson.games,
    createdAt: lesson.createdAt,
    counts: counts(questions),
  };
}

/** GET /api/lessons/:id (and the answer of approve-all). */
export function lessonDetail(lesson: Lesson, questions: Question[], withText: boolean) {
  const { units, ownerId: _ownerId, ...fields } = lesson;

  const summary: Partial<Record<TemplateId, { count: number; needed: number; enough: boolean }>> = {};
  for (const game of lesson.games) {
    const count = questions.filter((q) => TEMPLATE_FOR_TYPE[q.type] === game).length;
    summary[game] = { count, needed: MIN_CARDS[game], enough: count >= MIN_CARDS[game] };
  }

  return {
    ...fields,
    seconds:
      lesson.status === "making" && lesson.makingStartedAt
        ? Math.round((Date.now() - Date.parse(lesson.makingStartedAt)) / 1000)
        : null,
    error: lesson.status === "failed" && lesson.errorCode
      ? { code: lesson.errorCode, message: messageForCode(lesson.errorCode) }
      : null,
    counts: counts(questions),
    summary,
    questions,
    ...(withText ? { units } : {}),
  };
}
