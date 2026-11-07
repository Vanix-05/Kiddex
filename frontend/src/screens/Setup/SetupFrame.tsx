import { Navigate, Outlet } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { SetupLayout } from '../shared/SetupLayout'

/**
 * Wraps every /setup page: the beach scene with a wide centered area for the
 * storybook and Ollie. Only first-time learners (no buddy yet) get in;
 * anyone with a buddy goes on to the Customize Bridge (this also catches the
 * moment "Choose" saves the buddy, before its own navigation lands).
 */
export function SetupFrame() {
  const { companionId } = useSession()
  if (companionId) return <Navigate to={paths.customize} replace />
  return (
    <SetupLayout wide>
      <Outlet />
    </SetupLayout>
  )
}
