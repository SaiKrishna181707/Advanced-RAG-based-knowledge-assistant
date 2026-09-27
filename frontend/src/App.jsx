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
const ChatPage = lazy(() => import('./pages/ChatPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
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
              <Route path="chat" element={<ChatPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
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