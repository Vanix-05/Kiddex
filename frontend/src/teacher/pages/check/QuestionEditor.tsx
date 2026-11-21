import { useId, useRef } from 'react'
import { Check, Plus } from 'lucide-react'
import type { CardForm, FormField } from './checkLogic'
import styles from '../Check.module.css'

const LEVELS: { value: CardForm['level']; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

interface QuestionEditorProps {
  /** "Editing question 5" or "New question". */
  title: string
  number?: number
  form: CardForm
  problems: Partial<Record<FormField, string>>
  onChange: (form: CardForm) => void
  onSave: () => void
  onCancel: () => void
  /** Another card was asked for while this one has unsaved changes. */
  askSwitch: boolean
  onSwitchSave: () => void
  onSwitchDiscard: () => void
}

/** The question opened in place as a form (c2). Cancel / Save changes. */
export function QuestionEditor({ title, number, form, problems, onChange, onSave, onCancel, askSwitch, onSwitchSave, onSwitchDiscard }: QuestionEditorProps) {
  const ids = useId()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const set = (patch: Partial<CardForm>) => onChange({ ...form, ...patch })
  const pair = form.type === 'matching_pair'
  const blank = form.type === 'fill_blank'

  /** Puts ___ where the cursor is in the sentence. */
  const addBlank = () => {
    const el = promptRef.current
    const at = el ? el.selectionStart : form.prompt.length
    const end = el ? el.selectionEnd : at
    const before = form.prompt.slice(0, at)
    const gap = `${before && !before.endsWith(' ') ? ' ' : ''}___${form.prompt.slice(end).startsWith(' ') ? '' : ' '}`
    set({ prompt: `${before}${gap}${form.prompt.slice(end)}` })
    requestAnimationFrame(() => {
      el?.focus()
      const cursor = before.length + gap.length
      el?.setSelectionRange(cursor, cursor)
    })
  }

  const problem = (field: FormField) =>
    problems[field] ? (
      <p className={styles.fieldProblem} role="alert" id={`${ids}-${field}-p`}>
        {problems[field]}
      </p>
    ) : null

  const setChoice = (i: number, value: string) => set({ choices: form.choices.map((c, j) => (j === i ? value : c)) })

  return (
    <article className={styles.editor} aria-label={title}>
      <div className={styles.editorHead}>
        {number !== undefined && <span className={styles.num}>{number}</span>}
        <h3 className={styles.editorTitle}>{title}</h3>
      </div>

      <label className={styles.fLabel} htmlFor={`${ids}-prompt`}>
        {pair ? 'Left side' : blank ? 'Sentence' : 'Question'}
        {blank && <span className={styles.fHint}> · put ___ where the missing word goes</span>}
      </label>
      {pair ? (
        <input
          id={`${ids}-prompt`}
          className={styles.fInput}
          value={form.prompt}
          maxLength={80}
          aria-invalid={!!problems.prompt}
          aria-describedby={problems.prompt ? `${ids}-prompt-p` : undefined}
          onChange={(e) => set({ prompt: e.target.value })}
        />
      ) : (
        <div className={styles.promptRow}>
          <textarea
            id={`${ids}-prompt`}
            ref={promptRef}
            className={styles.fArea}
            rows={2}
            value={form.prompt}
            aria-invalid={!!problems.prompt}
            aria-describedby={problems.prompt ? `${ids}-prompt-p` : undefined}
            onChange={(e) => set({ prompt: e.target.value })}
          />
          {blank && (
            <button type="button" className={styles.addBlank} onClick={addBlank}>
              <Plus size={16} aria-hidden="true" /> Add blank
            </button>
          )}
        </div>
      )}
      {problem('prompt')}

      {pair ? (
        <>
          <label className={styles.fLabel} htmlFor={`${ids}-right`}>
            Right side
          </label>
          <input
            id={`${ids}-right`}
            className={styles.fInput}
            value={form.right}
            maxLength={80}
            aria-invalid={!!problems.answer}
            onChange={(e) => set({ right: e.target.value })}
          />
          {problem('answer')}
        </>
      ) : (
        <div role="group" aria-labelledby={`${ids}-choices`}>
          <span className={styles.fLabel} id={`${ids}-choices`}>
            {blank ? 'Words' : 'Choices'} <span className={styles.fHint}>· tap the round mark for the right answer</span>
          </span>
          <div className={styles.choiceBoxes}>
            {form.choices.map((c, i) => {
              const right = i === form.rightIndex
              return (
                <div key={i} className={right ? `${styles.choiceBox} ${styles.choiceBoxRight}` : styles.choiceBox}>
                  <button
                    type="button"
                    className={styles.pick}
                    aria-pressed={right}
                    aria-label={`${blank ? 'Word' : 'Choice'} ${i + 1} is the right answer`}
                    onClick={() => set({ rightIndex: i })}
                  >
                    {right && <Check size={15} strokeWidth={3.4} aria-hidden="true" />}
                  </button>
                  <input
                    className={styles.choiceInput}
                    value={c}
                    maxLength={80}
                    aria-label={`${blank ? 'Word' : 'Choice'} ${i + 1}`}
                    onChange={(e) => setChoice(i, e.target.value)}
                  />
                  {right && <span className={styles.rightTag}>Right</span>}
                </div>
              )
            })}
          </div>
          {problem('choices')}
          {problem('answer')}
        </div>
      )}

      <div className={styles.whyLevel}>
        {!pair && (
          <div className={styles.whyField}>
            <label className={styles.fLabel} htmlFor={`${ids}-why`}>
              Why it’s right
            </label>
            <textarea id={`${ids}-why`} className={styles.fArea} rows={2} value={form.explanation} onChange={(e) => set({ explanation: e.target.value })} />
            {problem('explanation')}
          </div>
        )}
        <div role="group" aria-labelledby={`${ids}-level`}>
          <span className={styles.fLabel} id={`${ids}-level`}>
            Level
          </span>
          <div className={styles.levels}>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={form.level === l.value}
                className={form.level === l.value ? `${styles.level} ${styles.levelOn}` : styles.level}
                onClick={() => set({ level: l.value })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {askSwitch ? (
        <div className={styles.askRow} role="group" aria-label="Save changes first?">
          <span>Save changes first?</span>
          <button type="button" className={styles.saveSmall} onClick={onSwitchSave}>
            Save
          </button>
          <button type="button" className={styles.fixBtn} onClick={onSwitchDiscard}>
            Discard
          </button>
        </div>
      ) : (
        <div className={styles.editActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={onSave}>
            <Check size={18} strokeWidth={3} aria-hidden="true" /> Save changes
          </button>
        </div>
      )}
    </article>
  )
}
