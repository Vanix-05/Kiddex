/**
 * Typed calls for every lesson and question address in backend/README.md.
 * Screens don't call these directly: they use the hooks in src/teacher/data/useTeacherData.ts.
 */
import type { QuestionCard, TemplateId } from '../../content/questionCard'
import { getToken } from '../../session/authToken'
import { api, API_URL, checkLoginEnded, errorFromBody, networkError } from './client'

// ---------- Shapes the backend sends ----------

export type ServerFileType = 'pdf' | 'docx' | 'pptx'
export type ServerUnitLabel = 'page' | 'slide'
export type TextLevel = 'none' | 'low' | 'ok'
export type ServerLessonStatus = 'uploaded' | 'making' | 'ready' | 'failed' | 'approved'
export type MakingStep = 'writing' | 'checking' | 'waiting'

/** One page or slide of lesson text ("" when it has no text). */
export interface LessonUnit {
  number: number
  text: string
}

/** A question as the backend keeps it: the card plus its place in the Check list. */
export type ServerQuestion = QuestionCard & {
  position: number
  flagChecked: boolean
  madeBy: 'ai' | 'teacher'
}

export interface LessonCounts {
  total: number
  toCheck: number
  approved: number
  flaggedLeft: number
}

/** The answer of POST /api/lessons/extract. */
export interface UploadAnswer {
  lessonId: string
  extractId: string
  fileName: string
  fileType: ServerFileType
  sizeBytes: number
  unitLabel: ServerUnitLabel
  unitCount: number
  unitCountIsEstimate: boolean
  wordCount: number
  tablesRead: number | null
  picturesSkipped: number | null
  textLevel: TextLevel
  minWords: number
  units: LessonUnit[]
}

/** One row of GET /api/lessons (no lesson text). */
export interface ServerLessonItem {
  id: string
  topic: string | null
  subject: string | null
  fileName: string
  fileType: ServerFileType
  unitLabel: ServerUnitLabel
  unitCount: number
  unitCountIsEstimate: boolean
  wordCount: number
  status: ServerLessonStatus
  games: TemplateId[]
  createdAt: string
  counts: LessonCounts
}

/** GET /api/lessons: active lessons only, each with how many different Students played it. */
export interface ServerLessonListItem extends ServerLessonItem {
  /** > 0: the screens offer Archive (Delete would erase scores); 0: Delete. */
  playedBy: number
}

/** GET /api/lessons/archived: newest archived first. */
export interface ServerArchivedLesson extends ServerLessonListItem {
  archivedAt: string
}

/** GET /api/lessons/:id. `units` only with ?withText=1. */
export interface ServerLesson extends ServerLessonItem {
  grade: number | null
  sizeBytes: number
  tablesRead: number | null
  picturesSkipped: number | null
  textLevel: TextLevel
  textWasCut: boolean
  errorCode: string | null
  makingStep: MakingStep | null
  makingStartedAt: string | null
  approvedAt: string | null
  updatedAt: string
  /** Seconds since making started (only while making). */
  seconds: number | null
  error: { code: string; message: string } | null
  summary: Partial<Record<TemplateId, { count: number; needed: number; enough: boolean }>>
  questions: ServerQuestion[]
  units?: LessonUnit[]
}

export interface GenerateInput {
  topic: string
  subject: string
  grade: number
  games: TemplateId[]
}

/** The fields the Teacher can edit on a question. */
export type QuestionEdit = Partial<Pick<QuestionCard, 'prompt' | 'choices' | 'answer' | 'level' | 'explanation'>>

/** A question the Teacher writes. */
export type NewQuestion = Pick<QuestionCard, 'type' | 'prompt' | 'choices' | 'answer' | 'level'> & { explanation?: string }

// ---------- Calls ----------

export type UploadPhase = { phase: 'uploading'; percent: number } | { phase: 'reading' }

/**
 * Uploads one lesson file (form field "file") and reads its text.
 * Uses XMLHttpRequest so the screen can show the upload progress.
 */
export function uploadLessonFile(file: File, onProgress: (p: UploadPhase) => void, signal?: AbortSignal): Promise<UploadAnswer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/api/lessons/extract`)
    const sentToken = getToken()
    if (sentToken) xhr.setRequestHeader('Authorization', `Bearer ${sentToken}`)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress({ phase: 'uploading', percent: Math.min(100, Math.round((e.loaded / e.total) * 100)) })
    }
    // Everything is sent: now the server reads the text.
    xhr.upload.onload = () => onProgress({ phase: 'reading' })
    xhr.onload = () => {
      const body: unknown = xhr.response
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadAnswer)
      else if (body === null && xhr.status >= 500) reject(networkError())
      else {
        const error = errorFromBody(xhr.status, body)
        checkLoginEnded(error, sentToken)
        reject(error)
      }
    }
    xhr.onerror = () => reject(networkError())
    xhr.onabort = () => reject(new DOMException('Upload stopped', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    const form = new FormData()
    form.append('file', file)
    onProgress({ phase: 'uploading', percent: 0 })
    xhr.send(form)
  })
}

const enc = encodeURIComponent

export const lessonsApi = {
  upload: uploadLessonFile,
  /** Starts making questions (the backend answers 202 and works in the background). */
  generate: (lessonId: string, input: GenerateInput) =>
    api<{ lessonId: string }>(`/api/lessons/${enc(lessonId)}/generate`, { method: 'POST', body: input }),
  list: () => api<ServerLessonListItem[]>('/api/lessons'),
  archived: () => api<ServerArchivedLesson[]>('/api/lessons/archived'),
  get: (lessonId: string, withText = false) =>
    api<ServerLesson>(`/api/lessons/${enc(lessonId)}${withText ? '?withText=1' : ''}`),
  /**
   * Deletes a lesson nobody played. A played one answers 409 ARCHIVE_FIRST; an archived
   * played one needs `confirm` (Delete forever), else 400 CONFIRM_NEEDED.
   */
  remove: (lessonId: string, confirm = false) =>
    api<void>(`/api/lessons/${enc(lessonId)}`, { method: 'DELETE', body: confirm ? { confirm: true } : undefined }),
  /** Hides it from Students and the lists; nothing is deleted. */
  archive: (lessonId: string) => api<{ ok: true }>(`/api/lessons/${enc(lessonId)}/archive`, { method: 'POST' }),
  restore: (lessonId: string) => api<{ ok: true }>(`/api/lessons/${enc(lessonId)}/restore`, { method: 'POST' }),
  addQuestion: (lessonId: string, question: NewQuestion) =>
    api<ServerQuestion>(`/api/lessons/${enc(lessonId)}/questions`, { method: 'POST', body: question }),
  editQuestion: (questionId: string, edit: QuestionEdit) =>
    api<ServerQuestion>(`/api/questions/${enc(questionId)}`, { method: 'PATCH', body: edit }),
  keepQuestion: (questionId: string) => api<ServerQuestion>(`/api/questions/${enc(questionId)}/keep`, { method: 'POST' }),
  removeQuestion: (questionId: string) => api<void>(`/api/questions/${enc(questionId)}`, { method: 'DELETE' }),
  approveAll: (lessonId: string) => api<ServerLesson>(`/api/lessons/${enc(lessonId)}/approve-all`, { method: 'POST' }),
}

/** React Query keys for lesson data. */
export const lessonKeys = {
  list: ['lessons'] as const,
  /** Under the list key: refreshing the list refreshes it too. */
  archived: ['lessons', 'archived'] as const,
  one: (lessonId: string) => ['lesson', lessonId] as const,
  text: (lessonId: string) => ['lesson', lessonId, 'text'] as const,
}
