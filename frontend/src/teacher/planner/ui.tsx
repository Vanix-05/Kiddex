import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { characterArt } from '../../assets/art'
import styles from './ui.module.css'

/** Padding for a left or right page (left clears the red margin line). */
export function PageBody({ side, children, className }: { side: 'L' | 'R'; children: ReactNode; className?: string }) {
  return <div className={[styles.body, side === 'L' ? styles.bodyL : styles.bodyR, className].filter(Boolean).join(' ')}>{children}</div>
}

/** Big page title with a highlighter stroke behind it. */
export function Title({ children, color = 'yellow', id }: { children: ReactNode; color?: 'yellow' | 'blue'; id?: string }) {
  return (
    <h2 id={id} className={styles.title}>
      <span className={color === 'blue' ? `${styles.mark} ${styles.markBlue}` : styles.mark}>{children}</span>
    </h2>
  )
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className={styles.sub}>{children}</p>
}

export function Heading({ children, after }: { children: ReactNode; after?: ReactNode }) {
  return (
    <h3 className={styles.heading}>
      {children}
      {after}
    </h3>
  )
}

export type Tone = 'warn' | 'ok' | 'info' | 'neutral' | 'ai' | 'code'

export function Chip({ tone, icon, children, className }: { tone: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={[styles.chip, styles[tone], className].filter(Boolean).join(' ')}>
      {icon}
      {children}
    </span>
  )
}

type BtnVariant = 'primary' | 'outline' | 'green' | 'danger' | 'link'

export function Btn({
  variant = 'outline',
  icon,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: ReactNode }) {
  return (
    <button type="button" className={[styles.btn, styles[variant], className].filter(Boolean).join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  )
}

/** Filter pills: the chosen one is dark. */
export function Pills<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.pills} role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          className={it.value === value ? `${styles.pill} ${styles.pillOn}` : styles.pill}
          aria-pressed={it.value === value}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** Mastery color: red below 50%, yellow below 70%, green from 70%. */
const masteryTone =(percent: number) => (percent < 50 ? 'red' : percent < 70 ? 'yellow' : 'green')

export function Bar({ percent, className }: { percent: number; className?: string }) {
  const fill = { red: styles.fillRed, yellow: styles.fillYellow, green: styles.fillGreen }[masteryTone(percent)]
  return (
    <span className={[styles.bar, className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className={`${styles.barFill} ${fill}`} style={{ width: `${percent}%` }} />
    </span>
  )
}

/** A page with a folded corner and "PDF" / "PPT" / "DOC" (DOC is blue, like Word). */
export function FileBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={[styles.file, type === 'DOC' && styles.fileDoc, className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className={styles.fileFold} />
      {type}
    </span>
  )
}

/**
 * Ollie's sticky note at the bottom of a right page, with Ollie standing
 * beside it. Placed by the page (absolute, bottom area).
 */
export function OllieNote({ children }: { children: ReactNode }) {
  return (
    <>
      <aside className={styles.note}>
        <span className={styles.tape} aria-hidden="true" />
        <strong className={styles.noteTitle}>Ollie’s note</strong>
        <p className={styles.noteText}>{children}</p>
      </aside>
      <img src={characterArt.ollie} alt="" className={styles.ollie} draggable={false} />
    </>
  )
}

/** A short line for things that only exist with data, with a way back. */
export function EmptyLine({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.emptyLine}>
      <p>{children}</p>
      {action}
    </div>
  )
}
