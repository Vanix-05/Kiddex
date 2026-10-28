import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon/Icon'
import styles from './steps.module.css'

/** "← Back"-style link at the bottom of a login card. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={styles.backLink}>
      <Icon name="arrowLeft" size={20} />
      <span>{children}</span>
    </Link>
  )
}

/** Thin line – text – thin line. */
export function Divider({ children }: { children: ReactNode }) {
  return <span className={styles.divider}>{children}</span>
}

/** Error message. Always in the page (empty when there's no error) so screen readers announce it. */
export function FormError({ id, message }: { id?: string; message: string }) {
  return (
    <div id={id} role="alert" className={message ? styles.error : 'visually-hidden'}>
      {message}
    </div>
  )
}
