import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Button/Button'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { LoginCard } from '../LoginCard'
import { BackLink, FormError } from './shared'
import styles from './steps.module.css'

const CODE_LENGTH = 6
const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Step 3 (/learner/code): the 6-letter class code, one box per letter. */
export function ClassCodeStep() {
  const navigate = useNavigate()
  const { classCode, enterClassCode } = useSession()
  // Coming back via "Change class code" shows the code they typed before.
  const [letters, setLetters] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, (_, i) => classCode?.[i] ?? ''),
  )
  const [error, setError] = useState('')
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const focusBox = (index: number) => boxes.current[Math.max(0, Math.min(index, CODE_LENGTH - 1))]?.focus()

  // Start in the first empty box.
  useEffect(() => {
    const firstEmpty = letters.findIndex((l) => !l)
    focusBox(firstEmpty === -1 ? CODE_LENGTH - 1 : firstEmpty)
    // Only on first show.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Puts the typed or pasted characters into the boxes from `index` on, then moves along. */
  const fillFrom = (index: number, text: string) => {
    const chars = clean(text).slice(0, CODE_LENGTH - index).split('')
    if (chars.length === 0) return
    setLetters((prev) => {
      const next = [...prev]
      chars.forEach((c, i) => (next[index + i] = c))
      return next
    })
    setError('')
    focusBox(index + chars.length)
  }

  const clearBox = (index: number) => {
    setLetters((prev) => prev.map((l, i) => (i === index ? '' : l)))
    setError('')
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !letters[index] && index > 0) {
      event.preventDefault()
      clearBox(index - 1)
      focusBox(index - 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData('text'))
  }

  const code = letters.join('')
  const complete = code.length === CODE_LENGTH

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!complete) return
    if (enterClassCode(code)) {
      navigate(paths.learner.who)
    } else {
      setError('Hmm, we can’t find that class. Check the code with your teacher!')
    }
  }

  return (
    <LoginCard title="Hi, Learner!" subtitle="Type the code your teacher gave you">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.codeBoxes} role="group" aria-label="Class code">
          {letters.map((letter, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el
              }}
              className={styles.codeBox}
              value={letter}
              onChange={(e) => {
                const value = clean(e.target.value)
                if (value) fillFrom(i, value)
                else clearBox(i)
              }}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(i, e)}
              onFocus={(e) => e.target.select()}
              aria-label={`Letter ${i + 1} of ${CODE_LENGTH}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'class-code-error' : undefined}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
          ))}
        </div>
        <FormError id="class-code-error" message={error} />
        <Button type="submit" withArrow fullWidth disabled={!complete}>
          Next
        </Button>
      </form>

      <BackLink to={paths.welcome}>Back</BackLink>
    </LoginCard>
  )
}
