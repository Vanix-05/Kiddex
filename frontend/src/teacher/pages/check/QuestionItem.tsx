import { Check, Lightbulb, Link2, Pencil, Trash2, TriangleAlert } from 'lucide-react'
import type { ServerQuestion } from '../../api/lessonsApi'
import type { FileType } from '../../data/types'
import { FLAG_LINE, isOpenMark, levelLine } from './checkLogic'
import styles from '../Check.module.css'

/** A sentence with its ___ shown as a small underlined gap. */
export function BlankSentence({ text }: { text: string }) {
  const parts = text.split('___')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className={styles.gap}>
              <span className="visually-hidden">blank</span>
            </span>
          )}
        </span>
      ))}
    </>
  )
}

interface QuestionItemProps {
  card: ServerQuestion
  fileType: FileType
  confirmingDelete: boolean
  onEdit: () => void
  onKeep: () => void
  onAskDelete: () => void
  onDelete: () => void
  onCancelDelete: () => void
}

/** One question in the Check list (read view). Marked ones ask "Is this answer right?". */
export function QuestionItem({ card, fileType, confirmingDelete, onEdit, onKeep, onAskDelete, onDelete, onCancelDelete }: QuestionItemProps) {
  const n = card.position
  const open = isOpenMark(card)
  const checkedMark = !!card.flag && card.flagChecked
  const pair = card.type === 'matching_pair'

  const meta = (
    <p className={styles.meta}>
      {levelLine(card, fileType)}
      {open && card.flag && <span className={styles.metaMark}> · {FLAG_LINE[card.flag]}</span>}
    </p>
  )

  const icons = (
    <span className={styles.icons}>
      <button type="button" className={styles.iconBtn} aria-label={`Edit question ${n}`} onClick={onEdit}>
        <Pencil size={18} aria-hidden="true" />
      </button>
      <button type="button" className={styles.iconBtn} aria-label={`Delete question ${n}`} onClick={onAskDelete}>
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </span>
  )

  return (
    <article className={[styles.card, open && styles.cardMarked, pair && styles.cardPair].filter(Boolean).join(' ')} aria-label={`Question ${n}`}>
      <div className={styles.cardMain}>
        <span className={[styles.num, open && styles.numMarked, checkedMark && styles.numChecked].filter(Boolean).join(' ')}>
          {checkedMark ? (
            <>
              <Check size={16} strokeWidth={3.2} aria-hidden="true" />
              <span className="visually-hidden">{n}, checked</span>
            </>
          ) : (
            n
          )}
        </span>

        {pair ? (
          <div className={styles.pairBody}>
            <p className={styles.pairLine}>
              <strong>{card.prompt}</strong>
              <Link2 size={17} className={styles.pairLink} aria-label="matches" />
              <strong>{card.answer}</strong>
            </p>
            {meta}
          </div>
        ) : (
          <div className={styles.cardBody}>
            <p className={styles.qText}>{card.type === 'fill_blank' ? <BlankSentence text={card.prompt} /> : card.prompt}</p>
            <ul className={styles.choices} aria-label="Choices">
              {card.choices.map((c, i) => {
                const right = c.trim() === card.answer.trim()
                return (
                  <li key={i} className={right ? `${styles.choice} ${styles.choiceRight}` : styles.choice}>
                    {right && <Check size={15} strokeWidth={3.2} aria-hidden="true" />}
                    {c}
                    {right && <span className="visually-hidden"> (right answer)</span>}
                  </li>
                )
              })}
            </ul>
            {card.explanation && (
              <p className={styles.why}>
                <Lightbulb size={15} aria-hidden="true" />
                <span>{card.explanation}</span>
              </p>
            )}
            {meta}
          </div>
        )}
        {icons}
      </div>

      {open && !confirmingDelete && (
        <div className={styles.markRow}>
          <span className={styles.markAsk}>
            <TriangleAlert size={18} aria-hidden="true" /> Is this answer right?
          </span>
          <button type="button" className={styles.keepBtn} onClick={onKeep}>
            Yes, keep it
          </button>
          <button type="button" className={styles.fixBtn} onClick={onEdit}>
            Fix it
          </button>
        </div>
      )}

      {confirmingDelete && (
        <div className={styles.confirmRow} role="group" aria-label="Delete this question?">
          <span>Delete this question?</span>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            Delete
          </button>
          <button type="button" className={styles.fixBtn} onClick={onCancelDelete}>
            Keep it
          </button>
        </div>
      )}
    </article>
  )
}
