/**
 * Appearance store: light / dark / system.
 *
 * The resolved theme is written to <html class="dark"> so Tailwind's dark variant
 * and the CSS variable tokens swap together. The choice is also persisted locally
 * and, once the user is signed in, saved to their server-side preferences.
 */
import { create } from 'zustand'

const STORAGE_KEY = 'albatross.theme'

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function apply(theme) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

function initial() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* ignore */
  }
  return 'system'
}

export const useThemeStore = create((set, get) => ({
  theme: initial(),
  resolvedDark: false,

  init: () => {
    const { theme } = get()
    apply(theme)
    set({ resolvedDark: document?.documentElement?.classList.contains('dark') ?? false })
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => {
        if (get().theme !== 'system') return
        apply('system')
        set({ resolvedDark: document.documentElement.classList.contains('dark') })
      }
      query.addEventListener?.('change', listener)
    }
  },

  setTheme: (theme) => {
    const next = ['light', 'dark', 'system'].includes(theme) ? theme : 'system'
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    apply(next)
    set({ theme: next, resolvedDark: document?.documentElement?.classList.contains('dark') ?? false })
  },
}))