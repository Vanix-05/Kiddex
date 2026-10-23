import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card/Card'
import { OptionGrid } from '../../components/OptionGrid/OptionGrid'
import { companions } from '../../data/companions'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { SetupLayout } from '../shared/SetupLayout'
import { SelectionFooter } from '../shared/SelectionFooter'
import styles from './CompanionSelectScreen.module.css'

/** Learner picks ONE companion (a kid or a pet), then goes to Home. */
export function CompanionSelectScreen() {
  const navigate = useNavigate()
  const { companionId, setCompanion } = useSession()
  const [selected, setSelected] = useState<string | null>(companionId)

  const handleProceed = () => {
    if (!selected) return
    setCompanion(selected)
    navigate(paths.learner.home)
  }

  return (
    <SetupLayout wide>
      <Card
        title="Choose Your Companion"
        subtitle="Pick one friend to join your learning adventure!"
        className={styles.card}
      >
        <OptionGrid
          label="Companions"
          items={companions}
          selectedId={selected}
          onSelect={setSelected}
          columns={5}
          tabletColumns={4}
          className={styles.grid}
        />
        <SelectionFooter
          label="PROCEED"
          hasSelection={selected !== null}
          hint="Tap a companion to continue"
          onContinue={handleProceed}
        />
      </Card>
    </SetupLayout>
  )
}
