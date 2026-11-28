import { useEffect, useRef, type ReactNode } from 'react'
import { ArchiveRestore, ArrowLeft, Lock, Trash2 } from 'lucide-react'
import { errorMessage } from '../api/client'
import { buddyHeads } from '../assets'
import type { Student } from '../data/types'
import { useRemovedStudents } from '../data/useTeacherData'
import { Btn, Title } from '../planner/ui'
import styles from './StudentsWindow.module.css'

interface RemovedStudentsProps {
  titleId?: string
  /** "Grade 4 – Sampaguita" */
  sectionName: string
  /** ← My Students (also Esc, and on its own when none are left). */
  onBack: () => void
  onRestore: (s: Student) => void | Promise<void>
  /** The Delete forever? popup. */
  onDelete: (s: Student) => void
  /** The toast pill (the same one My Students shows). */
  toast: ReactNode
}

/**
 * Removed (mockups 4-removed and 10-phone-removed): the section's removed Students
 * inside the My Students window, like the Student's page. Restore, or Delete forever
 * (two steps: it is only offered here). They don't count toward the 45.
 */
export function RemovedStudents({ titleId, sectionName, onBack, onRestore, onDelete, toast }: RemovedStudentsProps) {
  const { removed, loaded, loading, error, retry } = useRemovedStudents()
  const tableRef = useRef<HTMLTableElement>(null)

  // None left (all restored or deleted): back to My Students on its own.
  useEffect(() => {
    if (loaded && removed.length === 0) onBack()
  }, [loaded, removed.length, onBack])

  const restore = async (s: Student) => {
    await onRestore(s)
    // The row is gone: focus the next Restore, if any.
    requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>('[data-restore]')?.focus({ preventScroll: true }))
  }

  return (
    <div className={styles.content}>
      <div className={`${styles.head} ${styles.removedHead}`}>
        <div tabIndex={-1} data-removed-title className={styles.removedTitle}>
          <Title id={titleId}>Removed</Title>
          <p className={styles.sub}>
            {sectionName} · {removed.length} removed · They don’t count toward the 45
          </p>
        </div>
        <Btn className={`${styles.toolButton} ${styles.backButton}`} icon={<ArrowLeft size={20} aria-hidden="true" />} onClick={onBack}>
          My Students
        </Btn>
      </div>

      {loading || error ? (
        error ? (
          <div className={styles.loadError} role="alert">
            <p>{errorMessage(error)}</p>
            <Btn onClick={retry}>Try again</Btn>
          </div>
        ) : (
          <p className={styles.loading} role="status">
            Loading…
          </p>
        )
      ) : (
        <table ref={tableRef} className={`${styles.table} ${styles.removedTable}`}>
          <thead>
            <tr>
              <th scope="col">School ID</th>
              <th scope="col">Buddy</th>
              <th scope="col">Removed</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {removed.map((s) => (
              <tr key={s.id} className={styles.row}>
                <th scope="row" className={`${styles.who} ${styles.whoRemoved}`}>
                  {s.buddy ? (
                    <img src={buddyHeads[s.buddy]} alt="" className={`${styles.avatar} ${styles.avatarFaded}`} />
                  ) : (
                    <span className={`${styles.avatar} ${styles.avatarEmpty}`} aria-hidden="true" />
                  )}
                  {s.schoolId}
                </th>
                <td className={styles.buddy}>
                  {s.buddyName ?? (
                    <span className={styles.muted}>
                      <span aria-hidden="true">–</span>
                      <span className="visually-hidden">no buddy yet</span>
                    </span>
                  )}
                </td>
                <td>{s.removedLabel}</td>
                <td>
                  <span className={styles.actions}>
                    <Btn
                      className={styles.restoreButton}
                      icon={<ArchiveRestore size={18} aria-hidden="true" />}
                      aria-label={`Restore ${s.schoolId}`}
                      data-restore
                      onClick={() => void restore(s)}
                    >
                      Restore
                    </Btn>
                    <Btn variant="link" className={styles.deleteLink} aria-label={`Delete ${s.schoolId} forever`} onClick={() => onDelete(s)}>
                      <Trash2 size={17} aria-hidden="true" /> Delete forever
                    </Btn>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.foot}>
        <span className={styles.footNote}>
          <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
          Removed Students can't log in. Nothing is deleted until you tap Delete forever.
        </span>
        <span className={styles.footEnd}>{toast}</span>
      </div>
    </div>
  )
}
