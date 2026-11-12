import { createBrowserRouter, Navigate } from 'react-router-dom'
import { paths } from './paths'
import { RequireRole } from './RequireRole'
import { LoginScreen } from '../screens/LoginScreen/LoginScreen'
import { WelcomeStep } from '../screens/LoginScreen/steps/WelcomeStep'
import { TeacherLoginStep } from '../screens/LoginScreen/steps/TeacherLoginStep'
import { SetupFrame } from '../screens/Setup/SetupFrame'
import { QuizStep } from '../screens/Setup/QuizStep'
import { RevealStep } from '../screens/Setup/RevealStep'
import { GenderStep } from '../screens/Setup/GenderStep'
import { PetStep } from '../screens/Setup/PetStep'
import { CustomizeScreen } from '../screens/Customize/CustomizeScreen'
import { LazyDevLobbyScreen, LazyLobbyScreen } from '../screens/Lobby/LazyLobby'
import { TeacherPlanner } from '../teacher/planner/TeacherPlanner'
import { LazyPlayScreen } from '../games/LazyPlay'

export const router = createBrowserRouter([
  // Login: one beach scene, the card on the right changes per step. The
  // Student popup and notebook pages open over the Welcome card (same URL).
  // Open to everyone (no login needed).
  {
    element: <LoginScreen />,
    children: [
      { path: paths.welcome, element: <WelcomeStep /> },
      { path: paths.teacher.login, element: <TeacherLoginStep /> },
    ],
  },

  // Old links: keep them working.
  { path: '/login', element: <Navigate to={paths.welcome} replace /> },
  { path: '/learner/*', element: <Navigate to={paths.welcome} replace /> },
  { path: '/educator/login', element: <Navigate to={paths.teacher.login} replace /> },
  { path: '/educator', element: <Navigate to={paths.teacher.home} replace /> },

  // Student screens
  {
    element: <RequireRole role="student" />,
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
      // After setup (outside SetupFrame, which sends anyone with a buddy away).
      { path: paths.customize, element: <CustomizeScreen /> },
      // Its own download, with Pixi (screens/Lobby/preloadLobby.ts).
      { path: paths.lobby, element: <LazyLobbyScreen /> },
      // Mini games (Quiz Show, Match Up): their own download too.
      { path: `${paths.play}/:gameId`, element: <LazyPlayScreen /> },
    ],
  },

  // Teacher Dashboard: one planner. It draws the pages itself (so it can flip
  // between them); these child routes only list the URLs it knows.
  {
    element: <RequireRole role="teacher" />,
    children: [
      {
        path: paths.teacher.home,
        element: <TeacherPlanner />,
        children: [
          { index: true, element: null },
          { path: 'lessons', element: null },
          { path: 'lessons/:id/making', element: null },
          { path: 'lessons/:id/check', element: null },
          { path: 'lessons/:id/games', element: null },
          { path: 'students', element: null },
          { path: 'progress', element: null },
          { path: 'lobby', element: null },
        ],
      },
    ],
  },

  // Dev only: every traced companion, to check the rig (not in production builds).
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev/companions',
          lazy: () =>
            import('../screens/DevCompanions/DevCompanionsScreen').then((m) => ({ Component: m.DevCompanionsScreen })),
        },
        // Every buddy color and kid skin at once, to check they all look cute.
        {
          path: '/dev/looks',
          lazy: () => import('../screens/DevLooks/DevLooksScreen').then((m) => ({ Component: m.DevLooksScreen })),
        },
        // The Go to Lobby cutscene with a sample Student: ?p=a|b, ?t=7.5 holds one moment.
        {
          path: '/dev/cutscene',
          lazy: () => import('../screens/DevCutscene/DevCutsceneScreen').then((m) => ({ Component: m.DevCutsceneScreen })),
        },
        // The Main Lobby with a sample Student, no login needed: ?p=a|b, &fps shows the frame rate.
        { path: '/dev/lobby', element: <LazyDevLobbyScreen /> },
        // Every mini game and state with a sample Student: links at /dev/games.
        {
          path: '/dev/games',
          lazy: () => import('../games/dev/DevGamesScreen').then((m) => ({ Component: m.DevGamesScreen })),
        },
        {
          path: '/dev/play/:gameId',
          lazy: () => import('../games/dev/DevGamesScreen').then((m) => ({ Component: m.DevPlayScreen })),
        },
      ]
    : []),

  { path: '*', element: <Navigate to={paths.welcome} replace /> },
])
