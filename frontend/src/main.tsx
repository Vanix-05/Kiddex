import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme } from './theme/theme'
import './index.css'
import App from './App.tsx'
// Catches Chrome's install prompt early, for the Welcome screen's "Play like an app" chip.
import './components/InstallHint/installApp'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
