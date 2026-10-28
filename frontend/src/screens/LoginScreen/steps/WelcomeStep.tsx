import { Link } from 'react-router-dom'
import { companionArt } from '../../../assets/art'
import { paths } from '../../../routes/paths'
import { LoginCard } from '../LoginCard'
import { Divider } from './shared'
import styles from './steps.module.css'

/** Step 1 (/): learner or educator? */
export function WelcomeStep() {
  return (
    <LoginCard title="Welcome!" subtitle="Who is logging in?">
      <Link to={paths.learner.code} className={styles.learnerButton}>
        <span className={styles.learnerIcon} aria-hidden="true">
          <img src={companionArt.fox} alt="" draggable={false} />
        </span>
        <span className={styles.learnerText}>
          <span className={styles.learnerTitle}>I’m a Learner</span>
          <span className={styles.learnerHint}>Play and learn!</span>
        </span>
      </Link>

      <div className={styles.linkRow}>
        <Divider>Teacher or parent?</Divider>
        <Link to={paths.educator.login} className={styles.textLink}>
          I’m an Educator
        </Link>
      </div>
    </LoginCard>
  )
}
