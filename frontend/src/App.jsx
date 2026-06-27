/**
 * App.jsx  —  Root component
 *
 * Sets up the layout (Sidebar + main content area) and all routes.
 * React Router decides which Page component to render based on the URL.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import ToastContainer from './components/ui/Toast'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import CollectionsPage from './pages/CollectionsPage'
import SearchPage from './pages/SearchPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import { useStore } from './store'

export default function App() {
  const { loadDocuments, loadConversations } = useStore()

  // Load initial data on startup
  useEffect(() => {
    loadDocuments()
    loadConversations()
  }, [])

  return (
    <BrowserRouter>
      {/* Full-screen flex layout: sidebar left, content right */}
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/"            element={<ChatPage />} />
            <Route path="/documents"   element={<DocumentsPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/search"      element={<SearchPage />} />
            <Route path="/analytics"  element={<AnalyticsPage />} />
            <Route path="/settings"    element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Toast notifications render on top of everything */}
      <ToastContainer />
    </BrowserRouter>
  )
}
