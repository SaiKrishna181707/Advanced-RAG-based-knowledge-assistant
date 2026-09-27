/**
 * Routing and route protection.
 *
 * The important guarantees: an anonymous visitor can never reach the application
 * shell, a signed-in visitor is never shown the login screen, and a hard refresh
 * waits for the stored token to be checked instead of bouncing the user out.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { USER } from './fixtures'
import { renderApp, signIn, signOut } from './renderApp'

vi.mock('../api/client', () => import('./apiClientMock'))

const { metaAPI, meAPI } = await import('./apiClientMock')

beforeEach(() => {
  metaAPI.plans.mockResolvedValue({ plans: [], billing: null })
  meAPI.overview.mockResolvedValue({
    user: USER,
    counts: { documents: 0, questions: 0, collections: 0, conversations: 0 },
    usage: null,
    recent_documents: [],
    recent_conversations: [],
    activity: [],
  })
})

describe('anonymous visitors', () => {
  it('sees the landing page at the root', async () => {
    signOut()
    renderApp('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: /everything above the fold/i }),
    ).toBeInTheDocument()
  })

  it('is redirected from the dashboard to the login screen', async () => {
    signOut()
    renderApp('/app')

    expect(await screen.findByRole('heading', { name: /sign in to albatross/i })).toBeInTheDocument()
  })

  it('is redirected from every application route, not just the dashboard', async () => {
    signOut()
    for (const route of ['/app/chat', '/app/documents', '/app/analytics', '/app/settings']) {
      const { unmount } = renderApp(route)
      expect(await screen.findByRole('heading', { name: /sign in to albatross/i })).toBeInTheDocument()
      unmount()
    }
  })

  it('never renders another user\'s data because the shell is not mounted at all', async () => {
    signOut()
    renderApp('/app/documents')

    // The document workspace must not exist behind the redirect.
    expect(await screen.findByRole('heading', { name: /sign in to albatross/i })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})

describe('signed-in users', () => {
  it('reaches the dashboard at /app', async () => {
    signIn(USER)
    renderApp('/app')

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
  })

  it('is bounced away from the login and signup screens', async () => {
    signIn(USER)
    for (const route of ['/login', '/signup']) {
      const { unmount } = renderApp(route)
      expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /sign in to albatross/i })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('sees the application navigation', async () => {
    signIn(USER)
    renderApp('/app')

    const nav = await screen.findByRole('navigation')
    for (const label of ['Documents', 'Chat', 'Search', 'Analytics', 'Settings']) {
      expect(nav.textContent).toContain(label)
    }
  })
})

describe('session resolution', () => {
  it('waits instead of redirecting while the stored token is being checked', async () => {
    // A hard refresh lands here: status is unknown until /auth/me answers.
    const { useAuthStore } = await import('../store/authStore')
    useAuthStore.setState({ user: null, status: 'unknown' })
    meAPI.overview.mockResolvedValue({ user: USER, counts: {}, usage: null })

    renderApp('/app')

    // Spinner exposes its label through aria-label, so query it by role.
    expect(
      await screen.findByRole('status', { name: /checking your session/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /sign in to albatross/i })).not.toBeInTheDocument()
  })
})

describe('unknown routes', () => {
  it('shows the not-found page rather than a blank screen', async () => {
    signOut()
    renderApp('/definitely-not-a-route')

    expect(await screen.findByText(/that page does not exist/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })
})
