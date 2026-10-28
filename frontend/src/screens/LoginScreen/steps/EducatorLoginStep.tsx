import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TextInput } from '../../../components/TextInput/TextInput'
import { Button } from '../../../components/Button/Button'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { LoginCard } from '../LoginCard'
import { BackLink, Divider, FormError } from './shared'
import styles from './steps.module.css'

/** Step 2 (/educator/login): email + password. Any values work for now (fake auth). */
export function EducatorLoginStep() {
  const navigate = useNavigate()
  const { logInEducator } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await logInEducator(email, password)
      navigate(paths.educator.home)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const errorProps = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? 'educator-login-error' : undefined,
  }

  return (
    <LoginCard title="Educator Login" subtitle="For teachers and parents">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextInput
          label="Email"
          icon="user"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...errorProps}
        />
        <TextInput
          label="Password"
          icon="lock"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          {...errorProps}
        />
        <FormError id="educator-login-error" message={error} />
        <Button type="submit" withArrow fullWidth disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </Button>
      </form>

      <div className={styles.linkRow}>
        <Divider>Don’t have an account?</Divider>
        <Link to={paths.register} className={styles.textLink}>
          Register
        </Link>
      </div>

      <BackLink to={paths.learner.code}>I’m a Learner</BackLink>
    </LoginCard>
  )
}
