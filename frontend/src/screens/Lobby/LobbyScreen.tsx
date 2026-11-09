import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { BuddyFigure } from '../../components/BuddyFigure/BuddyFigure'
import { Companion } from '../../companions/Companion'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { lookBuddyColor, lookBuddyExtras, lookColors, lookYouExtras, SECTION } from '../../setup/customizeData'
import { isBuddyId } from '../../setup/quizData'
import { SetupLayout } from '../shared/SetupLayout'
import styles from './LobbyScreen.module.css'

/**
 * Rene Island, the class Lobby (/lobby). A placeholder for now: the Student
 * and their buddy in their Customize look, and Log out.
 */
export function LobbyScreen() {
  const navigate = useNavigate()
  const { avatar, companionId, buddyName, look, logOut } = useSession()
  const buddy = isBuddyId(companionId) ? companionId : null

  const handleLogOut = () => {
    logOut()
    navigate(paths.welcome)
  }

  return (
    <SetupLayout>
      <Card title="Rene Island" subtitle={`Your ${SECTION} Lobby is coming soon!`}>
        <div className={styles.pair}>
          {avatar && <Companion id={avatar} className={styles.figure} colors={lookColors(look)} extras={lookYouExtras(look)} />}
          {buddy && (
            <BuddyFigure
              id={buddy}
              name={buddyName ?? undefined}
              className={styles.figure}
              buddyColor={lookBuddyColor(look)}
              extras={lookBuddyExtras(look)}
            />
          )}
        </div>
        <Button withArrow onClick={handleLogOut}>
          Log out
        </Button>
      </Card>
    </SetupLayout>
  )
}
