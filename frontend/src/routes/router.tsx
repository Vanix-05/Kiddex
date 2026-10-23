import { createBrowserRouter, Navigate } from 'react-router-dom'
import { paths } from './paths'
import { RequireRole } from './RequireRole'
import { LoginScreen } from '../screens/LoginScreen/LoginScreen'
import { CompanionSelectScreen } from '../screens/CompanionSelectScreen/CompanionSelectScreen'
import { ComingSoonScreen } from '../screens/ComingSoonScreen/ComingSoonScreen'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={paths.login} replace /> },
  { path: paths.login, element: <LoginScreen /> },
  { path: paths.register, element: <ComingSoonScreen title="Register" /> },

  // Learner screens
  {
    element: <RequireRole role="learner" />,
    children: [
      { path: paths.learner.chooseCompanion, element: <CompanionSelectScreen /> },
      { path: paths.learner.home, element: <ComingSoonScreen title="Learner Home" /> },
    ],
  },

  // Educator screens (to be built)
  {
    element: <RequireRole role="educator" />,
    children: [
      { path: paths.educator.home, element: <ComingSoonScreen title="Educator Home" /> },
    ],
  },

  { path: '*', element: <Navigate to={paths.login} replace /> },
])
