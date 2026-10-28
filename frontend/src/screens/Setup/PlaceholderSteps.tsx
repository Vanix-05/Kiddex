import { buddyNames } from '../../setup/quizData'
import { PlainBox, SetupStage } from './SetupStage'
import { useSetupState } from './setupState'
import styles from './Placeholder.module.css'

/** /setup/pet: placeholder for now. */
export function PetStep() {
  const { matchedBuddy, avatar } = useSetupState()

  return (
    <SetupStage title="Your buddy" ollieSays="This page is still being written!">
      <PlainBox>
        <p className={styles.comingSoon}>Pet page coming soon</p>
        {/* For testing the earlier steps until this page is built. */}
        {matchedBuddy && (
          <p className={styles.testNote}>
            Quiz match: {buddyNames[matchedBuddy]}
            {avatar && ` · Avatar: ${avatar === 'boy' ? 'Boy' : 'Girl'}`}
          </p>
        )}
      </PlainBox>
    </SetupStage>
  )
}
