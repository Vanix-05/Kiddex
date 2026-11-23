import { useEffect, useId, useRef } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { characterArt } from '../../assets/art'
import type { JustAdded, Section, Student } from '../data/types'
import { Btn, Chip, Title } from '../planner/ui'
import { skippedText } from './skippedText'
import styles from './StudentsWindow.module.css'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * "Login codes are ready!": a second view inside My Students (no new route, no
 * page flip) right after Students were added. Their one-time codes show in big
 * yellow chips, with "What happens next" beside them. "← My Students" goes back
 * to the list; closing the window and opening it again shows the list too.
 */
export function CodesReady({
  titleId,
  section,
  justAdded,
  onBack,
  onPrint,
  onCard,
}: {
  /** Set on the real sheet (not the folding copy). */
  titleId?: string
  section: Section
  justAdded: JustAdded
  onBack: () => void
  /** Opens the Print login cards view (with "Just added"). */
  onPrint: () => void
  /** Prints one Student's card. */
  onCard: (student: Student) => void
}) {
  const { added, skipped } = justAdded
  const n = added.length
  const nextId = useId()

  // The popup just closed: move focus to the new title (not on the folding copy).
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (titleId) headRef.current?.focus({ preventScroll: true })
  }, [titleId])

  return (
    <div className={styles.content}>
      <div className={styles.head}>
        <div ref={headRef} tabIndex={-1} className={styles.readyTitle}>
          <Title id={titleId}>Login codes are ready!</Title>
          <p className={styles.sub}>
            {n} new {plural(n, 'Student', 'Students')} in Grade {section.grade} – {section.name} · each code works only once
          </p>
        </div>
        <div className={styles.tools}>
          <Btn className={styles.toolButton} icon={<ArrowLeft size={20} aria-hidden="true" />} onClick={onBack}>
            My Students
          </Btn>
          <Btn
            variant="primary"
            className={styles.toolButton}
            icon={<Printer size={20} aria-hidden="true" />}
            onClick={onPrint}
          >
            Print {n} login {plural(n, 'card', 'cards')}
          </Btn>
        </div>
      </div>

      <div className={styles.ready}>
        <div className={styles.readyList}>
          <table className={`${styles.table} ${styles.readyTable}`}>
            <thead>
              <tr>
                <th scope="col">School ID</th>
                <th scope="col">One-time code</th>
                <th scope="col">Login</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {added.map((s) => (
                <tr key={s.id} className={`${styles.row} ${styles.readyRow}`}>
                  <th scope="row" className={styles.who}>
                    <span className={`${styles.avatar} ${styles.avatarEmpty}`} aria-hidden="true" />
                    {s.schoolId}
                  </th>
                  <td>
                    <Chip tone="code" className={styles.bigCode}>
                      {s.oneTimeCode ?? '–'}
                    </Chip>
                  </td>
                  <td>
                    <Chip tone="warn" className={styles.loginChip}>
                      Not yet
                    </Chip>
                  </td>
                  <td className={styles.cardCell}>
                    <Btn
                      variant="link"
                      aria-label={`Login card for ${s.schoolId}`}
                      onClick={() => onCard(s)}
                    >
                      <Printer size={16} aria-hidden="true" /> Card
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {skipped.length > 0 && (
            <div className={styles.skippedNote}>
              {skipped.map((s, i) => (
                <p key={i}>{skippedText(s)}</p>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.next} aria-labelledby={titleId ? nextId : undefined}>
          <h3 id={titleId ? nextId : undefined} className={styles.nextTitle}>
            What happens next
          </h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                1
              </span>
              <span>Print the cards and give each Student their own.</span>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                2
              </span>
              <span>
                The Student taps <strong>New Student</strong>, then types their School ID and one-time code.
              </span>
            </li>
            <li>
              <span className={styles.stepNumber} aria-hidden="true">
                3
              </span>
              <span>They make their own 4-digit PIN code. The one-time code stops working.</span>
            </li>
          </ol>
          <div className={styles.tip}>
            <img src={characterArt.ollie} alt="" className={styles.tipOllie} draggable={false} />
            <p>
              Lost card or forgot the PIN code? Tap <strong>New code</strong> in My Students. Progress is kept.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
