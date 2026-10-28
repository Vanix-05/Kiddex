import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card/Card'
import { Button } from '../../components/Button/Button'
import { Companion } from '../../companions/Companion'
import { isCompanionId } from '../../companions/registry'
import { OtterRig } from '../../companions/otter/OtterRig'
import { companions } from '../../data/companions'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { SetupLayout } from '../shared/SetupLayout'
import styles from './ComingSoonScreen.module.css'

/** Placeholder for screens that aren't built yet (Register, Home, ...). */
export function ComingSoonScreen({ title, subtitle = 'This screen is coming soon!' }: { title: string; subtitle?: string }) {
  const navigate = useNavigate()
  const { user, companionId, logOut } = useSession()
  const companion = companions.find((c) => c.id === companionId)

  const handleBack = () => {
    if (user) logOut()
    navigate(paths.welcome)
  }

  // Companions in the new companion system (src/companions/registry.ts) are
  // animated with <Companion>; the otter keeps its rig; the rest are still PNGs.
  const animatedId = isCompanionId(companion?.id) ? companion.id : null

  return (
    <SetupLayout>
      <Card title={title} subtitle={subtitle}>
        {animatedId && <Companion id={animatedId} className={styles.animated} />}
        {companion?.id === 'otter' && <OtterRig label={companion.name} className={styles.animated} />}
        {companion && !animatedId && companion.id !== 'otter' && (
          <img src={companion.image} alt={`Your companion: ${companion.name}`} className={styles.companion} />
        )}
        <Button withArrow onClick={handleBack}>
          {user ? 'Log Out' : 'Back to Log In'}
        </Button>
      </Card>
    </SetupLayout>
  )
}
