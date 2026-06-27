/**
 * components/layout/Sidebar.jsx
 *
 * Left sidebar with navigation icons + conversation history.
 * Collapsible — clicking the toggle hides the labels.
 */

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, FileText, FolderOpen, Search,
  BarChart2, Settings, Plus, Trash2, ChevronLeft,
  ChevronRight, Brain
} from 'lucide-react'
import { useStore } from '../../store'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/',            icon: MessageSquare, label: 'Chat' },
  { to: '/documents',   icon: FileText,      label: 'Documents' },
  { to: '/collections', icon: FolderOpen,    label: 'Collections' },
  { to: '/search',      icon: Search,        label: 'Search' },
  { to: '/analytics',   icon: BarChart2,     label: 'Analytics' },
  { to: '/settings',    icon: Settings,      label: 'Settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const { conversations, currentConversationId, selectConversation,
          newConversation, deleteConversation } = useStore()

  const handleNewChat = () => {
    newConversation()
    navigate('/')
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-bg-secondary border-r border-bg-border transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ─── Logo ─── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-bg-border">
        <div className="w-8 h-8 rounded-lg bg-accent-purpleDim flex items-center justify-center flex-shrink-0">
          <Brain size={18} className="text-accent-purpleLight" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-text-primary truncate">
            RAG Assistant
          </span>
        )}
      </div>

      {/* ─── New Chat button ─── */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          className={clsx(
            'flex items-center gap-2 w-full rounded-input px-3 py-2.5 text-sm',
            'bg-accent-purpleDim text-accent-purpleLight hover:bg-accent-purple hover:text-white',
            'transition-colors duration-200',
            collapsed && 'justify-center px-0'
          )}
        >
          <Plus size={16} />
          {!collapsed && 'New chat'}
        </button>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="px-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-input text-sm transition-colors duration-150',
              isActive
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
              collapsed && 'justify-center px-0'
            )}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* ─── Conversation history ─── */}
      {!collapsed && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto mt-4 px-3 min-h-0">
          <p className="text-xs text-text-muted uppercase tracking-wider px-2 mb-2">
            Recent chats
          </p>
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { selectConversation(conv.id); navigate('/') }}
                className={clsx(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )}
              >
                <MessageSquare size={13} className="flex-shrink-0 opacity-50" />
                <span className="flex-1 truncate text-xs">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Footer: Built by ─── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-bg-border">
          <p className="text-xs text-text-muted">Built by Sai Krishna</p>
        </div>
      )}

      {/* ─── Collapse toggle ─── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                   bg-bg-card border border-bg-border flex items-center justify-center
                   text-text-muted hover:text-text-primary transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
