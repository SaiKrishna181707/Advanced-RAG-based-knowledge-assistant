/**
 * Route table.
 *
 *   /                 public landing page (signed-in visitors go straight to /app)
 *   /login /signup    authentication (signed-in visitors bounce to /app)
 *   /app/*            protected application shell
 *
 * Every page is loaded lazily so a landing-page visitor only downloads the
 * marketing bundle, and a signed-in user does not download the landing page.
 */
import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ToastContainer from './components/ui/Toast'
import PageFallback from './components/ui/PageFallback'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { useAuthStore } from './store/authStore'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CareerProfilePage = lazy(() => import('./pages/CareerProfilePage'))
const ResumesPage = lazy(() => import('./pages/ResumesPage'))
const ResumeReviewPage = lazy(() => import('./pages/ResumeReviewPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

/**
 * The landing page is public, so it does not wait for the session check. Once the
 * session resolves to authenticated, the visitor is moved to the dashboard.
 */
function LandingGate() {
  const status = useAuthStore((state) => state.status)
  if (status === 'authenticated') return <Navigate to="/app" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingGate />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<CareerProfilePage />} />
              <Route path="resumes" element={<ResumesPage />} />
              <Route path="resumes/:id/review" element={<ResumeReviewPage />} />
              <Route path="jobs" element={<PlaceholderPage title="Job Match" />} />
              <Route path="applications" element={<PlaceholderPage title="Applications" />} />
              <Route path="interview" element={<PlaceholderPage title="Interview Prep" />} />
              <Route path="projects" element={<PlaceholderPage title="Projects" />} />
              <Route path="learning" element={<PlaceholderPage title="Learning" />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <ToastContainer />
    </BrowserRouter>
  )
}