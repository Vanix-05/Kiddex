import { Plus, Shapes } from 'lucide-react'
import { usePlannerActions } from '../planner/plannerActions'
import { Btn, OllieNote, PageBody, Sub, Title } from '../planner/ui'
import styles from './NoSection.module.css'

/** Before the first section: a friendly empty page with a New section button. */
export function NoSectionLeft({ title, line, live }: { title: string; line: string; live: boolean }) {
  const { newSection } = usePlannerActions()
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
  return (
    <PageBody side="R">
      <OllieNote>Start with a section, like &ldquo;Grade 4 – Sampaguita&rdquo;. It becomes a tab on top of this planner.</OllieNote>
    </PageBody>
  )
}
