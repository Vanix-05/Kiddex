import { Plus, Shapes } from 'lucide-react'
import { errorMessage } from '../api/client'
import { useSection } from '../data/useTeacherData'
import { usePlannerActions } from '../planner/plannerActions'
import { Btn, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './NoSection.module.css'

/**
 * Before the first section: a friendly empty page with a New section button.
 * While the sections load (after a refresh) or if they can't, a quiet line instead.
 */
export function NoSectionLeft({ title, line, live }: { title: string; line: string; live: boolean }) {
  const { newSection } = usePlannerActions()
  const { loading, error, retry } = useSection()
  if (loading || error) {
    return (
      <PageBody side="L">
        <Title>{title}</Title>
        {error ? (
          <div className={styles.problem} role="alert">
            <p>{errorMessage(error)}</p>
            <Btn tabIndex={live ? undefined : -1} onClick={retry}>
              Try again
            </Btn>
          </div>
        ) : (
          <Sub>Loading your sections…</Sub>
        )}
      </PageBody>
    )
  }
  return (
    <PageBody side="L">
      <Title>{title}</Title>
      <Sub>No section yet</Sub>
      <div className={styles.box}>
        <span className={styles.icon} aria-hidden="true">
          <Shapes size={34} strokeWidth={2} />
        </span>
        <strong className={styles.head}>Make a section first</strong>
        <p className={styles.line}>{line}</p>
        <Btn variant="primary" icon={<Plus size={20} aria-hidden="true" />} tabIndex={live ? undefined : -1} onClick={newSection}>
          New section
        </Btn>
      </div>
    </PageBody>
  )
}

export function NoSectionRight() {
  const { loading, error } = useSection()
  if (loading || error) return <PageBody side="R">{null}</PageBody>
  return (
    <PageBody side="R">
      <OllieNote>Start with a section, like &ldquo;Grade 4 – Sampaguita&rdquo;. It becomes a tab on top of this planner.</OllieNote>
    </PageBody>
  )
}
