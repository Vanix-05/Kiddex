import { createBrowserRouter, Navigate } from 'react-router-dom'
import { paths } from './paths'
import { RequireRole } from './RequireRole'
import { LoginScreen } from '../screens/LoginScreen/LoginScreen'
import { WelcomeStep } from '../screens/LoginScreen/steps/WelcomeStep'
import { TeacherLoginStep } from '../screens/LoginScreen/steps/TeacherLoginStep'
import { SetupFrame } from '../screens/Setup/SetupFrame'
import { SetupBook } from '../screens/Setup/SetupBook'
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
      // First-time setup (no buddy yet): one storybook, Boy or Girl -> quiz ->
      // "your perfect buddy is..." -> Pick your buddy, all at /setup.
      {
        element: <SetupFrame />,
        children: [
          { path: paths.setup.quiz, element: <SetupBook /> },
          // The old separate pages: the storybook starts at /setup.
          { path: paths.setup.gender, element: <Navigate to={paths.setup.quiz} replace /> },
          { path: paths.setup.reveal, element: <Navigate to={paths.setup.quiz} replace /> },
          { path: paths.setup.pet, element: <Navigate to={paths.setup.quiz} replace /> },
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
        // The bedroom intro clip into the setup storybook, on a loop: ?t=8 holds one moment.
        {
          path: '/dev/intro',
          lazy: () => import('../screens/DevIntro/DevIntroScreen').then((m) => ({ Component: m.DevIntroScreen })),
        },
        // "The buddy pulls you in" and the magic fall, on a loop: ?buddy=fox, ?t=4, ?video=0, ?part=fall.
        {
          path: '/dev/pullin',
          lazy: () => import('../screens/DevPullIn/DevPullInScreen').then((m) => ({ Component: m.DevPullInScreen })),
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
