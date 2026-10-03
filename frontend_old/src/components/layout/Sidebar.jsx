/**
 * Primary navigation.
 *
 * One navigation list is rendered twice: statically in the desktop rail, and
 * inside a focus-managed drawer on small screens.
 */
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings as SettingsIcon,
  FileText,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import Brand from './Brand'
import { Badge, UsageMeter } from '../ui/Primitives'
import { useStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { initials } from '../../lib/format'

const PRIMARY_NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/profile', label: 'Career Profile', icon: FolderOpen },
  { to: '/app/resumes', label: 'Resumes', icon: FileText },
  { to: '/app/jobs', label: 'Job Match', icon: Search },
  { to: '/app/applications', label: 'Applications', icon: BarChart3 },
  { to: '/app/interview', label: 'Interview Prep', icon: MessageSquare },
]

const SECONDARY_NAV = [
  { to: '/app/projects', label: 'Projects', icon: FolderOpen },
  { to: '/app/learning', label: 'Learning', icon: FolderOpen },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
]

function NavList({ onNavigate }) {
  const renderLinks = (links) => (
    <nav className="flex flex-col gap-0.5">
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2.5 rounded-input px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent/12 text-accent-ink' : 'text-muted hover:bg-raised hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon aria-hidden="true" className="h-4 w-4" />
              <span>{item.label}</span>
              {isActive && <span className="sr-only">(current)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted mb-2">Platform</div>
        {renderLinks(PRIMARY_NAV)}
      </div>
      <div>
        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted mb-2">Resources</div>
        {renderLinks(SECONDARY_NAV)}
      </div>
    </div>
  )
}

function UsagePanel() {
  const usage = useStore((state) => state.usage)
  const loadUsage = useStore((state) => state.loadUsage)
  const status = useAuthStore((state) => state.status)

  useEffect(() => {
    if (status === 'authenticated' && !usage) loadUsage()
  }, [status, usage, loadUsage])

  if (!usage) return null

  return (
    <div className="space-y-3 rounded-card border border-line bg-canvas/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-wide text-muted">Usage</span>
        <Badge tone={usage.plan === 'free' ? 'neutral' : 'accent'}>{usage.plan_name}</Badge>
      </div>
      <UsageMeter
        label="Documents"
        percent={usage.documents.percent}
        detail={usage.documents.label}
      />
      <UsageMeter
        label="Questions"
        percent={usage.questions.percent}
        detail={usage.questions.label}
      />
      <UsageMeter
        label="Storage"
        percent={usage.storage.percent}
        detail={usage.storage.label}
      />
    </div>
  )
}

function UserBlock({ onNavigate }) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  if (!user) return null

  return (
    <div className="flex items-center gap-2.5 rounded-card border border-line p-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-ink"
        aria-hidden="true"
      >
        {initials(user.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
        <span className="block truncate text-2xs text-muted">{user.email}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          logout()
        }}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-input p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  )
}

function SidebarBody({ onNavigate }) {
  return (
    <>
      <div className="px-1 py-1">
        <Brand size="md" />
      </div>
      <div className="mt-5 flex-1 space-y-5 overflow-y-auto">
        <NavList onNavigate={onNavigate} />
        <UsagePanel />
      </div>
      <div className="pt-4">
        <UserBlock onNavigate={onNavigate} />
      </div>
    </>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface p-3 lg:flex">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-40 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={clsx(
            'absolute inset-0 bg-black/45 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={clsx(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface p-3',
            'transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute right-2 top-3 rounded-input p-1.5 text-muted hover:bg-raised hover:text-ink"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
          <SidebarBody onNavigate={onClose} />
        </div>
      </div>
    </>
  )
}