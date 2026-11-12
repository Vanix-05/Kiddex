import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowRight, Check, Lightbulb } from 'lucide-react'
import styles from './FeedbackStrip.module.css'

/**
 * The strip under the board after an answer. Green with a check when right,
 * cream with a bulb when not. Its button takes keyboard focus, so Enter goes on.
 */
export function FeedbackStrip({
  tone,
  title,
  children,
  action,
  onAction,
}: {
  tone: 'right' | 'hint'
  title: string
  children?: ReactNode
  action: string
  onAction: () => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className={`${styles.strip} ${tone === 'right' ? styles.right : styles.hint}`}>
      <span className={styles.icon} aria-hidden="true">
        {tone === 'right' ? <Check size={34} strokeWidth={3.4} /> : <Lightbulb size={30} strokeWidth={2.4} />}
      </span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {children && <p className={styles.body}>{children}</p>}
      </div>
      <button ref={button} type="button" className={styles.button} onClick={onAction}>
        {action} <ArrowRight size={22} strokeWidth={2.8} aria-hidden="true" />
      </button>
    </div>
  )
}
