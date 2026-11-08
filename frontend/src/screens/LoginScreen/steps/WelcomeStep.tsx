import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudentFlow } from '../NewStudent/StudentFlow'
import { characterArt, companionArt } from '../../../assets/art'
import { paths } from '../../../routes/paths'
import { LoginCard } from '../LoginCard'
import { Divider } from './shared'
import styles from './steps.module.css'

/** Step 1 (/): student or teacher? */
export function WelcomeStep() {
  // "I'm a Student" opens a popup over this screen (the URL stays the same).
  const [studentOpen, setStudentOpen] = useState(false)
  const studentRef = useRef<HTMLButtonElement>(null)
  const closeStudent = () => {
    setStudentOpen(false)
    studentRef.current?.focus() // back to where the keyboard user was
  }

  return (
    <LoginCard title="Welcome!" className={styles.welcomeCard} titleMarks="chevrons">
      <button
        ref={studentRef}
        type="button"
        className={`${styles.roleButton} ${styles.student}`}
        aria-haspopup="dialog"
        onClick={() => setStudentOpen(true)}
      >
        <span className={styles.roleIcon} aria-hidden="true">
          <img src={companionArt.fox} alt="" draggable={false} />
        </span>
        <span className={styles.roleText}>
          <span className={styles.roleTitle}>I’m a Student</span>
          <span className={styles.roleHint}>I have my login card</span>
        </span>
      </button>
      {studentOpen && <StudentFlow onClose={closeStudent} />}

      <Link to={paths.teacher.login} className={`${styles.roleButton} ${styles.teacher}`}>
        <span className={styles.roleIcon} aria-hidden="true">
          <img src={characterArt.ollie} alt="" draggable={false} />
        </span>
        <span className={styles.roleText}>
          <span className={styles.roleTitle}>I’m a Teacher</span>
          <span className={styles.roleHint}>Log in with email</span>
        </span>
      </Link>

      <div className={styles.linkRow}>
        <Divider>New teacher?</Divider>
        <p className={styles.adminNote}>
          <span aria-hidden="true">🔒 </span>
          Your school’s <strong>KIDDEX admin</strong> makes your account.
        </p>
      </div>
    </LoginCard>
  )
}
