import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession, type Role } from '../session/session'
import { paths } from './paths'

/** Only lets logged-in users with the given role through; others go to login. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useSession()
  const location = useLocation()

  if (!user) return <Navigate to={paths.welcome} replace state={{ from: location }} />
  if (user.role !== role) return <Navigate to={paths[user.role].home} replace />
  return <Outlet />
}
