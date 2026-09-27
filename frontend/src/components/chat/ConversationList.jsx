/**
 * Conversation history rail: search, select, rename, clear and delete.
 * Deleting is confirmed because it removes every message in the thread.
 */
import { useMemo, useState } from 'react'
import { MessageSquarePlus, Pencil, Search, Trash2, Eraser } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../../store'
import { Button, Skeleton } from '../ui/Primitives'
import EmptyState from '../ui/EmptyState'
import ConfirmDialog from '../ui/ConfirmDialog'
import { relativeTime, truncate } from '../../lib/format'

export default function ConversationList() {
  const conversations = useStore((state) => state.conversations)
  const loading = useStore((state) => state.conversationsLoading)
  const currentId = useStore((state) => state.currentConversationId)
  const selectConversation = useStore((state) => state.selectConversation)
  const newConversation = useStore((state) => state.newConversation)
  const renameConversation = useStore((state) => state.renameConversation)
  const deleteConversation = useStore((state) => state.deleteConversation)
  const clearConversation = useStore((state) => state.clearConversation)

  const [filter, setFilter] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [clearing, setClearing] = useState(null)

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return conversations
    return conversations.filter((item) => {
      const title = (item.title || '').toLowerCase()
      const preview = (item.last_message_preview || '').toLowerCase()
      return title.includes(needle) || preview.includes(needle)
    })
  }, [conversations, filter])

  const startRename = (conversation) => {
    setRenaming(conversation.id)
    setRenameValue(conversation.title || '')
  }

  const commitRename = async () => {
    const title = renameValue.trim()
    if (title && renaming) await renameConversation(renaming, title)
    setRenaming(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-line p-3">
        <Button variant="primary" icon={MessageSquarePlus} onClick={newConversation} className="w-full">
          New conversation
        </Button>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          />
          <label htmlFor="conversation-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="conversation-search"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search conversations"
            className="input pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && !conversations.length && (
          <div className="space-y-2 p-1">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        )}

        {!loading && !visible.length && (
          <EmptyState
            compact
            icon={Search}
            title={filter ? 'No conversations match' : 'No conversations yet'}
            description={
              filter
                ? 'Try a different search term.'
                : 'Ask your first question and it will appear here.'
            }
          />
        )}

        <ul className="space-y-1">
          {visible.map((conversation) => {
            const active = conversation.id === currentId
            const title = conversation.title || 'New conversation'
            // The preview is the opening question, which is usually the title
            // itself; only show it when it actually adds something.
            const preview =
              conversation.last_message_preview && conversation.last_message_preview !== title
                ? truncate(conversation.last_message_preview, 60)
                : ''
            return (
              <li key={conversation.id}>
                {renaming === conversation.id ? (
                  <div className="rounded-input border border-accent/50 bg-surface p-2">
                    <label htmlFor={`rename-${conversation.id}`} className="sr-only">
                      Conversation title
                    </label>
                    <input
                      id={`rename-${conversation.id}`}
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename()
                        if (event.key === 'Escape') setRenaming(null)
                      }}
                      className="input"
                    />
                    <div className="mt-1.5 flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" onClick={commitRename}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={clsx(
                      'group flex items-start gap-2 rounded-input p-2 transition-colors',
                      active ? 'bg-accent/12' : 'hover:bg-raised',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-baseline gap-2">
                        <span
                          className={clsx(
                            'min-w-0 flex-1 truncate text-sm font-medium',
                            active ? 'text-accent-ink' : 'text-ink',
                          )}
                        >
                          {title}
                        </span>
                        <span className="shrink-0 text-2xs text-muted/80">
                          {relativeTime(conversation.updated_at || conversation.created_at)}
                        </span>
                      </span>
                      {preview && (
                        <span className="mt-0.5 block truncate text-2xs text-muted">{preview}</span>
                      )}
                    </button>

                    <span className="flex shrink-0 flex-col opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startRename(conversation)}
                        aria-label={`Rename ${conversation.title || 'conversation'}`}
                        className="rounded p-1 text-muted hover:text-ink"
                      >
                        <Pencil aria-hidden="true" className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearing(conversation)}
                        aria-label={`Clear messages in ${conversation.title || 'conversation'}`}
                        className="rounded p-1 text-muted hover:text-ink"
                      >
                        <Eraser aria-hidden="true" className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(conversation)}
                        aria-label={`Delete ${conversation.title || 'conversation'}`}
                        className="rounded p-1 text-muted hover:text-danger"
                      >
                        <Trash2 aria-hidden="true" className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={async () => {
          await deleteConversation(confirming.id)
          setConfirming(null)
        }}
        title="Delete this conversation?"
        description={confirming?.title || 'New conversation'}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={Boolean(clearing)}
        onClose={() => setClearing(null)}
        onConfirm={async () => {
          await clearConversation(clearing.id)
          setClearing(null)
        }}
        title="Clear all messages?"
        description={clearing?.title || 'New conversation'}
        confirmLabel="Clear"
      />
    </div>
  )
}