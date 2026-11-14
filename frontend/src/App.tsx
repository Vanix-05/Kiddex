import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from './session/SessionProvider'
import { router } from './routes/router'
import { MagicFallHost } from './screens/MagicFall/MagicFallHost'

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
      {/* The magic fall, over the change from the setup storybook to the Customize Bridge. */}
      <MagicFallHost />
    </SessionProvider>
  )
}

export default App
