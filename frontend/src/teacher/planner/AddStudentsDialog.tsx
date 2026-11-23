import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, ClipboardList, Plus, User, UserPlus, X } from 'lucide-react'
import { errorMessage } from '../api/client'
import type { AddStudentsAnswer } from '../api/sectionsApi'
import { checkIds, MAX_STUDENTS_PER_SECTION, problemText, splitList, type CheckedId } from '../data/schoolIds'
import { useAddStudents, useSection, useStudents } from '../data/useTeacherData'
import { skippedText } from '../pages/skippedText'
import { Popup } from './Dialogs'
import dialogs from './dialogs.module.css'
import styles from './addStudents.module.css'

type Mode = 'one' | 'paste'

/** At most this many red chips; the rest are counted in one "+ N more". */
const MAX_RED_CHIPS = 6

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * Add students: School IDs only, no names (Master Brief 4.1). One at a time (a
 * small list builds up under the box) or a pasted list. Everything is checked on
 * the screen while typing; the server checks again and makes the one-time codes.
 * After saving, `onAdded` opens "Login codes are ready!" in My Students.
 */
export function AddStudentsDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { active, label } = useSection()
  const students = useStudents()
  const addStudents = useAddStudents()
  const [mode, setMode] = useState<Mode>('one')
  const [typed, setTyped] = useState('')
  const [queue, setQueue] = useState<string[]>([])
  const [typedError, setTypedError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteFocused, setPasteFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverSkipped, setServerSkipped] = useState<AddStudentsAnswer['skipped']>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const pasteRef = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()
  const hintId = useId()
  const typedErrorId = useId()

  const inSection = useMemo(() => new Set(students.map((s) => s.schoolId)), [students])
  const raws = useMemo(() => (mode === 'one' ? queue : splitList(pasteText)), [mode, queue, pasteText])
  const checked = useMemo(() => checkIds(raws, inSection), [raws, inSection])
  const good = checked.filter((c) => !c.problem)
  const bad = checked.filter((c) => c.problem)
  // One at a time: a good School ID still in the box counts too (saved with the rest).
  const typedCheck = mode === 'one' && typed.trim() ? checkIds([...queue, typed.trim()], inSection).at(-1) : undefined
  const toSave = [...good.map((c) => c.shown), ...(typedCheck && !typedCheck.problem ? [typedCheck.shown] : [])]
  const placesLeft = Math.max(0, MAX_STUDENTS_PER_SECTION - students.length)
  const over = toSave.length > placesLeft

  const changed = () => {
    setServerError(null)
    setServerSkipped([])
  }

  /** One at a time: puts the typed School ID in the list under the box. */
  const addTyped = () => {
    const raw = typed.trim()
    if (!raw) {
      setTypedError('Type a School ID, like 2026-0144.')
    } else if (typedCheck?.problem) {
      setTypedError(`${problemText(typedCheck)}.`)
    } else if (typedCheck) {
      setQueue((q) => [...q, typedCheck.shown])
      setTyped('')
      setTypedError(null)
      changed()
    }
    inputRef.current?.focus()
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!active || saving || toSave.length === 0 || over) return
    // A bad School ID still in the box: say so instead of skipping it silently.
    if (typedCheck?.problem) {
      setTypedError(`${problemText(typedCheck)}.`)
      inputRef.current?.focus()
      return
    }
    setSaving(true)
    changed()
    try {
      const answer = await addStudents(active.id, toSave)
      if (answer.added.length > 0) {
        onAdded()
        return
      }
      // Nothing was added (e.g. all are in another class): stay and say why.
      setServerSkipped(answer.skipped)
    } catch (err) {
      setServerError(errorMessage(err))
    }
    setSaving(false)
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    changed()
    // Focus the new box once it is on the screen.
    requestAnimationFrame(() => (m === 'one' ? inputRef.current : pasteRef.current)?.focus())
  }

  const redChips = bad.slice(0, MAX_RED_CHIPS)
  const n = toSave.length

  return (
    <Popup title="Add students" icon={<UserPlus size={32} strokeWidth={2.4} />} wide onClose={onClose} initialFocus={inputRef}>
      <p className={dialogs.text}>To {label}. School IDs only, no names.</p>
      <form className={dialogs.form} onSubmit={save} noValidate>
        <div className={styles.switch} role="group" aria-label="How to add">
          <button type="button" className={styles.switchButton} aria-pressed={mode === 'one'} onClick={() => switchTo('one')}>
            <User size={19} aria-hidden="true" /> One at a time
          </button>
          <button type="button" className={styles.switchButton} aria-pressed={mode === 'paste'} onClick={() => switchTo('paste')}>
            <ClipboardList size={19} aria-hidden="true" /> Paste a list
          </button>
        </div>

        {mode === 'one' ? (
          <div className={styles.one}>
            <label className={dialogs.label} htmlFor={inputId}>
              School ID
            </label>
            <div className={styles.oneRow}>
              <input
                ref={inputRef}
                id={inputId}
                className={dialogs.input}
                value={typed}
                maxLength={20}
                placeholder="2026-0144"
                autoComplete="off"
                inputMode="numeric"
                aria-invalid={!!typedError}
                aria-describedby={typedError ? typedErrorId : undefined}
                onChange={(e) => {
                  setTyped(e.target.value)
                  setTypedError(null)
                  changed()
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  addTyped()
                }}
              />
              <button type="button" className={styles.addButton} onClick={addTyped}>
                <Plus size={20} strokeWidth={2.6} aria-hidden="true" /> Add
              </button>
            </div>
            {typedError && (
              <p id={typedErrorId} className={dialogs.error} role="alert">
                {typedError}
              </p>
            )}
            {queue.length > 0 && (
              <ul className={styles.queue} aria-label="School IDs to add">
                {queue.map((id) => (
                  <li key={id} className={styles.queueItem}>
                    {id}
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Remove ${id}`}
                      onClick={() => {
                        setQueue((q) => q.filter((x) => x !== id))
                        changed()
                      }}
                    >
                      <X size={15} strokeWidth={3} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className={styles.paste}>
            <div className={styles.pasteBox}>
              <textarea
                ref={pasteRef}
                className={styles.pasteArea}
                value={pasteText}
                aria-label="School IDs"
                aria-describedby={hintId}
                spellCheck={false}
                autoComplete="off"
                placeholder={'2026-0191\n2026-0192\n2026-0193'}
                onFocus={() => setPasteFocused(true)}
                onBlur={() => setPasteFocused(false)}
                onChange={(e) => {
                  setPasteText(e.target.value)
                  changed()
                }}
              />
              {/* Not typing: the same list, with the bad lines marked red. A tap goes back to typing. */}
              {!pasteFocused && checked.length > 0 && (
                <div className={styles.pasteMarks} aria-hidden="true" onClick={() => pasteRef.current?.focus()}>
                  {checked.map((c, i) => (
                    <span key={i} className={c.problem ? `${styles.mark} ${styles.markBad}` : styles.mark}>
                      {c.shown}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p id={hintId} className={styles.hint}>
              One School ID per line, or copy the column from your class list.
            </p>
          </div>
        )}

        {(n > 0 || bad.length > 0) && (
          <div className={styles.chips} aria-live="polite">
            {n > 0 && (
              <span className={`${styles.chip} ${styles.chipOk}`}>
                <Check size={17} strokeWidth={3} aria-hidden="true" />
                {n} new School {plural(n, 'ID', 'IDs')}
              </span>
            )}
            {redChips.map((c: CheckedId, i) => (
              <span key={i} className={`${styles.chip} ${styles.chipBad}`}>
                {problemText(c)}
              </span>
            ))}
            {bad.length > MAX_RED_CHIPS && (
              <span className={`${styles.chip} ${styles.chipBad}`}>+ {bad.length - MAX_RED_CHIPS} more</span>
            )}
          </div>
        )}

        <p className={over ? `${styles.places} ${styles.placesOver}` : styles.places}>
          {over
            ? `Only ${placesLeft} ${plural(placesLeft, 'place', 'places')} left. Remove some School IDs.`
            : `${placesLeft} ${plural(placesLeft, 'place', 'places')} left in this section (${MAX_STUDENTS_PER_SECTION} at most).` +
              (bad.length > 0 ? ` The ${bad.length} red ${plural(bad.length, 'one is', 'ones are')} skipped.` : '')}
        </p>

        {(serverError || serverSkipped.length > 0) && (
          <div className={styles.serverNote} role="alert">
            {serverError && <p>{serverError}</p>}
            {serverSkipped.length > 0 && <p>No new Students were added.</p>}
            {serverSkipped.map((s, i) => (
              <p key={i}>{skippedText(s)}</p>
            ))}
          </div>
        )}

        <div className={dialogs.row}>
          <button type="button" className={dialogs.stay} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${dialogs.save} ${styles.make}`} disabled={saving || n === 0 || over}>
            {saving ? 'Making codes…' : `Make ${n} login ${plural(n, 'code', 'codes')}`}
          </button>
        </div>
      </form>
    </Popup>
  )
}
