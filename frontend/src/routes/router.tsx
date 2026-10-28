import { createBrowserRouter, Navigate } from 'react-router-dom'
import { paths } from './paths'
import { RequireRole } from './RequireRole'
import { LoginScreen } from '../screens/LoginScreen/LoginScreen'
import { WelcomeStep } from '../screens/LoginScreen/steps/WelcomeStep'
import { EducatorLoginStep } from '../screens/LoginScreen/steps/EducatorLoginStep'
import { ClassCodeStep } from '../screens/LoginScreen/steps/ClassCodeStep'
import { WhoAreYouStep } from '../screens/LoginScreen/steps/WhoAreYouStep'
import { PinStep } from '../screens/LoginScreen/steps/PinStep'
import { SetupFrame } from '../screens/Setup/SetupFrame'
import { QuizStep } from '../screens/Setup/QuizStep'
import { RevealStep } from '../screens/Setup/RevealStep'
import { GenderStep } from '../screens/Setup/GenderStep'
import { PetStep } from '../screens/Setup/PetStep'
import { LearnerHomeScreen } from '../screens/LearnerHome/LearnerHomeScreen'
import { ComingSoonScreen } from '../screens/ComingSoonScreen/ComingSoonScreen'

export const router = createBrowserRouter([
  // Login flow: one beach scene, the card on the right changes per step.
  {
    element: <LoginScreen />,
    children: [
      { path: paths.welcome, element: <WelcomeStep /> },
      { path: paths.educator.login, element: <EducatorLoginStep /> },
      { path: paths.learner.code, element: <ClassCodeStep /> },
      { path: paths.learner.who, element: <WhoAreYouStep /> },
      { path: paths.learner.pin, element: <PinStep /> },
    ],
  },
  { path: '/login', element: <Navigate to={paths.welcome} replace /> },
  { path: paths.register, element: <ComingSoonScreen title="Register" /> },

  // Learner screens
  {
    element: <RequireRole role="learner" />,
    children: [
      // First-time setup (no buddy yet): storybook quiz -> gender -> reveal -> pet.
      {
        element: <SetupFrame />,
        children: [
          { path: paths.setup.quiz, element: <QuizStep /> },
          { path: paths.setup.gender, element: <GenderStep /> },
          { path: paths.setup.reveal, element: <RevealStep /> },
          { path: paths.setup.pet, element: <PetStep /> },
        ],
      },
      { path: paths.learner.home, element: <LearnerHomeScreen /> },
    ],
  },

  // Educator screens (to be built)
  {
    element: <RequireRole role="educator" />,
    children: [
      { path: paths.educator.home, element: <ComingSoonScreen title="Educator Home" /> },
    ],
  },

  { path: '*', element: <Navigate to={paths.welcome} replace /> },
])
