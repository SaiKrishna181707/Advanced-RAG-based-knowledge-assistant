/** Application top bar: mobile nav trigger, page title, theme switch. */
import { useLocation } from 'react-router-dom'
import { Menu, Moon, Plus, Sun, SunMoon } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../ui/Primitives'
import { useStore } from '../../store'
import { useThemeStore } from '../../store/theme'

const TITLES = [
  [/^\/app\/?$/, 'Dashboard'],
  [/^\/app\/chat/, 'Chat'],
  [/^\/app\/documents/, 'Documents'],
  [/^\/app\/collections/, 'Collections'],
  [/^\/app\/search/, 'Search'],
  [/^\/app\/analytics/, 'Analytics'],
  [/^\/app\/settings/, 'Settings'],
]

function titleFor(pathname) {
  const match = TITLES.find(([pattern]) => pattern.test(pathname))
  return match ? match[1] : 'ALBATROSS'
}

const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'system' }

export default function Topbar({ onOpenNav }) {
  const { pathname } = useLocation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const newConversation = useStore((state) => state.newConversation)

  useEffect(() => {
    document.title = `${titleFor(pathname)} · ALBATROSS`
  }, [pathname])

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon
  const themeLabel = `Appearance: ${theme}. Switch to ${THEME_CYCLE[theme]}.`

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-input p-2 text-muted transition-colors hover:bg-raised hover:text-ink lg:hidden"
      >
        <Menu aria-hidden="true" className="h-4 w-4" />
      </button>

      <h1 className="flex-1 truncate text-sm font-semibold text-ink">{titleFor(pathname)}</h1>

      {pathname.startsWith('/app/chat') && (
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          onClick={newConversation}
          className="hidden sm:inline-flex"
        >
          New conversation
        </Button>
      )}

      <button
        type="button"
        onClick={() => setTheme(THEME_CYCLE[theme] || 'system')}
        aria-label={themeLabel}
        title={themeLabel}
        className="rounded-input p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <ThemeIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </header>
  )
}