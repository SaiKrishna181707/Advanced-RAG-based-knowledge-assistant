import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/theme'

// Resolve appearance and the stored session before the first paint so a
// signed-in user is not briefly shown the landing page.
useThemeStore.getState().init()
useAuthStore.getState().init()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)