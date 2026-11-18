import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from './session/SessionProvider'
import { router } from './routes/router'
import { MagicFallHost } from './screens/MagicFall/MagicFallHost'
import { TurnSideways } from './components/TurnSideways/TurnSideways'

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
      {/* The magic fall, over the change from the setup storybook to the Customize Bridge. */}
      <MagicFallHost />
      {/* Touch screens held upright: ask the kid to turn sideways (over every screen). */}
      <TurnSideways />
    </SessionProvider>
  )
}

export default App
