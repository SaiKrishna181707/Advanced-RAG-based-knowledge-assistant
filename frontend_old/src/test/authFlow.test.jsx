/**
 * The authentication flow as a user experiences it: sign in, sign up, sign out,
 * and restoring a session on a cold start.
 *
 * These drive the real pages and the real store; only the API module is replaced,
 * so a regression in the token plumbing shows up here rather than in production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { USER } from './fixtures'
import { renderApp, signOut } from './renderApp'

vi.mock('../api/client', () => import('./apiClientMock'))

const {
  ApiError,
  authAPI,
  meAPI,
  metaAPI,
  getToken,
  getRefreshToken,
  resetApiMocks,
  setSession,
  setToken,
} = await import('./apiClientMock')
const { useAuthStore } = await import('../store/authStore')

const SESSION = {
  token: 'access-token-1',
  refresh_token: 'refresh-token-1',
  user: USER,
}

beforeEach(() => {
  resetApiMocks()
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

describe('sign in', () => {
  it('stores both tokens and lands on the dashboard', async () => {
    const user = userEvent.setup()
    signOut()
    authAPI.login.mockResolvedValue(SESSION)
    renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecret')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
    expect(authAPI.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Sup3rSecret',
    })
    expect(getToken()).toBe('access-token-1')
    expect(getRefreshToken()).toBe('refresh-token-1')
  })

  it('shows the server message and keeps the session empty when credentials fail', async () => {
    const user = userEvent.setup()
    signOut()
    authAPI.login.mockRejectedValue(
      new ApiError('That email and password combination is not correct.', {
        status: 401,
        code: 'unauthenticated',
      }),
    )
    renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass1')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/not correct/i)
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('validates empty fields without calling the API', async () => {
    const user = userEvent.setup()
    signOut()
    renderApp('/login')

    await user.click(await screen.findByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(authAPI.login).not.toHaveBeenCalled()
  })
})

describe('sign up', () => {
  it('creates the account, stores both tokens and lands on the dashboard', async () => {
    const user = userEvent.setup()
    signOut()
    authAPI.signup.mockResolvedValue(SESSION)
    renderApp('/signup')

    await user.type(await screen.findByLabelText('Name'), 'Ada Navigator')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecret')
    await user.type(screen.getByLabelText('Confirm password'), 'Sup3rSecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
    expect(getToken()).toBe('access-token-1')
    expect(getRefreshToken()).toBe('refresh-token-1')
  })
})

describe('sign out', () => {
  it('revokes the refresh token server-side and clears the stored session', async () => {
    const user = userEvent.setup()
    authAPI.logout.mockResolvedValue({ message: 'You have been signed out.' })
    setSession({ token: SESSION.token, refreshToken: SESSION.refresh_token })
    useAuthStore.setState({ user: USER, status: 'authenticated' })
    renderApp('/app')

    // The shell renders the control once in the desktop rail and once inside the
    // (hidden) mobile drawer, so both match - the desktop copy is the one we click.
    const [signOutButton] = await screen.findAllByLabelText('Sign out')
    await user.click(signOutButton)

    // The refresh token is handed back to the API so the session can be revoked.
    await waitFor(() => expect(authAPI.logout).toHaveBeenCalledWith('refresh-token-1'))
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(await screen.findByRole('heading', { name: /sign in to albatross/i })).toBeInTheDocument()
  })

  it('still signs the user out locally when the API call fails', async () => {
    const user = userEvent.setup()
    authAPI.logout.mockRejectedValue(new ApiError('offline', { status: 0 }))
    setSession({ token: SESSION.token, refreshToken: SESSION.refresh_token })
    useAuthStore.setState({ user: USER, status: 'authenticated' })
    renderApp('/app')

    const [signOutButton] = await screen.findAllByLabelText('Sign out')
    await user.click(signOutButton)

    expect(await screen.findByRole('heading', { name: /sign in to albatross/i })).toBeInTheDocument()
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})

describe('session restore', () => {
  it('restores a session from a refresh token alone', async () => {
    setToken(null)
    setSession({ token: null, refreshToken: 'refresh-token-1' })
    authAPI.me.mockResolvedValue({ user: USER })

    await useAuthStore.getState().init()

    expect(authAPI.me).toHaveBeenCalled()
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('clears everything when the stored session is rejected', async () => {
    setSession({ token: 'stale', refreshToken: 'revoked' })
    authAPI.me.mockRejectedValue(new ApiError('expired', { status: 401 }))

    await useAuthStore.getState().init()

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('does not call the API when nothing is stored', async () => {
    await useAuthStore.getState().init()

    expect(authAPI.me).not.toHaveBeenCalled()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})
