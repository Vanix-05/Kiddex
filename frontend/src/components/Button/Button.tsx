import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Show the "→" arrow after the label. */
  withArrow?: boolean
  fullWidth?: boolean
}

export function Button({
  withArrow = false,
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} {...rest}>
      <span>{children}</span>
      {withArrow && <Icon name="arrowRight" size={26} />}
    </button>
  )
}
