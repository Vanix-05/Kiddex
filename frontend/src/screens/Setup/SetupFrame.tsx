import { Navigate, Outlet } from 'react-router-dom'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { pullInGate } from './pullIn/pullInGate'

/**
 * Wraps every /setup page (the storybook draws its own desk and book). Only
 * first-time students (no buddy yet) get in; anyone with a buddy goes on to
 * the Customize Bridge (this also catches the moment "Choose" saves the
 * buddy, before its own navigation lands). The one
 * exception: while "the buddy pulls you in" and the magic fall play (right
 * after Choose), the storybook stays (see pullInGate.ts).
 */
export function SetupFrame() {
  const { companionId } = useSession()
  if (companionId && !pullInGate.isPlaying()) return <Navigate to={paths.customize} replace />
  return <Outlet />
}
