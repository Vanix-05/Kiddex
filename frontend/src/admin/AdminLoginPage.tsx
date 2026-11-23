import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BeachCrab } from '../components/BeachCrab/BeachCrab'
import { Button } from '../components/Button/Button'
import { KiddexLogo } from '../components/KiddexLogo/KiddexLogo'
import { SceneBackground } from '../components/SceneBackground/SceneBackground'
import { TextInput } from '../components/TextInput/TextInput'
import { paths } from '../routes/paths'
import type { TeacherLoginState } from '../session/session'
import { errorMessage } from '../teacher/api/client'
import { adminApi } from './adminApi'
import { setAdminToken } from './adminToken'
import styles from './admin.module.css'

/** Show "Waking up KIDDEX…" when logging in takes longer than this (same as Teacher Login). */
const WAKING_AFTER_MS = 5000

/**
 * Admin Login (/admin/login): email + password of an admin account (made with
 * `npm run add-admin`). Works upright and sideways, on phones and laptops.
 * When the backend ended the admin login, a quiet notice shows above the form.
 */
export function AdminLoginPage() {
  const navigate = useNavigate()
  const notice = (useLocation().state as TeacherLoginState | null)?.notice
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [waking, setWaking] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setError('')
    setSubmitting(true)
    const wakingTimer = window.setTimeout(() => setWaking(true), WAKING_AFTER_MS)
    try {
      const { token } = await adminApi.logIn(email.trim(), password)
      setAdminToken(token)
      navigate(paths.admin.home, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    } finally {
      window.clearTimeout(wakingTimer)
      setWaking(false)
    }
  }

  const errorProps = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? 'admin-login-error' : undefined,
  }

  return (
    // The same beach scene and walking crab as the main login. SceneBackground
    // has the page's <main>, so the column is a <div>.
    <SceneBackground decor={<BeachCrab />}>
      <div className={styles.loginColumn}>
        <KiddexLogo className={styles.loginLogo} />
        <section className={styles.loginCard} aria-labelledby="admin-login-title">
          <h1 id="admin-login-title" className={styles.loginTitle}>
            Admin
          </h1>
          <p className={styles.loginSubtitle}>Manage Teacher accounts</p>

          {notice && !error && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextInput
              label="Email"
              icon="user"
              type="email"
              name="email"
              autoComplete="username"
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
            <div id="admin-login-error" role="alert" className={error ? styles.formError : 'visually-hidden'}>
              {error}
            </div>
            <Button type="submit" withArrow fullWidth disabled={submitting} className={styles.bigButton}>
              {submitting ? 'Logging in…' : 'Log In'}
            </Button>
            {waking && (
              <p className={styles.waking} role="status">
                Waking up KIDDEX… this can take up to a minute.
              </p>
            )}
          </form>
        </section>
      </div>
    </SceneBackground>
  )
}
