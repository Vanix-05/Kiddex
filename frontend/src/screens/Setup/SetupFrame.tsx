import { Navigate, Outlet } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { SetupLayout } from '../shared/SetupLayout'

/**
 * Wraps every /setup page: the beach scene with a wide centered area for the
 * storybook and Ollie. Only first-time learners (no buddy yet) get in.
 */
export function SetupFrame() {
  const { companionId } = useSession()
  if (companionId) return <Navigate to={paths.learner.home} replace />
  return (
    <SetupLayout wide>
      <Outlet />
    </SetupLayout>
  )
}
