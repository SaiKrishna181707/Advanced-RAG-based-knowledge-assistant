/** Render the real app router at a given URL.

 * App owns its BrowserRouter, so the URL is set through history rather than by
 * wrapping in MemoryRouter - the point is to exercise the real routing setup.
 */
import { render } from '@testing-library/react'
import App from '../App'
import { useAuthStore } from '../store/authStore'

export function renderApp(route = '/') {
  window.history.pushState({}, '', route)
  return render(<App />)
}

/** Put the auth store into a known state without touching the network. */
export function signIn(user, { status = 'authenticated' } = {}) {
  useAuthStore.setState({ user, status, error: null, isSubmitting: false })
}

export function signOut() {
  useAuthStore.setState({ user: null, status: 'anonymous', error: null })
}
