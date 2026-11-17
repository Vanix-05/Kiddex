import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { errorMessage } from '../api/client'
import { lessonKeys, lessonsApi, type LessonUnit, type ServerUnitLabel } from '../api/lessonsApi'
import { unitsText } from '../data/lessonMapping'
import styles from './LessonTextWindow.module.css'

/** Above this, the backend may send the AI only the first part of the lesson (Groq gets 2,500 words). */
const LONG_LESSON_WORDS = 2500

/** Everything in the window that can take keyboard focus (for the focus trap). */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * "The text we read": a floating window over the blurred page with the lesson
 * text the backend read (GET /api/lessons/:id?withText=1), page by page or
 * slide by slide. ✕, "Looks good", Esc or a click on the blur closes it. Focus
 * stays inside while it is open and goes back to the link that opened it.
 */
export function LessonTextWindow({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const titleId = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const query = useQuery({ queryKey: lessonKeys.text(lessonId), queryFn: () => lessonsApi.get(lessonId, true) })
  const lesson = query.data

  // Focus moves into the window, and back to the opener after.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    cardRef.current?.focus({ preventScroll: true })
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [])

  // Esc closes; Tab stays inside the window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
      const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = cardRef.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === cardRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    // Capture: this window answers Esc before anything under it.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const facts = lesson
    ? `${lesson.fileName} · ${unitsText(lesson.unitCount, lesson.unitLabel, lesson.unitCountIsEstimate)} · ${lesson.wordCount.toLocaleString()} word${lesson.wordCount === 1 ? '' : 's'}. This is the text the AI makes questions from.`
    : ' '

  return createPortal(
    <div
      className={styles.veil}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              The text we read
            </h2>
            <p className={styles.facts}>{facts}</p>
            {lesson && lesson.wordCount > LONG_LESSON_WORDS && (
              <p className={styles.longNote}>Long lesson: the AI may use only the first part (about 2,500 words).</p>
            )}
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            <X size={24} strokeWidth={2.6} aria-hidden="true" />
            <span className="visually-hidden">Close</span>
          </button>
        </div>

        <div className={styles.paper} tabIndex={0} aria-label="Lesson text">
          {query.isPending && <p className={styles.status}>Loading the text…</p>}
          {query.isError && (
            <p className={`${styles.status} ${styles.statusError}`} role="alert">
              {errorMessage(query.error)}
            </p>
          )}
          {/* A Word file is one unit, so it shows "PAGE 1" only once. */}
          {lesson?.units?.map((unit) => <UnitText key={unit.number} unit={unit} label={lesson.unitLabel} />)}
        </div>

        <div className={styles.foot}>
          <p className={styles.footText}>
            Something missing? Words inside pictures and scanned pages can’t be read yet. Type them into your file and upload again.
          </p>
          <button type="button" className={styles.good} onClick={onClose}>
            Looks good
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** One page or slide: a "PAGE 1" divider, then its text (or a "No text" tag). */
function UnitText({ unit, label }: { unit: LessonUnit; label: ServerUnitLabel }) {
  return (
    <section className={styles.unit}>
      <h3 className={styles.divider}>
        <span>
          {label} {unit.number}
        </span>
      </h3>
      {unit.text.trim() === '' ? (
        <span className={styles.noText}>No text on this {label}</span>
      ) : (
        unit.text.split(/\n{2,}/).map((block, i) => <TextBlock key={i} text={block} />)
      )}
    </section>
  )
}

/**
 * A paragraph as it was read. Table rows ("cell | cell") show in a small grey
 * box; a short single line without an end mark looks like a heading.
 */
function TextBlock({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return null
  if (lines.every((l) => l.includes(' | '))) return <pre className={styles.table}>{lines.join('\n')}</pre>
  if (lines.length === 1 && lines[0].length <= 70 && !/[.?!:;,]$/.test(lines[0])) {
    return <p className={styles.heading}>{lines[0]}</p>
  }
  return <p className={styles.para}>{lines.join('\n')}</p>
}
