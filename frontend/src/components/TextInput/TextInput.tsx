import { useId, useState, type InputHTMLAttributes } from 'react'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './TextInput.module.css'

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Accessible label. Hidden visually; the placeholder shows the same text. */
  label: string
  icon?: IconName
  type?: 'text' | 'password' | 'email'
}

export function TextInput({ label, icon, type = 'text', id, placeholder, ...rest }: TextInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      {icon && <Icon name={icon} size={28} className={styles.icon} />}
      <input
        id={inputId}
        type={isPassword && revealed ? 'text' : type}
        placeholder={placeholder ?? label}
        className={styles.input}
        {...rest}
      />
      {isPassword && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          aria-controls={inputId}
        >
          <Icon name={revealed ? 'eyeOff' : 'eye'} size={28} />
        </button>
      )}
    </div>
  )
}
