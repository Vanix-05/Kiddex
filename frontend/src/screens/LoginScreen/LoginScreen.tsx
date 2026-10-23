import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { Card } from '../../components/Card/Card'
import { TextInput } from '../../components/TextInput/TextInput'
import { Button } from '../../components/Button/Button'
import { SignPost } from '../../components/SignPost/SignPost'
import { characterArt } from '../../assets/art'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { useMouseTilt } from '../../hooks/useMouseTilt'
import styles from './LoginScreen.module.css'

export function LoginScreen() {
  const navigate = useNavigate()
  const { logIn } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const kidsRef = useMouseTilt<HTMLImageElement>()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // Mock login: see TODO in SessionProvider.logIn.
      const user = await logIn(username, password)
      navigate(user.role === 'learner' ? paths.learner.chooseCompanion : paths.educator.home)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SceneBackground>
      <div className={styles.layout}>
        <header className={styles.brand}>
          <KiddexLogo />
        </header>

        <div className={styles.hero} aria-hidden="true">
          <SignPost className={styles.sign} />
          <img
            ref={kidsRef}
            src={characterArt.girlFoxLogin}
            alt=""
            className={styles.kids}
            width={371}
            height={474}
          />
        </div>

        <Card
          title="Welcome!"
          subtitle={
            <>
              Log in to continue your
              <br />
              learning adventure!
            </>
          }
          className={styles.card}
        >
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextInput
              label="Username"
              icon="user"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <TextInput
              label="Password"
              icon="lock"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />

            <p id="login-error" className={styles.error} role="alert">
              {error}
            </p>

            <Button type="submit" withArrow fullWidth disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log In'}
            </Button>
          </form>

          <div className={styles.registerRow}>
            <span className={styles.divider}>Don’t have an account?</span>
            <Link to={paths.register} className={styles.registerLink}>
              Register
            </Link>
          </div>
        </Card>
      </div>
    </SceneBackground>
  )
}
