/**
 * Turns the backend's lessons into what the Teacher screens show:
 * status, title, "3 pages" / "about 3 pages" / "14 slides", "uploaded Nov 3", PDF/DOC/PPT.
 */
import type { ServerFileType, ServerLessonItem, ServerLessonStatus, ServerUnitLabel } from '../api/lessonsApi'
import type { FileType, Lesson, LessonNote, LessonStatus } from './types'

/** Backend status → screen status. "assigned" is screen-only for now (a LessonNote). */
export function screenStatus(status: ServerLessonStatus, note?: LessonNote): LessonStatus {
  switch (status) {
    case 'uploaded':
      return 'draft'
    case 'making':
      return 'making'
    case 'ready':
      return 'toCheck'
    case 'failed':
      return 'failed'
    case 'approved':
      return note?.assignedNote ? 'assigned' : 'ready'
  }
}

export const FILE_TYPE: Record<ServerFileType, FileType> = { pdf: 'PDF', docx: 'DOC', pptx: 'PPT' }

/** "Equivalent-Fractions-Wk3.docx" → "Equivalent-Fractions-Wk3" */
export const withoutExtension = (fileName: string) => fileName.replace(/\.[a-z0-9]+$/i, '')

/** The topic if there is one, otherwise the file name without its extension. */
export const lessonTitle = (topic: string | null, fileName: string) => topic?.trim() || withoutExtension(fileName)

/** "3 pages", "1 page", "about 3 pages" (Word), "14 slides". */
export function unitsText(unitCount: number, unitLabel: ServerUnitLabel, isEstimate: boolean): string {
  const unit = `${unitLabel}${unitCount === 1 ? '' : 's'}`
  return `${isEstimate ? 'about ' : ''}${unitCount} ${unit}`
}

/** "just now" (under 5 minutes), "today", or "uploaded Nov 3". */
export function uploadedText(createdAt: string, now = Date.now()): string {
  const at = new Date(createdAt)
  if (Number.isNaN(at.getTime())) return ''
  if (now - at.getTime() < 5 * 60 * 1000) return 'just now'
  if (at.toDateString() === new Date(now).toDateString()) return 'today'
  return `uploaded ${at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

/** "84 KB" or "6.2 MB". */
export const fileSizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** A lesson from GET /api/lessons (or the same fields of one lesson) as the screens show it. */
export function toScreenLesson(item: ServerLessonItem & { sizeBytes?: number; grade?: number | null }, note?: LessonNote): Lesson {
  return {
    id: item.id,
    title: lessonTitle(item.topic, item.fileName),
    fileName: item.fileName,
    fileType: FILE_TYPE[item.fileType],
    size: unitsText(item.unitCount, item.unitLabel, item.unitCountIsEstimate),
    fileSize: item.sizeBytes === undefined ? undefined : fileSizeText(item.sizeBytes),
    uploaded: uploadedText(item.createdAt),
    topic: item.topic ?? '',
    subject: item.subject ?? '',
    games: note?.games ?? item.games,
    status: screenStatus(item.status, note),
    assignedNote: note?.assignedNote,
    wordCount: item.wordCount,
    grade: item.grade ?? undefined,
  }
}
