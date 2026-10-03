/**
 * Route guards for the two halves of the app.
 *
 * `status === 'unknown'` means the stored token has not been verified yet, so we
 * wait rather than bouncing a signed-in user to /login on a hard refresh.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Spinner } from './ui/Primitives'

function SessionCheck() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Spinner className="h-5 w-5" label="Checking your session" />
    </div>
  )
}

/** Blocks unauthenticated visitors from the application shell. */
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'unknown') return <SessionCheck />
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Keeps signed-in users away from the login and signup screens. */
export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status)

  if (status === 'unknown') return <SessionCheck />
  if (status === 'authenticated') return <Navigate to="/app" replace />
  return <Outlet />
}