import type { ReactNode } from 'react'
import { Card } from '../../components/Card/Card'
import layout from './LoginScreen.module.css'
import styles from './LoginCard.module.css'

interface LoginCardProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  /** Tall card (PIN keypad): gets tighter spacing on short screens. */
  tall?: boolean
}

const LONG_TITLE = 11

/** The card on the right of the login scene, placed and sized by LoginScreen.module.css. */
export function LoginCard({ title, subtitle, children, tall = false }: LoginCardProps) {
  const className = [
    layout.card,
    title.length > LONG_TITLE && styles.longTitle,
    tall && styles.tall,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Card title={title} subtitle={subtitle} className={className}>
      {children}
    </Card>
  )
}
