import type { CSSProperties } from 'react'
import { Backpack, BookOpen, School, UserRound, type LucideIcon } from 'lucide-react'
import type { AdminStats } from './adminApi'
import styles from './admin.module.css'

export type StatsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: AdminStats }

type CardInfo = {
  label: string
  icon: LucideIcon
  tint: string
  number: (s: AdminStats) => number
  /** The small line under the label (null = none while there are no numbers). */
  detail: (s: AdminStats | null) => string | null
}

const n = (value: number) => value.toLocaleString()

const CARDS: CardInfo[] = [
  {
    label: 'Teachers',
    icon: UserRound,
    tint: 'var(--color-tint-peach)',
    number: (s) => s.teachers,
    detail: (s) => (s ? `${n(s.activeTeachers)} active` : null),
  },
  {
    label: 'Sections',
    icon: School,
    tint: 'var(--color-tint-lavender)',
    number: (s) => s.sections,
    detail: () => 'Up to 45 Students each',
  },
  {
    label: 'Students',
    icon: Backpack,
    tint: 'var(--color-tint-mint)',
    number: (s) => s.students,
    detail: (s) => (s ? `${n(s.registeredStudents)} set up` : null),
  },
  {
    label: 'Lessons',
    icon: BookOpen,
    tint: 'var(--color-tint-pink)',
    number: (s) => s.lessons,
    detail: (s) => (s ? `${n(s.approvedLessons)} approved` : null),
  },
]

/**
 * The 4 totals at the top of the Admin page. Numbers only: no names, School IDs,
 * scores or lists. "–" while loading or when the totals could not be loaded.
 */
export function CountCards({ state, onRetry }: { state: StatsState; onRetry: () => void }) {
  const stats = state.status === 'ready' ? state.stats : null
  return (
    <>
      <ul className={styles.countCards} aria-label="Totals" aria-busy={state.status === 'loading' || undefined}>
        {CARDS.map(({ label, icon: CardIcon, tint, number, detail }) => {
          const value = stats ? n(number(stats)) : '–'
          const line = detail(stats)
          const spoken = stats
            ? `${value} ${label}${line ? `, ${line.charAt(0).toLowerCase()}${line.slice(1)}` : ''}`
            : `${label}: ${state.status === 'loading' ? 'loading' : 'not loaded'}`
          return (
            // --tint: the card's background is a light mix of it (admin.module.css).
            <li key={label} className={styles.countCard} style={{ '--tint': tint } as CSSProperties}>
              <span className="visually-hidden">{spoken}</span>
              <span className={styles.countIcon} aria-hidden="true">
                <CardIcon strokeWidth={2.2} />
              </span>
              <span className={styles.countText} aria-hidden="true">
                <span className={styles.countNumber}>{value}</span>
                <span className={styles.countLabel}>{label}</span>
                {line && <span className={styles.countDetail}>{line}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {state.status === 'error' && (
        <p className={styles.countError} role="alert">
          Couldn’t load the totals.
          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={onRetry}>
            Try again
          </button>
        </p>
      )}
    </>
  )
}
