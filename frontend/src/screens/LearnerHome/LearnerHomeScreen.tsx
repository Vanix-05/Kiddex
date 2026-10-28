import { useNavigate } from 'react-router-dom'
import { BuddyFigure } from '../../components/BuddyFigure/BuddyFigure'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { Companion } from '../../companions/Companion'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { petById } from '../../setup/petData'
import { isBuddyId } from '../../setup/quizData'
import { SetupLayout } from '../shared/SetupLayout'
import styles from './LearnerHomeScreen.module.css'

/** Learner Home (placeholder): the kid and their buddy, side by side. */
export function LearnerHomeScreen() {
  const navigate = useNavigate()
  const { user, avatar, companionId, buddyName, logOut } = useSession()
  const buddy = isBuddyId(companionId) ? companionId : null
  const name = buddyName || petById(buddy)?.name || 'your buddy'

  const handleLogOut = () => {
    logOut()
    navigate(paths.welcome)
  }

  return (
    <SetupLayout>
      <Card title={`Hi, ${user?.username ?? 'friend'}!`} subtitle={`You and ${name}: ready to learn!`}>
        <div className={styles.team}>
          {avatar && (
            <figure className={styles.member}>
              <Companion id={avatar} className={styles.figure} />
              <figcaption className={styles.label}>You</figcaption>
            </figure>
          )}
          {buddy && (
            <figure className={styles.member}>
              <BuddyFigure id={buddy} name={name} className={styles.figure} />
              <figcaption className={styles.label}>{name}</figcaption>
            </figure>
          )}
        </div>
        <p className={styles.soon}>More of Learner Home is coming soon!</p>
        <Button withArrow onClick={handleLogOut}>
          Log Out
        </Button>
      </Card>
    </SetupLayout>
  )
}
