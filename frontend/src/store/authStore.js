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
import { UNAUTHORIZED_EVENT, authAPI, getToken, setToken } from '../api/client'

export const useAuthStore = create((set, get) => ({
  user: null,
  // 'unknown' until the stored token has been checked, so protected routes can wait
  // instead of bouncing a signed-in user to the login page on a hard refresh.
  status: 'unknown',
  error: null,
  isSubmitting: false,

  isAuthenticated: () => Boolean(get().user),

  init: async () => {
    if (!getToken()) {
      set({ status: 'anonymous', user: null })
      return
    }
    try {
      const data = await authAPI.me()
      set({ user: data.user, status: 'authenticated', error: null })
    } catch {
      setToken(null)
      set({ user: null, status: 'anonymous' })
    }
  },

  login: async ({ email, password }) => {
    set({ isSubmitting: true, error: null })
    try {
      const data = await authAPI.login({ email, password })
      setToken(data.token)
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
      setToken(data.token)
      set({ user: data.user, status: 'authenticated', isSubmitting: false })
      return data.user
    } catch (error) {
      set({ error: error.message, isSubmitting: false })
      throw error
    }
  },

  logout: () => {
    setToken(null)
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
    useAuthStore.setState({ user: null, status: 'anonymous', error: null })
  })
}