import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession, type Role } from '../session/session'
import { paths } from './paths'

/**
 * Only lets logged-in users with the given role through. Logged-out users go
 * to the Welcome card. Someone with the other role goes to their own start:
 * a Teacher to the planner, a Student to the Lobby (or to the first-time
 * setup if they have no buddy yet).
 *
 * `afterSetup`: Student pages that need a buddy (Customize Bridge, Lobby,
 * games). A Student with no buddy yet (e.g. made a PIN code, then closed the
 * tab before picking one) is sent to the setup storybook instead.
 */
export function RequireRole({ role, afterSetup = false }: { role: Role; afterSetup?: boolean }) {
  const { user, companionId } = useSession()
  const location = useLocation()

  if (!user) return <Navigate to={paths.welcome} replace state={{ from: location }} />
  if (user.role !== role) {
    const home = user.role === 'teacher' ? paths.teacher.home : companionId ? paths.lobby : paths.setup.quiz
    return <Navigate to={home} replace />
  }
  if (afterSetup && role === 'student' && !companionId) return <Navigate to={paths.setup.quiz} replace />
  return <Outlet />
}
