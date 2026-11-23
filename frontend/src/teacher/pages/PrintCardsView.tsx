import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Lock, Printer } from 'lucide-react'
import type { JustAdded, Section } from '../data/types'
import { useStudentsLoad, useTeacher } from '../data/useTeacherData'
import { Btn, Title } from '../planner/ui'
import { CardPreview } from '../print/LoginCards'
import { CARDS_PER_PAGE, pageCount, toLoginCards, usePrintCards } from '../print/printCards'
import sheet from './StudentsWindow.module.css'
import styles from './PrintCardsView.module.css'

type Which = 'justAdded' | 'notYet'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * Print login cards: a view inside My Students (no new route, no page flip).
 * Left: which Students and the Print button; right: a preview of the first page.
 * "Just added" only shows when we came from "Login codes are ready!".
 */
export function PrintCardsView({
  titleId,
  section,
  justAdded,
  onBack,
}: {
  /** Set on the real sheet (not the folding copy). */
  titleId?: string
  section: Section
  /** The Students just added, when we came from "Login codes are ready!". */
  justAdded: JustAdded | null
  onBack: () => void
}) {
  const { students } = useStudentsLoad()
  const teacher = useTeacher()
  const print = usePrintCards()
  const [which, setWhich] = useState<Which>(justAdded ? 'justAdded' : 'notYet')

  const notYet = useMemo(() => toLoginCards(students, section, teacher.name), [students, section, teacher.name])
  // Just added: their current codes (one may have registered since); the add answer until the list loads.
  const justAddedCards = useMemo(() => {
    if (!justAdded) return []
    const ids = new Set(justAdded.added.map((s) => s.id))
    const fromList = notYet.filter((c) => ids.has(c.id))
    return students.length > 0 ? fromList : toLoginCards(justAdded.added, section, teacher.name)
  }, [justAdded, notYet, students.length, section, teacher.name])

  const cards = which === 'justAdded' ? justAddedCards : notYet
  const pages = pageCount(cards.length)

  // Focus the title when the view opens (not on the folding copy).
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (titleId) headRef.current?.focus({ preventScroll: true })
  }, [titleId])

  return (
    <div className={`${sheet.content} ${styles.view}`}>
      <div className={styles.side}>
        <div ref={headRef} tabIndex={-1} className={sheet.readyTitle}>
          <Title id={titleId}>Print login cards</Title>
          <p className={sheet.sub}>{CARDS_PER_PAGE} cards on each page. Cut along the dashed lines.</p>
        </div>

        <div className={styles.box}>
          <h3 className={styles.boxTitle}>Which Students?</h3>
          <div className={styles.switch} role="group" aria-label="Which Students">
            {justAdded && (
              <button
                type="button"
                className={styles.switchButton}
                aria-pressed={which === 'justAdded'}
                onClick={() => setWhich('justAdded')}
              >
                Just added · {justAddedCards.length}
              </button>
            )}
            <button
              type="button"
              className={styles.switchButton}
              aria-pressed={which === 'notYet'}
              onClick={() => setWhich('notYet')}
            >
              All Not yet · {notYet.length}
            </button>
          </div>
          <p className={styles.boxLine}>Registered Students don’t need a card. If one forgets their PIN code, use New code.</p>
        </div>

        <p className={styles.lock}>
          <Lock size={18} strokeWidth={2.2} aria-hidden="true" />
          Hand the cards out yourself. Anyone with a card can make that Student’s PIN code until they do.
        </p>

        <div className={styles.buttons}>
          {cards.length === 0 && (
            <p className={styles.none} role="status">
              Everyone has made their PIN code. No cards needed.
            </p>
          )}
          <div className={styles.buttonRow}>
            <Btn className={styles.back} icon={<ArrowLeft size={20} aria-hidden="true" />} onClick={onBack}>
              Back
            </Btn>
            <Btn
              variant="primary"
              className={styles.print}
              icon={<Printer size={22} aria-hidden="true" />}
              disabled={cards.length === 0}
              onClick={() => print(cards)}
            >
              {cards.length === 0 ? 'Print' : `Print ${pages} ${plural(pages, 'page', 'pages')}`}
            </Btn>
          </div>
        </div>
      </div>

      <div className={styles.preview}>
        <CardPreview cards={cards} />
      </div>
    </div>
  )
}
