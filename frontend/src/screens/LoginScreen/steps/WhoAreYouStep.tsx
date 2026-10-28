import { Navigate, useNavigate } from 'react-router-dom'
import { buddyImage, findClass } from '../../../mock/learners'
import { paths } from '../../../routes/paths'
import { useSession } from '../../../session/session'
import { LoginCard } from '../LoginCard'
import { BackLink } from './shared'
import { Egg } from './Egg'
import styles from './steps.module.css'

/** Step 4 (/learner/who): tap your own tile. */
export function WhoAreYouStep() {
  const navigate = useNavigate()
  const { classCode, learnerId, pickLearner } = useSession()
  const cls = findClass(classCode)

  // No class code yet (e.g. opened this page directly): ask for it first.
  if (!cls) return <Navigate to={paths.learner.code} replace />

  const handlePick = (id: string) => {
    pickLearner(id)
    navigate(paths.learner.pin)
  }

  return (
    <LoginCard title="Who are you?" subtitle={cls.name}>
      <ul className={styles.tiles} aria-label="Learners in this class">
        {cls.learners.map((learner) => {
          const image = buddyImage(learner)
          const picked = learner.id === learnerId
          return (
            <li key={learner.id}>
              <button
                type="button"
                className={[styles.tile, styles[learner.tint], picked && styles.picked].filter(Boolean).join(' ')}
                onClick={() => handlePick(learner.id)}
              >
                {image ? (
                  <img src={image} alt="" className={styles.tileImage} draggable={false} />
                ) : (
                  <Egg className={styles.tileEgg} />
                )}
                <span className={styles.tileLabel}>{learner.handle}</span>
                {/* No buddy yet: a "NEW!" badge on the corner. */}
                {!image && <span className={styles.newBadge}>NEW!</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <BackLink to={paths.learner.code}>Change class code</BackLink>
    </LoginCard>
  )
}
