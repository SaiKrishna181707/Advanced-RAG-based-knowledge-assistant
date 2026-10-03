/**
 * Authentication store.
 *
 * Holds the signed-in user and drives signup / login / logout. The token itself
 * lives in localStorage (owned by api/client.js) because the frontend and API are on
 * different origins, where an httpOnly cookie would need SameSite=None and add CSRF
 * surface without removing the storage risk. A 401 from any request signs the user
 * out through the UNAUTHORIZED_EVENT listener registered here.
 */
import { create } from 'zustand'
import {
  UNAUTHORIZED_EVENT,
  authAPI,
  clearSession,
  getRefreshToken,
  getToken,
  setSession,
} from '../api/client'

export const useAuthStore = create((set, get) => ({
  user: null,
  // 'unknown' until the stored token has been checked, so protected routes can wait
  // instead of bouncing a signed-in user to the login page on a hard refresh.
  status: 'unknown',
  error: null,
  isSubmitting: false,

  isAuthenticated: () => Boolean(get().user),

  init: async () => {
    // A stored refresh token alone is enough to restore a session: the API client
    // trades it for a fresh access token on the first authenticated request.
    if (!getToken() && !getRefreshToken()) {
      set({ status: 'anonymous', user: null })
      return
    }
    try {
      const data = await authAPI.me()
      set({ user: data.user, status: 'authenticated', error: null })
    } catch {
      clearSession()
      set({ user: null, status: 'anonymous' })
    }
  },

  login: async ({ email, password }) => {
    set({ isSubmitting: true, error: null })
    try {
      const data = await authAPI.login({ email, password })
      setSession({ token: data.token, refreshToken: data.refresh_token })
      set({ user: data.user, status: 'authenticated', isSubmitting: false })
      return data.user
    } catch (error) {
      set({ error: error.message, isSubmitting: false })
      throw error
    }
  },

  signup: async ({ name, email, password }) => {
    set({ isSubmitting: true, error: null })
    try {
      const data = await authAPI.signup({ name, email, password })
      setSession({ token: data.token, refreshToken: data.refresh_token })
      set({ user: data.user, status: 'authenticated', isSubmitting: false })
      return data.user
    } catch (error) {
      set({ error: error.message, isSubmitting: false })
      throw error
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken()
    // Best effort: revoking server-side stops the refresh token being reused. A
    // network failure must never leave the user stuck signed in locally.
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken)
      } catch {
        /* ignore */
      }
    }
    clearSession()
    set({ user: null, status: 'anonymous', error: null })
  },

  refresh: async () => {
    try {
      const data = await authAPI.me()
      set({ user: data.user })
      return data.user
    } catch {
      return null
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener(UNAUTHORIZED_EVENT, () => {
    clearSession()
    useAuthStore.setState({ user: null, status: 'anonymous', error: null })
  })
}
